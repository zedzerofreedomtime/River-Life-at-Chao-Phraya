package server

import (
	"github.com/gin-gonic/gin"
)

func (s *Server) publicRoutes(api *gin.RouterGroup) {
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
		var previewDate *string
		if s.Demo {
			date := "2026-11-21"
			previewDate = &date
		}
		p, err := s.Service.Program(c.Request.Context())
		if err != nil {
			fail(c, err)
			return
		}
		if p.Date != nil {
			previewDate = p.Date
		}
		c.JSON(200, gin.H{"title": p.Title, "demo": s.Demo, "date": previewDate, "date_is_preview": s.Demo || p.Date == nil, "boarding": p.Boarding, "departure": p.Departure, "pier": p.Pier, "pier_number": p.PierNumber, "duration_minutes": p.Duration, "zones": zs})
	})
}
