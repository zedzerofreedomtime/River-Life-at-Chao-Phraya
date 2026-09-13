package server

import (
	"context"
	"github.com/redis/go-redis/v9"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func TestUnauthorizedAdmin(t *testing.T) {
	url := os.Getenv("TEST_REDIS_URL")
	if url == "" {
		t.Skip("TEST_REDIS_URL required")
	}
	opt, _ := redis.ParseURL(url)
	cache := redis.NewClient(opt)
	defer cache.Close()
	s := Server{Redis: cache}
	r := s.Router()
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/bookings", nil)
	r.ServeHTTP(w, req)
	if w.Code != 401 {
		t.Fatalf("expected 401 got %d", w.Code)
	}
	key := "riverlife:test:ttl"
	defer cache.Del(context.Background(), key)
	n, err := limitScript.Run(context.Background(), cache, []string{key}).Int()
	if err != nil || n != 1 {
		t.Fatal(err)
	}
	ttl := cache.TTL(context.Background(), key).Val()
	if ttl <= 0 {
		t.Fatal("rate limit has no expiry")
	}
}
