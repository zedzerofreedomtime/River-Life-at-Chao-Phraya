package server

import (
	"github.com/gin-gonic/gin"
	"riverlife/api/internal/service"
	"strconv"
	"time"
)

func (s *Server) managementRoutes(api *gin.RouterGroup) {
	admin := api.Group("/dashboard/admin/management", s.requireRole(service.RoleAdmin))
	admin.GET("/refunds", func(c *gin.Context) {
		rows, e := s.Service.DB.Query(c.Request.Context(), "SELECT reservation_id,status,reason,reference FROM cruise_refunds ORDER BY created_at DESC LIMIT 100")
		if e != nil {
			fail(c, e)
			return
		}
		defer rows.Close()
		out := []gin.H{}
		for rows.Next() {
			var id, status, reason, ref string
			if e = rows.Scan(&id, &status, &reason, &ref); e != nil {
				fail(c, e)
				return
			}
			out = append(out, gin.H{"id": id, "status": status, "reason": reason, "reference": ref})
		}
		if e = rows.Err(); e != nil {
			fail(c, e)
			return
		}
		c.JSON(200, out)
	})
	api.POST("/dashboard/owner/cruises/reservations/:id/refund", s.requireRole(service.RoleOwner), s.limiter(5), func(c *gin.Context) {
		var in struct {
			Reason string `json:"reason" binding:"required,min=3,max=255"`
		}
		if c.ShouldBindJSON(&in) != nil {
			bad(c)
			return
		}
		if s.CruisePayments == nil {
			c.JSON(503, gin.H{"error": "Payment gateway unavailable"})
			return
		}
		actor, _ := s.userID(c)
		ctx, cancel := paymentContext(c)
		defer cancel()
		if e := s.CruisePayments.Refund(ctx, actor, c.Param("id"), in.Reason); e != nil {
			fail(c, e)
			return
		}
		c.Status(204)
	})
	offset := func(c *gin.Context) (int, bool) {
		n, e := strconv.Atoi(c.DefaultQuery("offset", "0"))
		if e != nil || n < 0 || n > 100000 {
			bad(c)
			return 0, false
		}
		return n, true
	}
	admin.POST("/reservations/:id/move-seats", s.limiter(10), func(c *gin.Context) {
		var in struct {
			Seats  []string `json:"seat_ids" binding:"required,min=1,max=200,dive,max=24"`
			Reason string   `json:"reason" binding:"required,min=3,max=500"`
		}
		if c.ShouldBindJSON(&in) != nil {
			bad(c)
			return
		}
		actor, _ := s.userID(c)
		if e := s.Service.MoveCruiseSeats(c.Request.Context(), actor, c.Param("id"), in.Reason, in.Seats); e != nil {
			fail(c, e)
			return
		}
		c.Status(204)
	})
	admin.GET("/users", func(c *gin.Context) {
		n, ok := offset(c)
		if !ok {
			return
		}
		if len(c.Query("q")) > 200 {
			bad(c)
			return
		}
		v, e := s.Service.ManagedUsers(c.Request.Context(), c.Query("q"), n)
		if e != nil {
			fail(c, e)
			return
		}
		c.JSON(200, v)
	})
	admin.POST("/users/:id/action", s.limiter(20), func(c *gin.Context) {
		var in struct {
			Action string `json:"action" binding:"required,oneof=suspend restore logout"`
		}
		if c.ShouldBindJSON(&in) != nil {
			bad(c)
			return
		}
		actor, _ := s.userID(c)
		if e := s.Service.ManageAccount(c.Request.Context(), actor, c.Param("id"), in.Action); e != nil {
			fail(c, e)
			return
		}
		c.Status(204)
	})
	admin.GET("/audit", func(c *gin.Context) {
		n, ok := offset(c)
		if !ok {
			return
		}
		v, e := s.Service.StaffAudit(c.Request.Context(), n)
		if e != nil {
			fail(c, e)
			return
		}
		c.JSON(200, v)
	})
	admin.POST("/reservations/:id/resend", s.limiter(10), func(c *gin.Context) {
		var in struct {
			Kind string `json:"kind" binding:"required,oneof=booking tickets"`
		}
		if c.ShouldBindJSON(&in) != nil {
			bad(c)
			return
		}
		actor, _ := s.userID(c)
		if e := s.Service.ResendCruiseEmail(c.Request.Context(), actor, c.Param("id"), in.Kind); e != nil {
			fail(c, e)
			return
		}
		c.Status(204)
	})
	admin.GET("/sales-report", func(c *gin.Context) {
		from, e := time.Parse("2006-01-02", c.Query("from"))
		to, e2 := time.Parse("2006-01-02", c.Query("to"))
		if e != nil || e2 != nil || to.Before(from) || to.Sub(from) > 366*24*time.Hour {
			bad(c)
			return
		}
		zone := time.FixedZone("Bangkok", 7*3600)
		from = time.Date(from.Year(), from.Month(), from.Day(), 0, 0, 0, 0, zone)
		to = time.Date(to.Year(), to.Month(), to.Day(), 0, 0, 0, 0, zone).AddDate(0, 0, 1)
		v, e := s.Service.SalesReport(c.Request.Context(), from, to)
		if e != nil {
			fail(c, e)
			return
		}
		c.JSON(200, v)
	})
}
