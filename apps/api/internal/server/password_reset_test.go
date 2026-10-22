package server

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/redis/go-redis/v9"
	"net/http"
	"net/http/httptest"
	"os"
	"riverlife/api/internal/repository"
	"riverlife/api/internal/service"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestPasswordResetLifecycle(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" || os.Getenv("TEST_REDIS_URL") == "" {
		t.Skip("isolated PostgreSQL/Redis required")
	}
	ctx := context.Background()
	db, err := repository.Open(ctx, os.Getenv("TEST_DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	opts, _ := redis.ParseURL(os.Getenv("TEST_REDIS_URL"))
	cache := redis.NewClient(opts)
	defer cache.Close()
	svc := &service.Service{DB: db}
	mailer := &capturedOTP{}
	app := &Server{Service: svc, Redis: cache, OTPMailer: mailer}
	router := app.Router()
	email := service.Token() + "@example.test"
	password := "BeforeReset!2026"
	hash, _ := service.PasswordHash(password)
	user, err := svc.CreateMember(ctx, email, "Reset Customer", hash)
	if err != nil {
		t.Fatal(err)
	}
	key := resetKey(email)
	defer cache.Del(ctx, key, key+":cooldown", key+":attempts", key+":grant")
	defer db.Exec(ctx, "DELETE FROM users WHERE id=$1", user.ID)
	var seq atomic.Int32
	call := func(path string, data any, cookie *http.Cookie) *httptest.ResponseRecorder {
		raw, _ := json.Marshal(data)
		r := httptest.NewRequest("POST", "/api/v1/auth/"+path, strings.NewReader(string(raw)))
		r.Header.Set("Content-Type", "application/json")
		r.RemoteAddr = fmt.Sprintf("192.0.2.%d:1234", seq.Add(1))
		if cookie != nil {
			r.AddCookie(cookie)
		}
		w := httptest.NewRecorder()
		router.ServeHTTP(w, r)
		return w
	}
	login := call("login", map[string]string{"email": email, "password": password}, nil)
	if login.Code != 200 {
		t.Fatal("login failed")
	}
	oldCookie := login.Result().Cookies()[0]
	request := func() {
		t.Helper()
		w := call("password-reset/request", map[string]string{"email": email}, nil)
		if w.Code != 202 || strings.Contains(w.Body.String(), "demo_code") || len(mailer.code) != 6 {
			t.Fatalf("request: %d", w.Code)
		}
	}
	verify := func(code string) *httptest.ResponseRecorder {
		return call("password-reset/verify", map[string]string{"email": email, "code": code}, nil)
	}
	getGrant := func() string {
		t.Helper()
		w := verify(mailer.code)
		if w.Code != 200 {
			t.Fatalf("verify: %d", w.Code)
		}
		var result struct {
			Token string `json:"reset_token"`
		}
		_ = json.Unmarshal(w.Body.Bytes(), &result)
		if len(result.Token) != 64 {
			t.Fatal("missing grant")
		}
		return result.Token
	}
	complete := func(token, password string) *httptest.ResponseRecorder {
		return call("password-reset/complete", map[string]string{"email": email, "reset_token": token, "password": password}, nil)
	}
	if complete(service.Token(), "AfterReset!2026").Code != 401 {
		t.Fatal("reset without OTP allowed")
	}
	request()
	if mailer.recipient != email {
		t.Fatal("wrong recipient")
	}
	if call("password-reset/request", map[string]string{"email": email}, nil).Code != 429 {
		t.Fatal("resend cooldown absent")
	}
	wrong := "000000"
	if mailer.code == wrong {
		wrong = "111111"
	}
	for i := 0; i < 5; i++ {
		if verify(wrong).Code != 401 {
			t.Fatal("wrong code accepted")
		}
	}
	if verify(mailer.code).Code != 401 {
		t.Fatal("guess limit not enforced")
	}
	_ = cache.Del(ctx, key+":cooldown").Err()
	request()
	token := getGrant()
	if verify(mailer.code).Code != 401 {
		t.Fatal("OTP reusable")
	}
	if complete(token, "short").Code != 400 {
		t.Fatal("weak password accepted")
	}
	// New OTP invalidates a previously verified grant.
	_ = cache.Del(ctx, key+":cooldown").Err()
	request()
	if complete(token, "AfterReset!2026").Code != 401 {
		t.Fatal("old grant survived resend")
	}
	token = getGrant()
	_ = cache.PExpire(ctx, key+":grant", time.Millisecond).Err()
	time.Sleep(5 * time.Millisecond)
	if complete(token, "AfterReset!2026").Code != 401 {
		t.Fatal("expired grant accepted")
	}
	_ = cache.Del(ctx, key+":cooldown").Err()
	request()
	_ = cache.PExpire(ctx, key, time.Millisecond).Err()
	time.Sleep(5 * time.Millisecond)
	if verify(mailer.code).Code != 401 {
		t.Fatal("expired OTP accepted")
	}
	_ = cache.Del(ctx, key+":cooldown").Err()
	request()
	token = getGrant()
	var wg sync.WaitGroup
	results := make(chan int, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); results <- complete(token, "AfterReset!2026").Code }()
	}
	wg.Wait()
	close(results)
	success, denied := 0, 0
	for status := range results {
		if status == 200 {
			success++
		} else if status == 401 {
			denied++
		} else {
			t.Fatalf("complete: %d", status)
		}
	}
	if success != 1 || denied != 1 {
		t.Fatal("reset grant not single use")
	}
	if _, err = svc.AuthenticateEmailPassword(ctx, email, password); err == nil {
		t.Fatal("old password still valid")
	}
	updated, err := svc.AuthenticateEmailPassword(ctx, email, "AfterReset!2026")
	if err != nil || updated.ID != user.ID || updated.Role != user.Role {
		t.Fatal("new password or preserved identity failed")
	}
	r := httptest.NewRequest("GET", "/api/v1/auth/me", nil)
	r.AddCookie(oldCookie)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, r)
	if strings.Contains(w.Body.String(), `"authenticated":true`) {
		t.Fatal("old session survived reset")
	}
	if w = call("login", map[string]string{"email": email, "password": "AfterReset!2026"}, nil); w.Code != 200 {
		t.Fatal("new login failed")
	}
	// Unknown email response is identical, but no mail is sent.
	before := mailer.code
	w = call("password-reset/request", map[string]string{"email": service.Token() + "@example.test"}, nil)
	if w.Code != 202 || mailer.code != before || !strings.Contains(w.Body.String(), resetMessage) {
		t.Fatal("unknown email enumeration or unwanted delivery")
	}
}
