package server

import (
	"github.com/gin-gonic/gin"
	"riverlife/api/internal/service"
	"strings"
	"time"
)

func (s *Server) staffRoutes(api *gin.RouterGroup) {
	sales := api.Group("/dashboard/sales", s.requireRoles(service.RoleSales, service.RoleAdmin))
	sales.GET("", func(c *gin.Context) {
		id, _ := s.userID(c)
		bookings, err := s.Service.SalesBookings(c.Request.Context(), id)
		if err != nil {
			fail(c, err)
			return
		}
		zones, err := s.Service.Zones(c.Request.Context())
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, gin.H{"bookings": bookings, "zones": zones, "demo": s.Demo})
	})
	sales.POST("/bookings", s.limiter(30), func(c *gin.Context) {
		var in service.Input
		if c.ShouldBindJSON(&in) != nil || len(token(c)) != 64 || len(c.GetHeader("Idempotency-Key")) < 16 || len(c.GetHeader("Idempotency-Key")) > 100 {
			bad(c)
			return
		}
		id, _ := s.userID(c)
		in.Name = strings.TrimSpace(in.Name)
		in.Email = strings.ToLower(strings.TrimSpace(in.Email))
		if len(in.Name) < 2 {
			bad(c)
			return
		}
		b, err := s.Service.SalesCreate(c.Request.Context(), in, c.GetHeader("Idempotency-Key"), token(c), id)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(201, b)
	})
	sales.POST("/bookings/:id/access", s.limiter(30), func(c *gin.Context) {
		id, _ := s.userID(c)
		b, access, err := s.Service.SalesAccess(c.Request.Context(), c.Param("id"), id)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, gin.H{"booking": b, "token": access})
	})
	op := api.Group("/dashboard/operator", s.requireRoles(service.RoleOperator, service.RoleAdmin))
	op.GET("", func(c *gin.Context) {
		roster, err := s.Service.Passengers(c.Request.Context())
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, gin.H{"passengers": roster, "demo": s.Demo})
	})
	op.POST("/check-in", s.limiter(120), func(c *gin.Context) {
		var in struct {
			Ticket string `json:"ticket" binding:"required,len=64"`
		}
		if c.ShouldBindJSON(&in) != nil {
			bad(c)
			return
		}
		actor, _ := s.userID(c)
		if err := s.Service.CheckIn(c.Request.Context(), in.Ticket, actor); err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, gin.H{"message": "เช็กอินสำเร็จ"})
	})
	admin := api.Group("/dashboard/admin", s.requireRole(service.RoleAdmin))
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
	admin.GET("/users", func(c *gin.Context) {
		users, err := s.Service.StaffUsers(c.Request.Context())
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, users)
	})
	admin.PATCH("/users/:id/role", func(c *gin.Context) {
		var in struct {
			Role string `json:"role" binding:"required,oneof=user sales operator admin"`
		}
		if c.ShouldBindJSON(&in) != nil {
			bad(c)
			return
		}
		id, _ := s.userID(c)
		if err := s.Service.SetRole(c.Request.Context(), id, c.Param("id"), in.Role); err != nil {
			fail(c, err)
			return
		}
		c.Status(204)
	})
	admin.GET("/program", func(c *gin.Context) {
		p, err := s.Service.Program(c.Request.Context())
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, p)
	})
	admin.PUT("/program", func(c *gin.Context) {
		var p service.Program
		if c.ShouldBindJSON(&p) != nil {
			bad(c)
			return
		}
		if _, err := time.Parse("15:04", p.Boarding); err != nil {
			bad(c)
			return
		}
		if _, err := time.Parse("15:04", p.Departure); err != nil {
			bad(c)
			return
		}
		if p.Date != nil {
			if _, err := time.Parse("2006-01-02", *p.Date); err != nil {
				bad(c)
				return
			}
		}
		if err := s.Service.UpdateProgram(c.Request.Context(), p); err != nil {
			fail(c, err)
			return
		}
		c.Status(204)
	})
}
