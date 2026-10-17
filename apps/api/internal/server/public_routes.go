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
		c.JSON(200, gin.H{"title": "Concert on the River", "demo": s.Demo, "date": previewDate, "date_is_preview": s.Demo, "boarding": "18:45", "departure": "19:00", "pier": "ICONSIAM", "pier_number": 4, "duration_minutes": 120, "zones": zs})
	})
}
