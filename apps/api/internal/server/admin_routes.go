package server

import (
	"crypto/subtle"
	"github.com/gin-gonic/gin"
	"net/http"
	"riverlife/api/internal/service"
	"time"
)

func (s *Server) adminRoutes(api *gin.RouterGroup) {
	dashboard := api.Group("/dashboard/admin", s.requireRole(service.RoleAdmin))
	dashboard.GET("", func(c *gin.Context) {
		data, err := s.Service.AdminDashboard(c.Request.Context())
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(http.StatusOK, data)
	})
	dashboard.POST("/bookings/:id/cancel", func(c *gin.Context) {
		if err := s.Service.CancelByAdmin(c.Request.Context(), c.Param("id")); err != nil {
			fail(c, err)
			return
		}
		c.Status(http.StatusNoContent)
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
}
