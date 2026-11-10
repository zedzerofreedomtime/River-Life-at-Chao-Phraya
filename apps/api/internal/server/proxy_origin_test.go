package server

import (
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"testing"
)

func TestRequestSecurityBehindExternalProxy(t *testing.T) {
	r := gin.New()
	r.Use(requestSecurity("https://river.example"))
	r.POST("/", func(c *gin.Context) { c.Status(204) })
	for _, tc := range []struct {
		name, origin, site string
		want               int
	}{
		{"configured frontend", "https://river.example", "same-origin", 204},
		{"origin without fetch metadata", "https://river.example", "", 204},
		{"foreign origin", "https://evil.example", "same-origin", 403},
		{"sibling origin", "https://other.river.example", "same-site", 403},
		{"downgrade", "http://river.example", "same-origin", 403},
		{"cross-site metadata", "https://river.example", "cross-site", 403},
		{"opaque origin", "null", "", 403},
		{"original host", "https://tunnel.example", "same-origin", 204},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "https://tunnel.example/", nil)
			req.Header.Set("Origin", tc.origin)
			req.Header.Set("Sec-Fetch-Site", tc.site)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if w.Code != tc.want {
				t.Fatalf("got %d want %d", w.Code, tc.want)
			}
		})
	}
}
