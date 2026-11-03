package server

import (
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestContactValidationAndMissingDestination(t *testing.T) {
	t.Setenv("CONTACT_SHEETS_URL", "")
	t.Setenv("CONTACT_SHEETS_KEY", "")
	for _, tc := range []struct {
		body   string
		status int
	}{
		{`{}`, 400},
		{`{"id":"127e2fbc-945c-482a-90ad-223cbe358db1","firstName":"Test","lastName":"User","email":"test@example.com","subject":"general","message":"A valid contact message"}`, 503},
	} {
		r := gin.New()
		r.POST("/", (&Server{}).submitContact)
		req := httptest.NewRequest("POST", "/", strings.NewReader(tc.body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != tc.status {
			t.Fatalf("status %d, want %d: %s", w.Code, tc.status, w.Body.String())
		}
	}
}
