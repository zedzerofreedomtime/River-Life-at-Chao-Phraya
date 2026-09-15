package main

import (
	"context"
	"github.com/redis/go-redis/v9"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"riverlife/api/internal/repository"
	"riverlife/api/internal/server"
	"riverlife/api/internal/service"
	"syscall"
	"time"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	password := os.Getenv("ADMIN_PASSWORD")
	if len(password) < 16 {
		slog.Error("ADMIN_PASSWORD must be at least 16 characters")
		os.Exit(1)
	}
	db, err := repository.Open(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		slog.Error("database startup failed")
		os.Exit(1)
	}
	defer db.Close()
	opt, err := redis.ParseURL(os.Getenv("REDIS_URL"))
	if err != nil {
		slog.Error("invalid REDIS_URL")
		os.Exit(1)
	}
	cache := redis.NewClient(opt)
	defer cache.Close()
	dir := os.Getenv("UPLOAD_DIR")
	if dir == "" {
		dir = "uploads"
	}
	if err = os.MkdirAll(dir, 0700); err != nil {
		slog.Error("upload directory unavailable")
		os.Exit(1)
	}
	demo := os.Getenv("DEMO_MODE") == "true"
	if demo {
		_, err = db.Exec(ctx, "INSERT INTO zones(id,name,capacity,price) VALUES('A','หัวเรือ',100,180000),('B','ท้ายเรือ',150,150000),('C','ชั้นล่าง',100,120000) ON CONFLICT DO NOTHING")
		if err != nil {
			slog.Error("demo seed failed")
			os.Exit(1)
		}
	}
	bookingService := &service.Service{DB: db}
	if err = bookingService.AutoConfirmReviews(ctx); err != nil {
		slog.Error("automatic confirmation migration failed")
		os.Exit(1)
	}
	app := &server.Server{Service: bookingService, Redis: cache, AdminPassword: password, UploadDir: dir, Demo: demo, SlipAI: &service.SlipAI{APIKey: os.Getenv("OPENAI_API_KEY"), Model: os.Getenv("OPENAI_SLIP_MODEL")}}
	srv := &http.Server{Addr: ":8080", Handler: app.Router(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 20 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("HTTP server failed")
			stop()
		}
	}()
	<-ctx.Done()
	shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdown)
}
