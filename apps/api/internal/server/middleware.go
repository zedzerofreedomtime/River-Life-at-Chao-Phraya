package server

import (
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"net/http"
	"riverlife/api/internal/service"
)

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
	if id, ok := s.userID(c); ok {
		user, err := s.Service.User(c.Request.Context(), id)
		if err != nil {
			fail(c, err)
			return
		}
		if user.Role != service.RoleAdmin {
			c.AbortWithStatusJSON(403, gin.H{"error": "ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ"})
			return
		}
		c.Next()
		return
	}
	v, err := s.Redis.Get(c.Request.Context(), "riverlife:session:"+service.Hash(adminToken(c))).Result()
	if err != nil || v != "admin" {
		c.AbortWithStatusJSON(401, gin.H{"error": "กรุณาเข้าสู่ระบบเจ้าหน้าที่"})
		return
	}
	c.Next()
}
func (s *Server) requireRole(role string) gin.HandlerFunc {
	return s.requireRoles(role)
}
func (s *Server) requireRoles(roles ...string) gin.HandlerFunc {
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
		allowed := false
		for _, role := range roles {
			if user.Role == role {
				allowed = true
				break
			}
		}
		if !allowed {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ"})
			return
		}
		c.Next()
	}
}

// requestSecurity applies the same response headers and body limit to every route.
func requestSecurity() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("Cache-Control", "no-store")
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 6<<20)
		c.Next()
	}
}
