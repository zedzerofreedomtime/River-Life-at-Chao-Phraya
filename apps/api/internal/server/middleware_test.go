package server

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"riverlife/api/internal/service"
)

func TestRateLimitMiddleware(t *testing.T) {
	url := os.Getenv("TEST_REDIS_URL")
	if url == "" {
		t.Skip("TEST_REDIS_URL required")
	}
	options, err := redis.ParseURL(url)
	if err != nil {
		t.Fatal(err)
	}
	cache := redis.NewClient(options)
	defer cache.Close()
	app := Server{Redis: cache}
	router := gin.New()
	_ = router.SetTrustedProxies(nil)
	path := "/rate-test-" + service.Token()
	router.GET(path, app.limiter(2), func(c *gin.Context) { c.Status(http.StatusNoContent) })
	key := "riverlife:rate:" + path + ":" + service.Hash("192.0.2.1")
	defer cache.Del(context.Background(), key)
	for _, want := range []int{204, 204, 429} {
		w := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodGet, path, nil)
		request.RemoteAddr = "192.0.2.1:1234"
		router.ServeHTTP(w, request)
		if w.Code != want {
			t.Fatalf("got %d, want %d", w.Code, want)
		}
		if want == 429 {
			assertErrorResponse(t, w, want, "ทำรายการถี่เกินไป กรุณารอ 1 นาที")
			if w.Header().Get("Retry-After") != "60" {
				t.Fatal("missing retry header")
			}
		}
	}
	if ttl := cache.TTL(context.Background(), key).Val(); ttl <= 0 {
		t.Fatalf("rate key has no expiry: %v", ttl)
	}
}
