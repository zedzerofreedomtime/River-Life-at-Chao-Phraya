package server

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"riverlife/api/internal/repository"
	"riverlife/api/internal/service"
)

func securityCache(t *testing.T) *redis.Client {
	t.Helper()
	if os.Getenv("TEST_REDIS_URL") == "" {
		t.Skip("isolated Redis required")
	}
	opts, err := redis.ParseURL(os.Getenv("TEST_REDIS_URL"))
	if err != nil {
		t.Fatal(err)
	}
	cache := redis.NewClient(opts)
	t.Cleanup(func() { cache.Close() })
	return cache
}

func TestSecurityCrossSiteWrites(t *testing.T) {
	r := gin.New()
	r.Use(requestSecurity())
	r.POST("/api/v1/auth/login", func(c *gin.Context) { c.Status(204) })
	for _, tc := range []struct {
		name, origin, site string
		want               int
	}{
		{"foreign form", "https://evil.test", "cross-site", 403},
		{"foreign origin without metadata", "https://evil.test", "", 403},
		{"same site sibling", "https://other.river.test", "same-site", 403},
		{"same origin", "https://river.test", "same-origin", 204},
		{"non browser client", "", "", 204},
		{"opaque origin", "null", "", 403},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "https://river.test/api/v1/auth/login", strings.NewReader(`{}`))
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

func TestSecuritySignupGuessBudget(t *testing.T) {
	cache := securityCache(t)
	ctx := context.Background()
	email := service.Token() + "@example.test"
	key := "riverlife:otp:" + service.Hash(email)
	raw, _ := json.Marshal(otpChallenge{CodeHash: service.Hash("999999"), Name: "QA", PasswordHash: "unused"})
	if err := cache.Set(ctx, key, raw, 10*time.Minute).Err(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { cache.Del(ctx, key, key+":attempts:"+service.Hash(string(raw))) })
	r := (&Server{Redis: cache}).Router()
	for i := 0; i < 5; i++ {
		req := httptest.NewRequest("POST", "/api/v1/auth/signup/verify", strings.NewReader(`{"email":"`+email+`","code":"000000"}`))
		req.RemoteAddr = "192.0.2." + string(rune('1'+i)) + ":1234"
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != 401 {
			t.Fatalf("guess %d: %d", i, w.Code)
		}
	}
	if cache.Exists(ctx, key).Val() != 0 {
		t.Fatal("OTP remains usable after five guesses across addresses")
	}
}

func TestSecurityOAuthBrowserBinding(t *testing.T) {
	original := http.DefaultClient
	http.DefaultClient = &http.Client{Transport: securityNoNetwork{}}
	t.Cleanup(func() { http.DefaultClient = original })
	cache := securityCache(t)
	r := (&Server{Redis: cache, GoogleClientID: "test", GoogleClientSecret: "test", WebOrigin: "https://river.test"}).Router()
	start := httptest.NewRecorder()
	r.ServeHTTP(start, httptest.NewRequest("GET", "https://river.test/api/v1/auth/google/start?return_to=/booking", nil))
	u, _ := url.Parse(start.Header().Get("Location"))
	state := u.Query().Get("state")
	if state == "" {
		t.Fatal("no state")
	}
	key := "riverlife:google-state:" + service.Hash(state)
	t.Cleanup(func() { cache.Del(context.Background(), key) })
	if len(start.Result().Cookies()) == 0 {
		t.Error("OAuth lacks browser binding cookie")
	}
	callback := httptest.NewRecorder()
	r.ServeHTTP(callback, httptest.NewRequest("GET", "https://river.test/api/v1/auth/google/callback?state="+state+"&code=test", nil))
	for _, c := range callback.Result().Cookies() {
		if c.Name == userCookie && c.Value != "" {
			t.Fatal("foreign browser logged in")
		}
	}
	if cache.Exists(context.Background(), key).Val() != 1 {
		t.Fatal("foreign callback consumed initiating browser state")
	}
}

func TestSecurityEmailLength(t *testing.T) {
	if _, ok := validEmail(strings.Repeat("a", 255) + "@example.test"); ok {
		t.Fatal("oversized email accepted")
	}
	if _, ok := validEmail("member@example.test"); !ok {
		t.Fatal("normal email rejected")
	}
}

func TestSecurityProxyRateIsolationAndSpoofing(t *testing.T) {
	cache := securityCache(t)
	for _, trusted := range []bool{true, false} {
		t.Run(map[bool]string{true: "trusted proxy", false: "untrusted peer"}[trusted], func(t *testing.T) {
			app := &Server{Redis: cache}
			if trusted {
				app.TrustedProxies = []string{"192.0.2.200/32"}
			}
			r := app.Router()
			path := "/security-rate-" + service.Token()
			r.GET(path, app.limiter(1), func(c *gin.Context) { c.Status(204) })
			for i, ip := range []string{"198.51.100.1", "198.51.100.2"} {
				req := httptest.NewRequest("GET", path, nil)
				req.RemoteAddr = "192.0.2.200:1234"
				req.Header.Set("X-Forwarded-For", ip)
				w := httptest.NewRecorder()
				r.ServeHTTP(w, req)
				want := 204
				if !trusted && i == 1 {
					want = 429
				}
				if w.Code != want {
					t.Fatalf("client %d got %d want %d", i, w.Code, want)
				}
			}
			for _, ip := range []string{"198.51.100.1", "198.51.100.2", "192.0.2.200"} {
				cache.Del(context.Background(), "riverlife:rate:"+path+":"+service.Hash(ip))
			}
		})
	}
}

func TestSecurityPlainTextLoginRejected(t *testing.T) {
	cache := securityCache(t)
	r := (&Server{Redis: cache}).Router()
	for _, path := range []string{"/api/v1/auth/login", "/api/v1/admin/login"} {
		req := httptest.NewRequest("POST", path, strings.NewReader(`{"email":"qa@example.test","password":"test"}`))
		req.RemoteAddr = "192.0.2.211:1234"
		req.Header.Set("Content-Type", "text/plain")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != 415 {
			t.Fatalf("%s: %d", path, w.Code)
		}
	}
}

type securityNoNetwork struct{}

func (securityNoNetwork) RoundTrip(*http.Request) (*http.Response, error) {
	return nil, errors.New("network disabled for regression")
}

type securityOAuthTransport func(*http.Request) (*http.Response, error)

func (f securityOAuthTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestSecurityOAuthBoundBrowserSucceedsOnce(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("isolated PostgreSQL required")
	}
	db, err := repository.Open(context.Background(), os.Getenv("TEST_DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(db.Close)
	cache := securityCache(t)
	email := service.Token() + "@example.test"
	subject := service.Token()
	t.Cleanup(func() {
		db.Exec(context.Background(), "DELETE FROM auth_identities WHERE user_id IN (SELECT id FROM users WHERE email=$1)", email)
		db.Exec(context.Background(), "DELETE FROM users WHERE email=$1", email)
	})
	original := http.DefaultClient
	calls := 0
	http.DefaultClient = &http.Client{Transport: securityOAuthTransport(func(req *http.Request) (*http.Response, error) {
		calls++
		body := `{"access_token":"mock"}`
		if req.URL.Host == "openidconnect.googleapis.com" {
			body = `{"sub":"` + subject + `","email":"` + email + `","name":"QA","email_verified":true}`
		} else if req.URL.Host != "oauth2.googleapis.com" {
			return nil, errors.New("unexpected outbound URL")
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(body)), Header: make(http.Header)}, nil
	})}
	t.Cleanup(func() { http.DefaultClient = original })
	r := (&Server{Service: &service.Service{DB: db}, Redis: cache, GoogleClientID: "qa", GoogleClientSecret: "qa", WebOrigin: "https://river.test", CookieSecure: true}).Router()
	start := httptest.NewRecorder()
	r.ServeHTTP(start, httptest.NewRequest("GET", "https://river.test/api/v1/auth/google/start", nil))
	u, _ := url.Parse(start.Header().Get("Location"))
	state := u.Query().Get("state")
	var binding *http.Cookie
	for _, c := range start.Result().Cookies() {
		if c.Name == "riverlife_oauth" {
			binding = c
		}
	}
	if binding == nil || !binding.HttpOnly || !binding.Secure || binding.SameSite != http.SameSiteLaxMode {
		t.Fatal("invalid OAuth binding cookie")
	}
	callback := func(cookie *http.Cookie) *httptest.ResponseRecorder {
		req := httptest.NewRequest("GET", "https://river.test/api/v1/auth/google/callback?state="+state+"&code=mock", nil)
		if cookie != nil {
			req.AddCookie(cookie)
		}
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}
	callback(&http.Cookie{Name: "riverlife_oauth", Value: "wrong-browser"})
	if calls != 0 {
		t.Fatal("foreign browser reached provider")
	}
	w := callback(binding)
	var session *http.Cookie
	for _, c := range w.Result().Cookies() {
		if c.Name == userCookie {
			session = c
		}
	}
	if session == nil || calls != 2 {
		t.Fatalf("valid login failed: %d calls=%d", w.Code, calls)
	}
	// The default return path remains within this application's origin.
	if w.Header().Get("Location") != "https://river.test/orders" {
		t.Fatal("unsafe return path", w.Header().Get("Location"))
	}
	req := httptest.NewRequest("GET", "https://river.test/api/v1/auth/me", nil)
	req.AddCookie(session)
	me := httptest.NewRecorder()
	r.ServeHTTP(me, req)
	if !strings.Contains(me.Body.String(), email) {
		t.Fatal("wrong logged in user")
	}
	callback(binding)
	if calls != 2 {
		t.Fatal("OAuth state replay reached provider")
	}
	cache.Del(context.Background(), "riverlife:user-session:"+service.Hash(session.Value))
}
