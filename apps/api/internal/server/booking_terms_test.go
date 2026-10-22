package server

import (
	"context"
	"github.com/redis/go-redis/v9"
	"net/http/httptest"
	"net/url"
	"os"
	"riverlife/api/internal/service"
	"strings"
	"testing"
)

func TestPaymentRequiresBookingTerms(t *testing.T) {
	if os.Getenv("TEST_REDIS_URL") == "" {
		t.Skip("isolated Redis required")
	}
	opts, err := redis.ParseURL(os.Getenv("TEST_REDIS_URL"))
	if err != nil {
		t.Fatal(err)
	}
	cache := redis.NewClient(opts)
	defer cache.Close()
	for _, stripeEnabled := range []bool{false, true} {
		app := &Server{Redis: cache, Demo: true}
		if stripeEnabled {
			app.Payments = &service.Payments{}
		}
		router := app.Router()
		for _, in := range []struct{ accepted, version string }{{"", ""}, {"false", "booking-terms-v1"}, {"true", "old-version"}} {
			var body, path, contentType string
			if stripeEnabled {
				accepted := in.accepted
				if accepted == "" {
					accepted = "false"
				}
				body = `{"language":"en","marketing_consent":true,"booking_terms_accepted":` + accepted + `,"booking_terms_version":"` + in.version + `"}`
				path = "checkout"
				contentType = "application/json"
			} else {
				body = url.Values{"booking_terms_accepted": {in.accepted}, "booking_terms_version": {in.version}, "marketing_consent": {"true"}}.Encode()
				path = "attachment"
				contentType = "application/x-www-form-urlencoded"
			}
			r := httptest.NewRequest("POST", "/api/v1/bookings/missing/"+path, strings.NewReader(body))
			r.Header.Set("Content-Type", contentType)
			r.RemoteAddr = "203.0.113.41:1234"
			w := httptest.NewRecorder()
			router.ServeHTTP(w, r)
			if w.Code != 400 || !strings.Contains(w.Body.String(), "กรุณายอมรับเงื่อนไข") {
				t.Fatalf("missing or obsolete terms accepted: %d", w.Code)
			}
		}
	}
	_ = cache.Del(context.Background(), "riverlife:rate:/api/v1/bookings/:id/checkout:"+service.Hash("203.0.113.41"), "riverlife:rate:/api/v1/bookings/:id/attachment:"+service.Hash("203.0.113.41")).Err()
}

func TestLiveAttachmentBlockedBeforeFileProcessing(t *testing.T) {
	if os.Getenv("TEST_REDIS_URL") == "" {
		t.Skip("isolated Redis required")
	}
	opts, err := redis.ParseURL(os.Getenv("TEST_REDIS_URL"))
	if err != nil {
		t.Fatal(err)
	}
	cache := redis.NewClient(opts)
	defer cache.Close()
	// No DB or upload directory: a live upload must be rejected before either is used.
	app := &Server{Redis: cache}
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/api/v1/bookings/test/attachment", nil)
	r.RemoteAddr = "203.0.113.42:1234"
	app.Router().ServeHTTP(w, r)
	if w.Code != 409 || !strings.Contains(w.Body.String(), "demo-only") {
		t.Fatalf("unexpected response %d %s", w.Code, w.Body.String())
	}
}
