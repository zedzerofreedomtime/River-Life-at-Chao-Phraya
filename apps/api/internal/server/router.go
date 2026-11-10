package server

import (
	"github.com/gin-gonic/gin"
)

// Router wires route groups in their original registration order.
// Domain handlers live in separate files; services retain the business rules.
func (s *Server) Router() *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	if err := r.SetTrustedProxies(s.TrustedProxies); err != nil {
		panic("invalid trusted proxy configuration")
	}
	r.RemoteIPHeaders = []string{"X-Forwarded-For"}
	r.Use(requestSecurity(s.WebOrigin))

	api := r.Group("/api/v1")
	s.paymentRoutes(api)
	s.publicRoutes(api)
	s.cruiseRoutes(api)
	s.omiseRoutes(api)
	s.cruiseImageRoutes(api)
	s.contactRoutes(api)
	s.bookingRoutes(api)
	s.authRoutes(api)
	s.passwordResetRoutes(api)
	s.adminRoutes(api)
	s.staffRoutes(api)
	return r
}
