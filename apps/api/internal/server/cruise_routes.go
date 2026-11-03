package server

import (
	"github.com/gin-gonic/gin"
	"riverlife/api/internal/service"
)

func (s *Server) cruiseRoutes(api *gin.RouterGroup) {
	api.GET("/cruise-checkout/config", func(c *gin.Context) {
		c.JSON(200, gin.H{"payment_gateway_enabled": false, "email_delivery_enabled": s.BookingEmailEnabled})
	})
	api.GET("/me/cruise-reservations/:id", s.limiter(120), func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		user, ok := s.userID(c)
		if !ok {
			c.AbortWithStatusJSON(401, gin.H{"error": "กรุณาเข้าสู่ระบบ"})
			return
		}
		v, err := s.Service.CruiseReservationDetail(c.Request.Context(), c.Param("id"), user)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, v)
	})
	api.GET("/cruises", s.limiter(120), func(c *gin.Context) {
		v, err := s.Service.Vessels(c.Request.Context())
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, v)
	})
	api.GET("/sailings", s.limiter(120), func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		v, err := s.Service.Sailings(c.Request.Context(), c.Query("vessel"), false)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, v)
	})
	api.POST("/cruise-reservations", s.limiter(20), func(c *gin.Context) {
		user, ok := s.userID(c)
		if !ok {
			c.AbortWithStatusJSON(401, gin.H{"error": "กรุณาเข้าสู่ระบบก่อนจอง"})
			return
		}
		var in service.ReserveCruiseInput
		key := c.GetHeader("Idempotency-Key")
		if c.ShouldBindJSON(&in) != nil || len(key) < 16 || len(key) > 100 {
			bad(c)
			return
		}
		v, err := s.Service.ReserveCruise(c.Request.Context(), in, user, key)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(201, v)
	})
	api.GET("/me/cruise-reservations", s.limiter(120), func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		user, ok := s.userID(c)
		if !ok {
			c.AbortWithStatusJSON(401, gin.H{"error": "กรุณาเข้าสู่ระบบ"})
			return
		}
		v, err := s.Service.CruiseReservations(c.Request.Context(), user)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, v)
	})
	api.POST("/me/cruise-reservations/:id/cancel", s.limiter(20), func(c *gin.Context) {
		user, ok := s.userID(c)
		if !ok {
			c.AbortWithStatusJSON(401, gin.H{"error": "กรุณาเข้าสู่ระบบ"})
			return
		}
		if err := s.Service.CancelCruiseReservation(c.Request.Context(), c.Param("id"), user); err != nil {
			fail(c, err)
			return
		}
		c.Status(204)
	})
	admin := api.Group("/dashboard/admin/cruises", s.requireRole(service.RoleAdmin))
	admin.GET("/reservations", func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		v, err := s.Service.AdminCruiseReservations(c.Request.Context())
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, v)
	})
	admin.POST("/reservations/:id/confirm-payment", s.limiter(15), func(c *gin.Context) {
		var in struct {
			Reference string `json:"reference" binding:"required,min=8,max=100"`
			Amount    int    `json:"amount" binding:"required,min=1"`
			Verified  bool   `json:"verified" binding:"required"`
		}
		if c.ShouldBindJSON(&in) != nil || !in.Verified {
			bad(c)
			return
		}
		actor, _ := s.userID(c)
		v, err := s.Service.ConfirmCruisePayment(c.Request.Context(), c.Param("id"), actor, in.Reference, in.Amount)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, v)
	})
	operator := api.Group("/dashboard/operator/cruises", s.requireRoles(service.RoleOperator, service.RoleAdmin))
	operator.GET("/sailings", func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		items, err := s.Service.Sailings(c.Request.Context(), "unicorn", true)
		if err != nil {
			fail(c, err)
			return
		}
		out := []service.Sailing{}
		for _, v := range items {
			if v.Status != "draft" {
				out = append(out, v)
			}
		}
		c.JSON(200, out)
	})
	operator.POST("/check-in", s.limiter(60), func(c *gin.Context) {
		var in struct {
			Code    string `json:"code" binding:"required,max=100"`
			Sailing string `json:"sailing_id" binding:"required,max=24"`
		}
		if c.ShouldBindJSON(&in) != nil {
			bad(c)
			return
		}
		actor, _ := s.userID(c)
		v, err := s.Service.CheckInCruiseTicket(c.Request.Context(), in.Code, in.Sailing, actor)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, v)
	})
	admin.POST("/sailings/:id/close", s.limiter(30), func(c *gin.Context) {
		var in struct {
			Revision int `json:"revision" binding:"required,min=1"`
		}
		if c.ShouldBindJSON(&in) != nil {
			bad(c)
			return
		}
		actor, _ := s.userID(c)
		if err := s.Service.CloseSailing(c.Request.Context(), c.Param("id"), actor, in.Revision); err != nil {
			fail(c, err)
			return
		}
		c.Status(204)
	})
	admin.GET("/sailings", func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		v, err := s.Service.Sailings(c.Request.Context(), "", true)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, v)
	})
	admin.POST("/sailings", s.limiter(30), func(c *gin.Context) {
		var v service.Sailing
		if c.ShouldBindJSON(&v) != nil {
			bad(c)
			return
		}
		user, _ := s.userID(c)
		saved, err := s.Service.SaveSailing(c.Request.Context(), v, user)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, saved)
	})
}
