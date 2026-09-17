package server

import (
	"bytes"
	"crypto/rand"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	"io"
	"log/slog"
	"net/http"
	"net/mail"
	"net/url"
	"os"
	"path/filepath"
	"riverlife/api/internal/service"
	"strings"
	"time"
)

type Server struct {
	Service            *service.Service
	Redis              *redis.Client
	UploadDir          string
	AdminPassword      string
	CookieSecure       bool
	Demo               bool
	WebOrigin          string
	GoogleClientID     string
	GoogleClientSecret string
}

func token(c *gin.Context) string { return strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ") }

const adminCookie = "riverlife_admin"
const userCookie = "riverlife_user"

type otpChallenge struct {
	CodeHash     string `json:"code_hash"`
	Name         string `json:"name"`
	PasswordHash string `json:"password_hash"`
}

func otpCode() (string, error) {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	n := uint32(b[0])<<24 | uint32(b[1])<<16 | uint32(b[2])<<8 | uint32(b[3])
	return fmt.Sprintf("%06d", n%1000000), nil
}

func (s *Server) userID(c *gin.Context) (string, bool) {
	t, err := c.Cookie(userCookie)
	if err != nil || t == "" {
		return "", false
	}
	v, err := s.Redis.Get(c.Request.Context(), "riverlife:user-session:"+service.Hash(t)).Result()
	return v, err == nil && v != ""
}
func (s *Server) setUserSession(c *gin.Context, userID string) error {
	t := service.Token()
	if err := s.Redis.Set(c.Request.Context(), "riverlife:user-session:"+service.Hash(t), userID, 7*24*time.Hour).Err(); err != nil {
		return err
	}
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(userCookie, t, int((7 * 24 * time.Hour).Seconds()), "/api/v1", "", s.CookieSecure, true)
	return nil
}
func validEmail(value string) (string, bool) {
	v := strings.ToLower(strings.TrimSpace(value))
	a, err := mail.ParseAddress(v)
	return v, err == nil && a.Address == v
}
func (s *Server) googleCallbackURL() string {
	return strings.TrimRight(s.WebOrigin, "/") + "/api/v1/auth/google/callback"
}

func adminToken(c *gin.Context) string {
	if header := token(c); header != "" {
		return header
	}
	cookie, _ := c.Cookie(adminCookie)
	return cookie
}
func fail(c *gin.Context, err error) {
	code := 500
	msg := "ระบบไม่พร้อม กรุณาลองใหม่"
	if errors.Is(err, pgx.ErrNoRows) {
		code = 404
		msg = "ไม่พบรายการ"
	}
	if errors.Is(err, service.ErrConflict) {
		code = 409
		msg = err.Error()
	}
	if errors.Is(err, service.ErrMemberAlreadyExists) {
		code = 409
		msg = err.Error()
	}
	if code == 500 {
		slog.Error("request failed", "error", err)
	}
	c.AbortWithStatusJSON(code, gin.H{"error": msg})
}
func bad(c *gin.Context) {
	c.AbortWithStatusJSON(400, gin.H{"error": "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง"})
}

var limitScript = redis.NewScript(`local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],60) end;return n`)

func (s *Server) limiter(limit int) gin.HandlerFunc {
	return func(c *gin.Context) {
		n, err := limitScript.Run(c.Request.Context(), s.Redis, []string{"riverlife:rate:" + c.FullPath() + ":" + service.Hash(c.ClientIP())}).Int()
		if err != nil {
			c.AbortWithStatusJSON(503, gin.H{"error": "ระบบจำกัดการใช้งานไม่พร้อม กรุณาลองใหม่"})
			return
		}
		if n > limit {
			c.Header("Retry-After", "60")
			c.AbortWithStatusJSON(429, gin.H{"error": "ทำรายการถี่เกินไป กรุณารอ 1 นาที"})
			return
		}
		c.Next()
	}
}
func (s *Server) admin(c *gin.Context) {
	v, err := s.Redis.Get(c.Request.Context(), "riverlife:session:"+service.Hash(adminToken(c))).Result()
	if err != nil || v != "admin" {
		c.AbortWithStatusJSON(401, gin.H{"error": "กรุณาเข้าสู่ระบบเจ้าหน้าที่"})
		return
	}
	c.Next()
}
func (s *Server) requireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := s.userID(c)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "กรุณาเข้าสู่ระบบ"})
			return
		}
		user, err := s.Service.User(c.Request.Context(), id)
		if err != nil {
			fail(c, err)
			return
		}
		if user.Role != role {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ"})
			return
		}
		c.Next()
	}
}
func (s *Server) Router() *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	_ = r.SetTrustedProxies(nil)
	r.Use(func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("Cache-Control", "no-store")
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 6<<20)
		c.Next()
	})
	api := r.Group("/api/v1")
	api.GET("/health", func(c *gin.Context) {
		if err := s.Service.DB.Ping(c.Request.Context()); err != nil {
			fail(c, err)
			return
		}
		if err := s.Redis.Ping(c.Request.Context()).Err(); err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, gin.H{"status": "ok"})
	})
	api.GET("/event", func(c *gin.Context) {
		zs, err := s.Service.Zones(c.Request.Context())
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, gin.H{"title": "Concert on the River", "demo": s.Demo, "date": nil, "boarding": "18:45", "departure": "19:00", "pier": "ICONSIAM", "duration_minutes": 120, "zones": zs})
	})
	api.POST("/bookings", s.limiter(30), func(c *gin.Context) {
		var in service.Input
		if c.ShouldBindJSON(&in) != nil || len(c.GetHeader("Idempotency-Key")) < 16 || len(c.GetHeader("Idempotency-Key")) > 100 || len(token(c)) != 64 {
			bad(c)
			return
		}
		b, err := s.Service.Create(c.Request.Context(), in, c.GetHeader("Idempotency-Key"), token(c))
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(201, b)
	})
	api.GET("/bookings/:id", s.limiter(120), func(c *gin.Context) {
		b, err := s.Service.Get(c.Request.Context(), c.Param("id"), token(c), false)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, b)
	})
	api.POST("/bookings/:id/attachment", s.limiter(10), func(c *gin.Context) {
		file, err := c.FormFile("attachment")
		if err != nil || file.Size < 1 || file.Size > 5<<20 {
			bad(c)
			return
		}
		ext := strings.ToLower(filepath.Ext(file.Filename))
		if ext != ".png" && ext != ".jpg" && ext != ".jpeg" {
			bad(c)
			return
		}
		input, err := file.Open()
		if err != nil {
			fail(c, err)
			return
		}
		defer input.Close()
		path := filepath.Join(s.UploadDir, service.Token()+ext)
		output, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
		if err != nil {
			fail(c, err)
			return
		}
		_, copyErr := io.Copy(output, input)
		closeErr := output.Close()
		if copyErr != nil || closeErr != nil {
			_ = os.Remove(path)
			fail(c, errors.Join(copyErr, closeErr))
			return
		}
		if err = s.Service.SubmitAttachment(c.Request.Context(), c.Param("id"), token(c), path); err != nil {
			_ = os.Remove(path)
			fail(c, err)
			return
		}
		b, err := s.Service.Get(c.Request.Context(), c.Param("id"), token(c), false)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(http.StatusOK, b)
	})
	api.POST("/auth/signup/request", s.limiter(5), func(c *gin.Context) {
		var in struct {
			Email    string `json:"email"`
			Name     string `json:"name"`
			Password string `json:"password"`
		}
		if c.ShouldBindJSON(&in) != nil || len(strings.TrimSpace(in.Name)) < 2 || len(strings.TrimSpace(in.Name)) > 120 || len(in.Password) < 8 || len(in.Password) > 72 {
			bad(c)
			return
		}
		email, ok := validEmail(in.Email)
		if !ok {
			bad(c)
			return
		}
		passwordHash, err := service.PasswordHash(in.Password)
		if err != nil {
			fail(c, err)
			return
		}
		code, err := otpCode()
		if err != nil {
			fail(c, err)
			return
		}
		encoded, _ := json.Marshal(otpChallenge{CodeHash: service.Hash(code), Name: strings.TrimSpace(in.Name), PasswordHash: passwordHash})
		if err = s.Redis.Set(c.Request.Context(), "riverlife:otp:"+service.Hash(email), encoded, 10*time.Minute).Err(); err != nil {
			fail(c, err)
			return
		}
		if !s.Demo {
			c.AbortWithStatusJSON(503, gin.H{"error": "ระบบส่งอีเมล OTP ยังไม่ได้ตั้งค่า"})
			return
		}
		c.JSON(202, gin.H{"message": "ส่งรหัส OTP แล้ว", "demo_code": code})
	})
	api.POST("/auth/signup/verify", s.limiter(8), func(c *gin.Context) {
		var in struct {
			Email string `json:"email"`
			Code  string `json:"code"`
		}
		if c.ShouldBindJSON(&in) != nil || len(in.Code) != 6 {
			bad(c)
			return
		}
		email, ok := validEmail(in.Email)
		if !ok {
			bad(c)
			return
		}
		key := "riverlife:otp:" + service.Hash(email)
		raw, err := s.Redis.Get(c.Request.Context(), key).Bytes()
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "รหัส OTP หมดอายุหรือไม่ถูกต้อง"})
			return
		}
		var challenge otpChallenge
		if json.Unmarshal(raw, &challenge) != nil || subtle.ConstantTimeCompare([]byte(challenge.CodeHash), []byte(service.Hash(in.Code))) != 1 {
			c.AbortWithStatusJSON(401, gin.H{"error": "รหัส OTP หมดอายุหรือไม่ถูกต้อง"})
			return
		}
		if err = s.Redis.Del(c.Request.Context(), key).Err(); err != nil {
			fail(c, err)
			return
		}
		user, err := s.Service.CreateMember(c.Request.Context(), email, challenge.Name, challenge.PasswordHash)
		if err != nil {
			fail(c, err)
			return
		}
		if err = s.setUserSession(c, user.ID); err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, user)
	})
	api.POST("/auth/login", s.limiter(10), func(c *gin.Context) {
		var in struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if c.ShouldBindJSON(&in) != nil || len(in.Password) == 0 {
			bad(c)
			return
		}
		email, ok := validEmail(in.Email)
		if !ok {
			bad(c)
			return
		}
		user, err := s.Service.AuthenticateEmailPassword(c.Request.Context(), email, in.Password)
		if errors.Is(err, service.ErrInvalidCredentials) {
			c.AbortWithStatusJSON(401, gin.H{"error": err.Error()})
			return
		}
		if err != nil {
			fail(c, err)
			return
		}
		if err = s.setUserSession(c, user.ID); err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, user)
	})
	api.GET("/auth/me", func(c *gin.Context) {
		id, ok := s.userID(c)
		if !ok {
			c.JSON(200, gin.H{"authenticated": false})
			return
		}
		user, err := s.Service.User(c.Request.Context(), id)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, gin.H{"authenticated": true, "id": user.ID, "name": user.Name, "email": user.Email, "role": user.Role})
	})
	api.POST("/auth/logout", func(c *gin.Context) {
		if t, err := c.Cookie(userCookie); err == nil {
			_ = s.Redis.Del(c.Request.Context(), "riverlife:user-session:"+service.Hash(t)).Err()
		}
		c.SetSameSite(http.SameSiteLaxMode)
		c.SetCookie(userCookie, "", -1, "/api/v1", "", s.CookieSecure, true)
		c.Status(http.StatusNoContent)
	})
	api.GET("/auth/google/status", func(c *gin.Context) {
		c.JSON(200, gin.H{"configured": s.GoogleClientID != "" && s.GoogleClientSecret != ""})
	})
	api.GET("/auth/google/start", func(c *gin.Context) {
		if s.GoogleClientID == "" || s.GoogleClientSecret == "" {
			c.AbortWithStatusJSON(503, gin.H{"error": "Google Sign-In ยังไม่ได้ตั้งค่า"})
			return
		}
		state := service.Token()
		if err := s.Redis.Set(c.Request.Context(), "riverlife:google-state:"+service.Hash(state), "1", 10*time.Minute).Err(); err != nil {
			fail(c, err)
			return
		}
		q := url.Values{"client_id": {s.GoogleClientID}, "redirect_uri": {s.googleCallbackURL()}, "response_type": {"code"}, "scope": {"openid email profile"}, "state": {state}, "prompt": {"select_account"}}
		c.Redirect(http.StatusFound, "https://accounts.google.com/o/oauth2/v2/auth?"+q.Encode())
	})
	api.GET("/auth/google/callback", func(c *gin.Context) {
		state, code := c.Query("state"), c.Query("code")
		key := "riverlife:google-state:" + service.Hash(state)
		if state == "" || code == "" || s.Redis.Del(c.Request.Context(), key).Val() != 1 {
			c.Redirect(http.StatusFound, strings.TrimRight(s.WebOrigin, "/")+"/auth?error=google")
			return
		}
		form := url.Values{"code": {code}, "client_id": {s.GoogleClientID}, "client_secret": {s.GoogleClientSecret}, "redirect_uri": {s.googleCallbackURL()}, "grant_type": {"authorization_code"}}
		response, err := http.Post("https://oauth2.googleapis.com/token", "application/x-www-form-urlencoded", bytes.NewBufferString(form.Encode()))
		if err != nil {
			fail(c, err)
			return
		}
		defer response.Body.Close()
		var tokens struct {
			AccessToken string `json:"access_token"`
		}
		if response.StatusCode != 200 || json.NewDecoder(response.Body).Decode(&tokens) != nil || tokens.AccessToken == "" {
			c.Redirect(http.StatusFound, strings.TrimRight(s.WebOrigin, "/")+"/auth?error=google")
			return
		}
		req, _ := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, "https://openidconnect.googleapis.com/v1/userinfo", nil)
		req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		infoResponse, err := http.DefaultClient.Do(req)
		if err != nil {
			fail(c, err)
			return
		}
		defer infoResponse.Body.Close()
		var info struct {
			Subject       string `json:"sub"`
			Email         string `json:"email"`
			Name          string `json:"name"`
			EmailVerified bool   `json:"email_verified"`
		}
		if infoResponse.StatusCode != 200 || json.NewDecoder(infoResponse.Body).Decode(&info) != nil || info.Subject == "" || !info.EmailVerified {
			c.Redirect(http.StatusFound, strings.TrimRight(s.WebOrigin, "/")+"/auth?error=google")
			return
		}
		user, err := s.Service.UpsertUser(c.Request.Context(), info.Email, info.Name, "google", info.Subject)
		if err != nil || s.setUserSession(c, user.ID) != nil {
			c.Redirect(http.StatusFound, strings.TrimRight(s.WebOrigin, "/")+"/auth?error=google")
			return
		}
		c.Redirect(http.StatusFound, strings.TrimRight(s.WebOrigin, "/")+"/")
	})
	dashboard := api.Group("/dashboard/admin", s.requireRole(service.RoleAdmin))
	dashboard.GET("", func(c *gin.Context) {
		data, err := s.Service.AdminDashboard(c.Request.Context())
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(http.StatusOK, data)
	})
	api.POST("/admin/login", s.limiter(5), func(c *gin.Context) {
		var in struct {
			Password string `json:"password"`
			Remember bool   `json:"remember"`
		}
		if c.ShouldBindJSON(&in) != nil {
			bad(c)
			return
		}
		a, b := service.Hash(in.Password), service.Hash(s.AdminPassword)
		if subtle.ConstantTimeCompare([]byte(a), []byte(b)) != 1 {
			c.AbortWithStatusJSON(401, gin.H{"error": "รหัสผ่านไม่ถูกต้อง"})
			return
		}
		t := service.Token()
		ttl, maxAge := 8*time.Hour, 0
		if in.Remember {
			ttl, maxAge = 7*24*time.Hour, int((7 * 24 * time.Hour).Seconds())
		}
		if err := s.Redis.Set(c.Request.Context(), "riverlife:session:"+service.Hash(t), "admin", ttl).Err(); err != nil {
			fail(c, err)
			return
		}
		c.SetCookie(adminCookie, t, maxAge, "/api/v1/admin", "", s.CookieSecure, true)
		c.Status(http.StatusNoContent)
	})
	admin := api.Group("/admin", s.admin)
	admin.GET("/session", func(c *gin.Context) { c.Status(http.StatusNoContent) })
	admin.POST("/logout", func(c *gin.Context) {
		if err := s.Redis.Del(c.Request.Context(), "riverlife:session:"+service.Hash(adminToken(c))).Err(); err != nil {
			fail(c, err)
			return
		}
		c.SetCookie(adminCookie, "", -1, "/api/v1/admin", "", s.CookieSecure, true)
		c.Status(204)
	})
	admin.GET("/bookings", func(c *gin.Context) {
		bs, err := s.Service.List(c.Request.Context())
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, bs)
	})
	admin.POST("/bookings/:id/decision", func(c *gin.Context) {
		var in struct {
			Action string `json:"action" binding:"required,oneof=no_show"`
		}
		if c.ShouldBindJSON(&in) != nil {
			bad(c)
			return
		}
		if err := s.Service.Decide(c.Request.Context(), c.Param("id"), in.Action); err != nil {
			fail(c, err)
			return
		}
		c.Status(204)
	})
	admin.POST("/check-in", func(c *gin.Context) {
		var in struct {
			Ticket string `json:"ticket" binding:"required,len=64"`
		}
		if c.ShouldBindJSON(&in) != nil {
			bad(c)
			return
		}
		if err := s.Service.CheckIn(c.Request.Context(), in.Ticket); err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, gin.H{"message": "เช็กอินสำเร็จ"})
	})
	admin.PATCH("/zones/:id", func(c *gin.Context) {
		var in service.ZoneUpdate
		if c.ShouldBindJSON(&in) != nil {
			bad(c)
			return
		}
		if err := s.Service.UpdateZone(c.Request.Context(), c.Param("id"), in); err != nil {
			fail(c, err)
			return
		}
		c.Status(204)
	})
	return r
}
