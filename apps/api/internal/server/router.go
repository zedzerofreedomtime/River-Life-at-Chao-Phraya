package server

import (
	"github.com/gin-gonic/gin"
)

// Router wires route groups in their original registration order.
// Domain handlers live in separate files; services retain the business rules.
func (s *Server) Router() *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	_ = r.SetTrustedProxies(nil)
	r.Use(requestSecurity())

	api := r.Group("/api/v1")
	s.paymentRoutes(api)
	s.publicRoutes(api)
	s.bookingRoutes(api)
	s.authRoutes(api)
	s.adminRoutes(api)
	return r
}
