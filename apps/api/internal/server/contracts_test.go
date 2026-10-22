package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"riverlife/api/internal/service"
)

func TestRouteInventory(t *testing.T) {
	want := map[string]bool{
		"GET /api/v1/tables":                               true,
		"POST /api/v1/table-bookings":                      true,
		"GET /api/v1/dashboard/sales":                      true,
		"POST /api/v1/dashboard/sales/bookings":            true,
		"POST /api/v1/dashboard/sales/bookings/:id/access": true,
		"GET /api/v1/dashboard/operator":                   true,
		"POST /api/v1/dashboard/operator/check-in":         true,
		"PATCH /api/v1/dashboard/admin/zones/:id":          true,
		"GET /api/v1/dashboard/admin/users":                true,
		"PATCH /api/v1/dashboard/admin/users/:id/role":     true,
		"GET /api/v1/dashboard/admin/program":              true,
		"PUT /api/v1/dashboard/admin/program":              true,
		"GET /api/v1/me/bookings":                          true,
		"POST /api/v1/me/bookings/:id/access":              true,
		"GET /api/v1/payments/config":                      true,
		"POST /api/v1/bookings/:id/checkout":               true,
		"POST /api/v1/bookings/:id/payment-status":         true,
		"POST /api/v1/payments/stripe/webhook":             true,
		"GET /api/v1/health":                               true,
		"GET /api/v1/event":                                true,
		"POST /api/v1/bookings":                            true,
		"GET /api/v1/bookings/:id":                         true,
		"POST /api/v1/bookings/:id/attachment":             true,
		"POST /api/v1/auth/signup/request":                 true,
		"POST /api/v1/auth/password-reset/request":         true,
		"POST /api/v1/auth/password-reset/verify":          true,
		"POST /api/v1/auth/password-reset/complete":        true,
		"POST /api/v1/auth/signup/verify":                  true,
		"POST /api/v1/auth/login":                          true,
		"GET /api/v1/auth/me":                              true,
		"POST /api/v1/auth/logout":                         true,
		"GET /api/v1/auth/google/status":                   true,
		"GET /api/v1/auth/google/start":                    true,
		"GET /api/v1/auth/google/callback":                 true,
		"GET /api/v1/dashboard/admin":                      true,
		"POST /api/v1/dashboard/admin/bookings/:id/cancel": true,
		"POST /api/v1/admin/login":                         true,
		"GET /api/v1/admin/session":                        true,
		"POST /api/v1/admin/logout":                        true,
		"GET /api/v1/admin/bookings":                       true,
		"POST /api/v1/admin/bookings/:id/decision":         true,
		"POST /api/v1/admin/check-in":                      true,
		"PATCH /api/v1/admin/zones/:id":                    true,
	}
	routes := (&Server{}).Router().Routes()
	if len(routes) != len(want) {
		t.Fatalf("registered %d routes, want %d", len(routes), len(want))
	}
	for _, route := range routes {
		key := route.Method + " " + route.Path
		if !want[key] {
			t.Errorf("unexpected route: %s", key)
		}
		delete(want, key)
	}
	for key := range want {
		t.Errorf("missing route: %s", key)
	}
}

func TestErrorResponses(t *testing.T) {
	for _, tc := range []struct {
		name    string
		err     error
		status  int
		message string
	}{
		{"missing", pgx.ErrNoRows, 404, "ไม่พบรายการ"},
		{"wrapped missing", fmt.Errorf("lookup: %w", pgx.ErrNoRows), 404, "ไม่พบรายการ"},
		{"conflict", service.ErrConflict, 409, service.ErrConflict.Error()},
		{"wrapped conflict", fmt.Errorf("booking: %w", service.ErrConflict), 409, "booking: " + service.ErrConflict.Error()},
		{"duplicate member", service.ErrMemberAlreadyExists, 409, service.ErrMemberAlreadyExists.Error()},
		{"internal", errors.New("private database details"), 500, "ระบบไม่พร้อม กรุณาลองใหม่"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			fail(c, tc.err)
			assertErrorResponse(t, w, tc.status, tc.message)
			if !c.IsAborted() {
				t.Fatal("error response must abort the handler chain")
			}
		})
	}
	t.Run("validation", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		bad(c)
		assertErrorResponse(t, w, 400, "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง")
	})
}

func assertErrorResponse(t *testing.T, w *httptest.ResponseRecorder, status int, message string) {
	t.Helper()
	var body struct {
		Error string `json:"error"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if w.Code != status || body.Error != message {
		t.Fatalf("got %d %q, want %d %q", w.Code, body.Error, status, message)
	}
}

func TestAdminTokenPrecedence(t *testing.T) {
	for _, tc := range []struct{ name, header, cookie, want string }{
		{"header before cookie", "Bearer header-token", "cookie-token", "header-token"},
		{"cookie fallback", "", "cookie-token", "cookie-token"},
		{"empty bearer fallback", "Bearer ", "cookie-token", "cookie-token"},
		{"missing", "", "", ""},
		// Preserve the current parser's case-sensitive behavior during refactoring.
		{"case sensitive", "bearer header-token", "cookie-token", "bearer header-token"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest(http.MethodGet, "/", nil)
			c.Request.Header.Set("Authorization", tc.header)
			if tc.cookie != "" {
				c.Request.AddCookie(&http.Cookie{Name: adminCookie, Value: tc.cookie})
			}
			if got := adminToken(c); got != tc.want {
				t.Fatalf("got %q, want %q", got, tc.want)
			}
		})
	}
}

func TestEmailValidation(t *testing.T) {
	for _, tc := range []struct {
		input, want string
		valid       bool
	}{
		{" Person@Example.COM ", "person@example.com", true},
		{"person+tag@example.com", "person+tag@example.com", true},
		{"Name <person@example.com>", "name <person@example.com>", false},
		{"", "", false},
		{"not-an-email", "not-an-email", false},
	} {
		t.Run(tc.input, func(t *testing.T) {
			got, valid := validEmail(tc.input)
			if got != tc.want || valid != tc.valid {
				t.Fatalf("got %q %v, want %q %v", got, valid, tc.want, tc.valid)
			}
		})
	}
}

func TestGoogleCallbackURL(t *testing.T) {
	for _, origin := range []string{"https://example.com", "https://example.com/", "https://example.com///"} {
		s := Server{WebOrigin: origin}
		if got := s.googleCallbackURL(); got != "https://example.com/api/v1/auth/google/callback" {
			t.Fatal(got)
		}
	}
}

func TestRequestSecurity(t *testing.T) {
	for _, size := range []int{6 << 20, (6 << 20) + 1} {
		t.Run(fmt.Sprint(size), func(t *testing.T) {
			r := gin.New()
			r.Use(requestSecurity())
			r.POST("/", func(c *gin.Context) {
				_, err := io.Copy(io.Discard, c.Request.Body)
				if err != nil {
					var limit *http.MaxBytesError
					if !errors.As(err, &limit) {
						t.Errorf("unexpected read error: %v", err)
					}
					c.Status(http.StatusRequestEntityTooLarge)
					return
				}
				c.Status(http.StatusNoContent)
			})
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/", strings.NewReader(strings.Repeat("x", size))))
			want := http.StatusNoContent
			if size > 6<<20 {
				want = http.StatusRequestEntityTooLarge
			}
			if w.Code != want {
				t.Fatalf("got %d, want %d", w.Code, want)
			}
			if w.Header().Get("Cache-Control") != "no-store" || w.Header().Get("X-Content-Type-Options") != "nosniff" {
				t.Fatal("security headers missing")
			}
		})
	}
}

func TestUnauthenticatedDashboard(t *testing.T) {
	r := (&Server{}).Router()
	for _, route := range []struct{ method, path string }{
		{http.MethodGet, "/api/v1/dashboard/admin"},
		{http.MethodPost, "/api/v1/dashboard/admin/bookings/example/cancel"},
	} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(route.method, route.path, nil))
		assertErrorResponse(t, w, http.StatusUnauthorized, "กรุณาเข้าสู่ระบบ")
	}
}
