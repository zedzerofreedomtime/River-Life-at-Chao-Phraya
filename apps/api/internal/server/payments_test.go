package server

import (
	"bytes"
	"fmt"
	"net/http/httptest"
	"testing"

	stripe "github.com/stripe/stripe-go/v85"
	"github.com/stripe/stripe-go/v85/webhook"
	"riverlife/api/internal/service"
)

func TestStripeWebhookSignature(t *testing.T) {
	secret := "whsec_local_test_only"
	app := &Server{Payments: &service.Payments{}, StripeWebhookSecret: secret}
	router := app.Router()
	payload := []byte(fmt.Sprintf(`{"id":"evt_test","object":"event","api_version":%q,"type":"customer.created","livemode":false,"data":{"object":{}}}`, stripe.APIVersion))
	signed := webhook.GenerateTestSignedPayload(&webhook.UnsignedPayload{Payload: payload, Secret: secret})
	for _, tc := range []struct {
		name, signature string
		payload         []byte
		status          int
	}{
		{"valid", signed.Header, payload, 200},
		{"missing", "", payload, 400},
		{"tampered", signed.Header, append(payload, ' '), 400},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/api/v1/payments/stripe/webhook", bytes.NewReader(tc.payload))
			req.Header.Set("Stripe-Signature", tc.signature)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			if w.Code != tc.status {
				t.Fatalf("status %d, want %d", w.Code, tc.status)
			}
		})
	}
}
