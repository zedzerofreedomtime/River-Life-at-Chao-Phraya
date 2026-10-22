package main

import (
	"context"
	"github.com/redis/go-redis/v9"
	stripe "github.com/stripe/stripe-go/v85"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"riverlife/api/internal/repository"
	"riverlife/api/internal/server"
	"riverlife/api/internal/service"
	"strings"
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
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "/data/uploads"
	}
	if err = os.MkdirAll(uploadDir, 0o750); err != nil {
		slog.Error("attachment directory startup failed")
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
	bookingService := &service.Service{DB: db, TableBookingDemo: demo, DemoConfirmation: demo}
	if err = bookingService.AutoConfirmReviews(ctx); err != nil {
		slog.Error("automatic confirmation migration failed")
		os.Exit(1)
	}
	webOrigin := os.Getenv("WEB_ORIGIN")
	if webOrigin == "" {
		webOrigin = "http://localhost:3000"
	}
	app := &server.Server{Service: bookingService, Redis: cache, UploadDir: uploadDir, AdminPassword: password, CookieSecure: os.Getenv("COOKIE_SECURE") == "true", Demo: demo, WebOrigin: webOrigin, GoogleClientID: os.Getenv("GOOGLE_CLIENT_ID"), GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET")}
	mode := os.Getenv("OTP_DELIVERY_MODE")
	if mode == "" {
		mode = "smtp"
	}
	var smtpMailer *service.SMTPMailer
	if os.Getenv("SMTP_HOST") != "" {
		port, tlsMode := os.Getenv("SMTP_PORT"), os.Getenv("SMTP_TLS_MODE")
		if port == "" {
			port = "587"
		}
		if tlsMode == "" {
			tlsMode = "starttls"
		}
		mailer := service.SMTPMailer{Host: os.Getenv("SMTP_HOST"), Port: port, TLSMode: tlsMode, Username: os.Getenv("SMTP_USERNAME"), Password: os.Getenv("SMTP_PASSWORD"), From: os.Getenv("SMTP_FROM")}
		if err = mailer.Validate(); err != nil {
			slog.Error("invalid SMTP configuration; check SMTP environment variables")
			os.Exit(1)
		}
		smtpMailer = &mailer
	}
	app.BookingEmailEnabled, err = bookingEmailEnabled(os.Getenv("BOOKING_EMAIL_MODE"), smtpMailer != nil)
	if err != nil {
		slog.Error("BOOKING_EMAIL_MODE must be smtp or disabled")
		os.Exit(1)
	}
	switch mode {
	case "smtp":
		if smtpMailer != nil {
			app.OTPMailer = *smtpMailer
		} else {
			slog.Warn("SMTP is not configured; email signup is disabled")
		}
	case "demo":
		if !demo {
			slog.Error("demo OTP delivery requires DEMO_MODE=true")
			os.Exit(1)
		}
		app.DemoOTP = true
		slog.Warn("demo OTP delivery enabled; OTP emails will not be sent")
	default:
		slog.Error("OTP_DELIVERY_MODE must be smtp or demo")
		os.Exit(1)
	}
	if key := os.Getenv("STRIPE_SECRET_KEY"); key != "" {
		if !demo || !strings.HasPrefix(key, "sk_test_") {
			slog.Error("Stripe integration currently supports demo mode and test keys only")
			os.Exit(1)
		}
		client := stripe.NewClient(key)
		app.Payments = &service.Payments{Bookings: bookingService, Client: client.V1CheckoutSessions, WebOrigin: webOrigin}
		app.StripeWebhookSecret = os.Getenv("STRIPE_WEBHOOK_SECRET")
	}
	if app.BookingEmailEnabled {
		go service.RunBookingEmails(ctx, db, *smtpMailer, demo)
	} else {
		slog.Warn("booking email delivery disabled; queued messages will wait for SMTP configuration")
	}
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
