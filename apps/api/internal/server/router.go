package server

import (
	"crypto/subtle"
	"errors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"riverlife/api/internal/service"
	"strings"
	"time"
)

type Server struct {
	Service       *service.Service
	Redis         *redis.Client
	UploadDir     string
	AdminPassword string
	Demo          bool
}

func token(c *gin.Context) string { return strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ") }
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
	v, err := s.Redis.Get(c.Request.Context(), "riverlife:session:"+service.Hash(token(c))).Result()
	if err != nil || v != "admin" {
		c.AbortWithStatusJSON(401, gin.H{"error": "กรุณาเข้าสู่ระบบเจ้าหน้าที่"})
		return
	}
	c.Next()
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
	api.POST("/admin/login", s.limiter(5), func(c *gin.Context) {
		var in struct {
			Password string `json:"password"`
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
		if err := s.Redis.Set(c.Request.Context(), "riverlife:session:"+service.Hash(t), "admin", 8*time.Hour).Err(); err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, gin.H{"token": t})
	})
	admin := api.Group("/admin", s.admin)
	admin.POST("/logout", func(c *gin.Context) {
		if err := s.Redis.Del(c.Request.Context(), "riverlife:session:"+service.Hash(token(c))).Err(); err != nil {
			fail(c, err)
			return
		}
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
