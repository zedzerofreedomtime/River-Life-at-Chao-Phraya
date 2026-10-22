package server

import (
	"github.com/redis/go-redis/v9"
	"riverlife/api/internal/service"
)

type Server struct {
	Service             *service.Service
	Redis               *redis.Client
	UploadDir           string
	AdminPassword       string
	CookieSecure        bool
	Demo                bool
	WebOrigin           string
	GoogleClientID      string
	GoogleClientSecret  string
	Payments            *service.Payments
	StripeWebhookSecret string
	OTPMailer           service.OTPMailer
	DemoOTP             bool
	BookingEmailEnabled bool
}
