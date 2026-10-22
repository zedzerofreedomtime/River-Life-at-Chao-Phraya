package server

import (
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"os"
	"riverlife/api/internal/repository"
	"riverlife/api/internal/service"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

type capturedOTP struct {
	recipient, code string
	fail            bool
}

func (m *capturedOTP) SendOTP(_ context.Context, recipient, code string) error {
	if m.fail {
		return errors.New("mail delivery failed")
	}
	m.recipient, m.code = recipient, code
	return nil
}

func TestEmailOTP(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" || os.Getenv("TEST_REDIS_URL") == "" {
		t.Skip("isolated PostgreSQL and Redis required")
	}
	ctx := context.Background()
	db, err := repository.Open(ctx, os.Getenv("TEST_DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	opts, err := redis.ParseURL(os.Getenv("TEST_REDIS_URL"))
	if err != nil {
		t.Fatal(err)
	}
	cache := redis.NewClient(opts)
	defer cache.Close()
	mailer := &capturedOTP{}
	app := &Server{Service: &service.Service{DB: db}, Redis: cache, Demo: true, OTPMailer: mailer}
	router := app.Router()
	email := service.Token() + "@example.test"
	key := "riverlife:otp:" + service.Hash(email)
	defer cache.Del(ctx, key, key+":cooldown")
	defer func() {
		_, _ = db.Exec(ctx, "DELETE FROM auth_identities WHERE user_id IN (SELECT id FROM users WHERE email=$1)", email)
		_, _ = db.Exec(ctx, "DELETE FROM users WHERE email=$1", email)
	}()
	count := 0
	request := func(path, body string) *httptest.ResponseRecorder {
		count++
		r := httptest.NewRequest("POST", "/api/v1/auth/signup/"+path, strings.NewReader(body))
		r.Header.Set("Content-Type", "application/json")
		r.RemoteAddr = "192.0.2." + strconv.Itoa(count) + ":1234"
		w := httptest.NewRecorder()
		router.ServeHTTP(w, r)
		return w
	}
	body := `{"name":"Email Test","email":"` + email + `","password":"EmailTest!2026"}`
	app.OTPMailer = nil
	if w := request("request", body); w.Code != 503 {
		t.Fatalf("missing config: %d", w.Code)
	}
	if cache.Exists(ctx, key).Val() != 0 {
		t.Fatal("missing config created usable challenge")
	}
	app.OTPMailer = mailer
	mailer.fail = true
	if w := request("request", body); w.Code != 503 {
		t.Fatalf("delivery error: %d", w.Code)
	}
	if cache.Exists(ctx, key, key+":cooldown").Val() != 0 {
		t.Fatal("failed mail left challenge or cooldown")
	}
	mailer.fail = false
	w := request("request", body)
	if w.Code != 202 || mailer.recipient != email || len(mailer.code) != 6 {
		t.Fatalf("mail not delivered: %d", w.Code)
	}
	if strings.Contains(w.Body.String(), "demo_code") || strings.Contains(w.Body.String(), mailer.code) {
		t.Fatal("API leaked OTP")
	}
	if ttl := cache.TTL(ctx, key).Val(); ttl <= 9*time.Minute || ttl > 10*time.Minute {
		t.Fatal("wrong expiry")
	}
	if w = request("request", body); w.Code != 429 {
		t.Fatalf("cooldown: %d", w.Code)
	}
	verify := func(code string) *httptest.ResponseRecorder {
		return request("verify", `{"email":"`+email+`","code":"`+code+`"}`)
	}
	wrong := "000000"
	if mailer.code == wrong {
		wrong = "111111"
	}
	if w = verify(wrong); w.Code != 401 {
		t.Fatalf("wrong code: %d", w.Code)
	}
	old := mailer.code
	_ = cache.Del(ctx, key+":cooldown").Err()
	if w = request("request", body); w.Code != 202 {
		t.Fatalf("resend: %d", w.Code)
	}
	if mailer.code != old && verify(old).Code != 401 {
		t.Fatal("old OTP valid after resend")
	}
	// Competing verification requests must consume the challenge exactly once.
	var challenge otpChallenge
	raw, _ := cache.Get(ctx, key).Bytes()
	_ = json.Unmarshal(raw, &challenge)
	if challenge.CodeHash != service.Hash(mailer.code) {
		t.Fatal("challenge not hashed")
	}
	var wg sync.WaitGroup
	statuses := make(chan int, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r := httptest.NewRequest("POST", "/api/v1/auth/signup/verify", strings.NewReader(`{"email":"`+email+`","code":"`+mailer.code+`"}`))
			r.Header.Set("Content-Type", "application/json")
			r.RemoteAddr = "198.51.100.2:1234"
			w := httptest.NewRecorder()
			router.ServeHTTP(w, r)
			statuses <- w.Code
		}()
	}
	wg.Wait()
	close(statuses)
	success, denied := 0, 0
	for status := range statuses {
		if status == 200 {
			success++
		} else if status == 401 {
			denied++
		} else {
			t.Fatalf("verification: %d", status)
		}
	}
	if success != 1 || denied != 1 {
		t.Fatal("OTP was not single use")
	}
	if verify(mailer.code).Code != 401 {
		t.Fatal("OTP reuse accepted")
	}
	if w = request("request", body); w.Code != 429 {
		t.Fatal("cooldown unexpectedly cleared")
	}
	_ = cache.Del(ctx, key+":cooldown").Err()
	if w = request("request", body); w.Code != 202 {
		t.Fatal("new request failed")
	}
	_ = cache.PExpire(ctx, key, time.Millisecond).Err()
	time.Sleep(5 * time.Millisecond)
	if verify(mailer.code).Code != 401 {
		t.Fatal("expired OTP accepted")
	}
}
