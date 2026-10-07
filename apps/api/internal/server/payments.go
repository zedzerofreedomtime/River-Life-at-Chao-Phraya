package server

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	stripe "github.com/stripe/stripe-go/v85"
	"github.com/stripe/stripe-go/v85/webhook"
)

func paymentContext(c *gin.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(c.Request.Context(), 15*time.Second)
}

func (s *Server) paymentRoutes(api *gin.RouterGroup) {
	api.GET("/payments/config", func(c *gin.Context) {
		c.JSON(200, gin.H{"enabled": s.Payments != nil, "sandbox": true})
	})
	api.POST("/bookings/:id/checkout", s.limiter(10), func(c *gin.Context) {
		if s.Payments == nil {
			c.JSON(503, gin.H{"error": "Stripe sandbox is not configured"})
			return
		}
		var in struct {
			Language         string `json:"language"`
			MarketingConsent bool   `json:"marketing_consent"`
		}
		if c.ShouldBindJSON(&in) != nil || (in.Language != "th" && in.Language != "en") {
			bad(c)
			return
		}
		ctx, cancel := paymentContext(c)
		defer cancel()
		result, err := s.Payments.Checkout(ctx, c.Param("id"), token(c), in.MarketingConsent, in.Language)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, result)
	})
	api.POST("/bookings/:id/payment-status", s.limiter(120), func(c *gin.Context) {
		if s.Payments == nil {
			c.JSON(503, gin.H{"error": "Stripe sandbox is not configured"})
			return
		}
		ctx, cancel := paymentContext(c)
		defer cancel()
		b, err := s.Payments.Sync(ctx, c.Param("id"), token(c))
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, b)
	})
	api.POST("/payments/stripe/webhook", func(c *gin.Context) {
		if s.Payments == nil || s.StripeWebhookSecret == "" {
			c.Status(http.StatusServiceUnavailable)
			return
		}
		payload, err := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, 1<<20))
		if err != nil {
			c.Status(400)
			return
		}
		event, err := webhook.ConstructEvent(payload, c.GetHeader("Stripe-Signature"), s.StripeWebhookSecret)
		if err != nil || event.Livemode {
			c.Status(400)
			return
		}
		switch event.Type {
		case "checkout.session.completed", "checkout.session.async_payment_succeeded":
			var session stripe.CheckoutSession
			if json.Unmarshal(event.Data.Raw, &session) != nil {
				c.Status(400)
				return
			}
			ctx, cancel := paymentContext(c)
			defer cancel()
			if err = s.Payments.SyncSession(ctx, session.ID); err != nil {
				fail(c, err)
				return
			}
		}
		c.Status(200)
	})
}
