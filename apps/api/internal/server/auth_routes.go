package server

import (
	"bytes"
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"github.com/gin-gonic/gin"
	"net/http"
	"net/url"
	"riverlife/api/internal/service"
	"strings"
	"time"
)

func (s *Server) authRoutes(api *gin.RouterGroup) {
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
		if s.OTPMailer == nil && !(s.Demo && s.DemoOTP) {
			c.AbortWithStatusJSON(503, gin.H{"error": "ระบบส่งอีเมล OTP ยังไม่ได้ตั้งค่า"})
			return
		}
		// Per-address cooldown supplements the existing per-IP rate limit.
		key := "riverlife:otp:" + service.Hash(email)
		locked, err := s.Redis.SetNX(c.Request.Context(), key+":cooldown", "1", time.Minute).Result()
		if err != nil {
			fail(c, err)
			return
		}
		if !locked {
			c.Header("Retry-After", "60")
			c.AbortWithStatusJSON(429, gin.H{"error": "กรุณารอ 60 วินาทีก่อนขอ OTP อีกครั้ง"})
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
		if err = s.Redis.Set(c.Request.Context(), key, encoded, 10*time.Minute).Err(); err != nil {
			fail(c, err)
			return
		}
		if s.OTPMailer != nil {
			if err = s.OTPMailer.SendOTP(c.Request.Context(), email, code); err != nil {
				// Only remove our own challenge if a newer request has replaced it.
				cleanup, cancel := context.WithTimeout(context.Background(), 2*time.Second)
				defer cancel()
				_ = s.Redis.Eval(cleanup, `if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1],KEYS[2]) end return 0`, []string{key, key + ":cooldown"}, string(encoded)).Err()
				c.AbortWithStatusJSON(503, gin.H{"error": "ส่งอีเมล OTP ไม่สำเร็จ กรุณาลองอีกครั้ง"})
				return
			}
			c.JSON(202, gin.H{"message": "ส่งรหัส OTP ไปยังอีเมลแล้ว กรุณาตรวจสอบกล่องจดหมายและจดหมายขยะ"})
			return
		}
		c.JSON(202, gin.H{"message": "โหมดทดสอบเท่านั้น ยังไม่ได้ส่งอีเมล", "demo_code": code})
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
		consumed, err := s.Redis.Eval(c.Request.Context(), `if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0`, []string{key}, string(raw)).Int()
		if err != nil {
			fail(c, err)
			return
		}
		if consumed != 1 {
			c.AbortWithStatusJSON(401, gin.H{"error": "รหัส OTP หมดอายุหรือไม่ถูกต้อง"})
			return
		}
		user, err := s.Service.CreateMember(c.Request.Context(), email, challenge.Name, challenge.PasswordHash)
		if err != nil {
			fail(c, err)
			return
		}
		if err = s.setUserSession(c, user.ID, user.AuthVersion); err != nil {
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
		if err = s.setUserSession(c, user.ID, user.AuthVersion); err != nil {
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
}
