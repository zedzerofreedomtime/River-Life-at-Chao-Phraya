package server

import (
	"context"
	"github.com/redis/go-redis/v9"
	"net/http"
	"net/http/httptest"
	"os"
	"riverlife/api/internal/repository"
	"riverlife/api/internal/service"
	"strings"
	"testing"
	"time"
)

func TestStaffRolePermissions(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" || os.Getenv("TEST_REDIS_URL") == "" {
		t.Skip("isolated PostgreSQL and Redis required")
	}
	ctx := context.Background()
	db, err := repository.Open(ctx, os.Getenv("TEST_DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	options, err := redis.ParseURL(os.Getenv("TEST_REDIS_URL"))
	if err != nil {
		t.Fatal(err)
	}
	cache := redis.NewClient(options)
	defer cache.Close()
	app := &Server{Service: &service.Service{DB: db}, Redis: cache}
	router := app.Router()
	for _, role := range []string{"user", "sales", "operator", "admin"} {
		id, session := service.Token(), service.Token()
		key := "riverlife:user-session:" + service.Hash(session)
		if _, err = db.Exec(ctx, "INSERT INTO users(id,email,name,role) VALUES($1,$2,'Test',$3)", id, id+"@example.test", role); err != nil {
			t.Fatal(err)
		}
		defer db.Exec(ctx, "DELETE FROM users WHERE id=$1", id)
		if err = cache.Set(ctx, key, id, time.Minute).Err(); err != nil {
			t.Fatal(err)
		}
		defer cache.Del(ctx, key)
		for _, route := range []struct {
			method, path, body string
			allowed            bool
			code               int
		}{
			{"GET", "/api/v1/dashboard/admin", "", role == "admin", 200},
			{"GET", "/api/v1/dashboard/sales", "", role == "sales" || role == "admin", 200},
			{"GET", "/api/v1/dashboard/operator", "", role == "operator" || role == "admin", 200},
			{"GET", "/api/v1/dashboard/admin/users", "", role == "admin", 200},
			{"GET", "/api/v1/dashboard/admin/program", "", role == "admin", 200},
			{"GET", "/api/v1/admin/session", "", role == "admin", 204},
			{"GET", "/api/v1/admin/bookings", "", role == "admin", 200},
			{"POST", "/api/v1/dashboard/operator/check-in", `{"ticket":"` + service.Token() + `"}`, role == "operator" || role == "admin", 404},
			{"PATCH", "/api/v1/dashboard/admin/zones/missing", `{"name":"Test","capacity":10,"price":100}`, role == "admin", 404},
			{"PATCH", "/api/v1/dashboard/admin/users/missing/role", `{"role":"sales"}`, role == "admin", 404},
		} {
			t.Run(role+" "+route.method+" "+route.path, func(t *testing.T) {
				req := httptest.NewRequest(route.method, route.path, strings.NewReader(route.body))
				req.AddCookie(&http.Cookie{Name: userCookie, Value: session})
				req.Header.Set("Content-Type", "application/json")
				res := httptest.NewRecorder()
				router.ServeHTTP(res, req)
				want := 403
				if route.allowed {
					want = route.code
				}
				if res.Code != want {
					t.Fatalf("got %d want %d: %s", res.Code, want, res.Body.String())
				}
			})
		}
	}
	for _, path := range []string{"/api/v1/dashboard/sales", "/api/v1/dashboard/operator", "/api/v1/dashboard/admin/users"} {
		res := httptest.NewRecorder()
		router.ServeHTTP(res, httptest.NewRequest("GET", path, nil))
		if res.Code != 401 {
			t.Fatalf("anonymous %s: %d", path, res.Code)
		}
	}
}
