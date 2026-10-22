package server

import (
	"errors"
	"github.com/gin-gonic/gin"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"riverlife/api/internal/service"
	"strings"
)

func (s *Server) bookingRoutes(api *gin.RouterGroup) {
	api.GET("/tables", s.limiter(120), func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		if !s.Demo || !s.Service.TableBookingDemo {
			c.JSON(200, gin.H{"enabled": false, "demo": s.Demo, "tables": []service.TableOption{}})
			return
		}
		options, err := s.Service.TableOptions(c.Request.Context())
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, gin.H{"enabled": true, "demo": true, "tables": options})
	})
	api.POST("/table-bookings", s.limiter(30), func(c *gin.Context) {
		if !s.Demo || !s.Service.TableBookingDemo {
			c.JSON(409, gin.H{"error": "Table booking is available in demo mode only"})
			return
		}
		userID, ok := s.userID(c)
		if !ok {
			c.JSON(401, gin.H{"error": "กรุณาเข้าสู่ระบบก่อนซื้อบัตร"})
			return
		}
		var request struct {
			TableIDs      []string `json:"table_ids" binding:"required,min=1,max=30,dive,max=3"`
			GuestCount    int      `json:"guest_count" binding:"required,min=1,max=120"`
			ExpectedTotal int      `json:"expected_total" binding:"required,min=1"`
		}
		key := c.GetHeader("Idempotency-Key")
		if c.ShouldBindJSON(&request) != nil || len(key) < 16 || len(key) > 100 || len(token(c)) != 64 {
			bad(c)
			return
		}
		user, err := s.Service.User(c.Request.Context(), userID)
		if err != nil {
			fail(c, err)
			return
		}
		b, err := s.Service.Create(c.Request.Context(), service.Input{UserID: userID, Name: user.Name, Email: user.Email, TableIDs: request.TableIDs, GuestCount: request.GuestCount, ExpectedTotal: request.ExpectedTotal}, key, token(c))
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(201, b)
	})
	api.GET("/me/bookings", s.limiter(120), func(c *gin.Context) {
		userID, ok := s.userID(c)
		if !ok {
			c.AbortWithStatusJSON(401, gin.H{"error": "กรุณาเข้าสู่ระบบ"})
			return
		}
		items, err := s.Service.ListForUser(c.Request.Context(), userID)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, items)
	})
	api.POST("/me/bookings/:id/access", s.limiter(30), func(c *gin.Context) {
		userID, ok := s.userID(c)
		if !ok {
			c.AbortWithStatusJSON(401, gin.H{"error": "กรุณาเข้าสู่ระบบ"})
			return
		}
		booking, access, err := s.Service.AccountAccess(c.Request.Context(), c.Param("id"), userID)
		if err != nil {
			fail(c, err)
			return
		}
		c.Header("Cache-Control", "no-store")
		c.JSON(200, gin.H{"booking": booking, "token": access})
	})
	api.POST("/bookings", s.limiter(30), func(c *gin.Context) {
		userID, authenticated := s.userID(c)
		if !authenticated {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "กรุณาเข้าสู่ระบบก่อนซื้อบัตร"})
			return
		}
		user, err := s.Service.User(c.Request.Context(), userID)
		if err != nil {
			fail(c, err)
			return
		}
		var in service.Input
		if c.ShouldBindJSON(&in) != nil || len(c.GetHeader("Idempotency-Key")) < 16 || len(c.GetHeader("Idempotency-Key")) > 100 || len(token(c)) != 64 {
			bad(c)
			return
		}
		// The account is the source of truth for the booking owner; never trust
		// a name or email submitted by the browser for an authenticated purchase.
		in.Name, in.Email = user.Name, user.Email
		in.UserID = userID
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
		b.EmailDeliveryEnabled = s.BookingEmailEnabled
		c.Header("Cache-Control", "no-store")
		c.JSON(200, b)
	})
	api.POST("/bookings/:id/attachment", s.limiter(10), func(c *gin.Context) {
		if !s.Demo {
			c.JSON(409, gin.H{"error": "Payment verification is not configured. Upload confirmation is demo-only."})
			return
		}
		if s.Payments != nil {
			c.JSON(409, gin.H{"error": "Please use Stripe Checkout for this booking"})
			return
		}
		consent := c.PostForm("marketing_consent")
		if c.PostForm("booking_terms_accepted") != "true" || c.PostForm("booking_terms_version") != service.BookingTermsVersion {
			c.JSON(400, gin.H{"error": "กรุณายอมรับเงื่อนไขการจองและการชำระเงิน"})
			return
		}
		language := c.PostForm("marketing_consent_language")
		if language == "" {
			language = "th"
		}
		if (consent != "" && consent != "true" && consent != "false") || (language != "th" && language != "en") {
			bad(c)
			return
		}
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
		if err = s.Service.SubmitAttachment(c.Request.Context(), c.Param("id"), token(c), path, consent == "true", language); err != nil {
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
}
