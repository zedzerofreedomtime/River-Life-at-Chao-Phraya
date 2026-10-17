package server

import (
	"crypto/rand"
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"net/mail"
	"riverlife/api/internal/service"
	"strings"
	"time"
)

func token(c *gin.Context) string { return strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ") }

const adminCookie = "riverlife_admin"
const userCookie = "riverlife_user"

type otpChallenge struct {
	CodeHash     string `json:"code_hash"`
	Name         string `json:"name"`
	PasswordHash string `json:"password_hash"`
}

func otpCode() (string, error) {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	n := uint32(b[0])<<24 | uint32(b[1])<<16 | uint32(b[2])<<8 | uint32(b[3])
	return fmt.Sprintf("%06d", n%1000000), nil
}

func (s *Server) userID(c *gin.Context) (string, bool) {
	t, err := c.Cookie(userCookie)
	if err != nil || t == "" {
		return "", false
	}
	v, err := s.Redis.Get(c.Request.Context(), "riverlife:user-session:"+service.Hash(t)).Result()
	return v, err == nil && v != ""
}
func (s *Server) setUserSession(c *gin.Context, userID string) error {
	t := service.Token()
	if err := s.Redis.Set(c.Request.Context(), "riverlife:user-session:"+service.Hash(t), userID, 7*24*time.Hour).Err(); err != nil {
		return err
	}
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(userCookie, t, int((7 * 24 * time.Hour).Seconds()), "/api/v1", "", s.CookieSecure, true)
	return nil
}
func validEmail(value string) (string, bool) {
	v := strings.ToLower(strings.TrimSpace(value))
	a, err := mail.ParseAddress(v)
	return v, err == nil && a.Address == v
}
func (s *Server) googleCallbackURL() string {
	return strings.TrimRight(s.WebOrigin, "/") + "/api/v1/auth/google/callback"
}

func adminToken(c *gin.Context) string {
	if header := token(c); header != "" {
		return header
	}
	cookie, _ := c.Cookie(adminCookie)
	return cookie
}
