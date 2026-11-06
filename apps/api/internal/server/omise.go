package server

import (
	"github.com/gin-gonic/gin"
	"riverlife/api/internal/service"
)

func (s *Server) omiseRoutes(api *gin.RouterGroup) {
	admin := api.Group("/dashboard/admin/cruises", s.requireRoles(service.RoleAdmin))
	admin.POST("/reservations/:id/reconcile-payment", s.limiter(15), func(c *gin.Context) {
		if s.CruisePayments == nil {
			c.Status(503)
			return
		}
		var in struct {
			ChargeID string `json:"charge_id" binding:"max=100"`
		}
		if c.ShouldBindJSON(&in) != nil {
			bad(c)
			return
		}
		actor, _ := s.userID(c)
		ctx, cancel := paymentContext(c)
		defer cancel()
		v, err := s.CruisePayments.Reconcile(ctx, c.Param("id"), in.ChargeID, actor)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, v)
	})
	for _, action := range []string{"checkout", "payment-status"} {
		action := action
		api.POST("/me/cruise-reservations/:id/"+action, func(c *gin.Context) {
			if _, ok := s.userID(c); !ok {
				c.AbortWithStatusJSON(401, gin.H{"error": "กรุณาเข้าสู่ระบบ"})
				return
			}
		}, s.limiter(20), func(c *gin.Context) {
			if s.CruisePayments == nil {
				c.JSON(503, gin.H{"error": "Omise sandbox is not configured"})
				return
			}
			user, _ := s.userID(c)
			ctx, cancel := paymentContext(c)
			defer cancel()
			if action == "checkout" {
				var in struct {
					Accepted bool   `json:"terms_accepted"`
					Token    string `json:"token" binding:"max=100"`
					Source   string `json:"source" binding:"max=100"`
				}
				if c.ShouldBindJSON(&in) != nil || !in.Accepted {
					bad(c)
					return
				}
				v, err := s.CruisePayments.Checkout(ctx, c.Param("id"), user, service.OmisePaymentInput{Token: in.Token, Source: in.Source})
				if err != nil {
					fail(c, err)
					return
				}
				c.JSON(200, v)
			} else {
				v, err := s.CruisePayments.Status(ctx, c.Param("id"), user)
				if err != nil {
					fail(c, err)
					return
				}
				c.JSON(200, v)
			}
		})
	}
	api.POST("/payments/omise/webhook", s.limiter(120), func(c *gin.Context) {
		if s.CruisePayments == nil {
			c.Status(503)
			return
		}
		var event struct {
			Key  string `json:"key"`
			Data struct {
				ID string `json:"id"`
			} `json:"data"`
		}
		if c.ShouldBindJSON(&event) != nil || len(event.Data.ID) > 100 {
			bad(c)
			return
		}
		if event.Key != "charge.complete" {
			c.Status(200)
			return
		}
		ctx, cancel := paymentContext(c)
		defer cancel()
		if err := s.CruisePayments.SyncCharge(ctx, event.Data.ID); err != nil {
			fail(c, err)
			return
		}
		c.Status(200)
	})
}
