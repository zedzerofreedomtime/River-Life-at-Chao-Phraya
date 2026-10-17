package server

import (
	"errors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"log/slog"
	"riverlife/api/internal/service"
)

func fail(c *gin.Context, err error) {
	code := 500
	msg := "ระบบไม่พร้อม กรุณาลองใหม่"
	if errors.Is(err, pgx.ErrNoRows) {
		code = 404
		msg = "ไม่พบรายการ"
	}
	if errors.Is(err, service.ErrConflict) {
		code = 409
		msg = err.Error()
	}
	if errors.Is(err, service.ErrMemberAlreadyExists) {
		code = 409
		msg = err.Error()
	}
	if code == 500 {
		slog.Error("request failed", "error", err)
	}
	c.AbortWithStatusJSON(code, gin.H{"error": msg})
}
func bad(c *gin.Context) {
	c.AbortWithStatusJSON(400, gin.H{"error": "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง"})
}
