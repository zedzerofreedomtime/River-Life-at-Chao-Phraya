package server

import (
	"crypto/rand"
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"net/mail"
	"riverlife/api/internal/service"
	"strconv"
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
	if err != nil || v == "" {
		return "", false
	}
	id, versionText, versioned := strings.Cut(v, ":")
	version := 0 // Existing sessions remain valid until the first password reset.
	if versioned {
		version, err = strconv.Atoi(versionText)
		if err != nil {
			return "", false
		}
	}
	var current int
	err = s.Service.DB.QueryRow(c.Request.Context(), "SELECT auth_version FROM users WHERE id=$1", id).Scan(&current)
	return id, err == nil && current == version
}
func (s *Server) setUserSession(c *gin.Context, userID string, expectedVersion ...int) error {
	t := service.Token()
	var version int
	if err := s.Service.DB.QueryRow(c.Request.Context(), "SELECT auth_version FROM users WHERE id=$1", userID).Scan(&version); err != nil {
		return err
	}
	if len(expectedVersion) > 0 && version != expectedVersion[0] {
		return service.ErrInvalidCredentials
	}
	if err := s.Redis.Set(c.Request.Context(), "riverlife:user-session:"+service.Hash(t), fmt.Sprintf("%s:%d", userID, version), 7*24*time.Hour).Err(); err != nil {
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
