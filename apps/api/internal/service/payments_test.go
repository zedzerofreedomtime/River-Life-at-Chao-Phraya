package service

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	stripe "github.com/stripe/stripe-go/v85"
	"riverlife/api/internal/repository"
)

type fakeCheckout struct {
	session *stripe.CheckoutSession
	creates int
}

func (f *fakeCheckout) Create(_ context.Context, params *stripe.CheckoutSessionCreateParams) (*stripe.CheckoutSession, error) {
	f.creates++
	f.session.ClientReferenceID = *params.ClientReferenceID
	f.session.Metadata = params.Metadata
	f.session.ExpiresAt = *params.ExpiresAt
	f.session.AmountTotal = *params.LineItems[0].PriceData.UnitAmount * *params.LineItems[0].Quantity
	return f.session, nil
}
func (f *fakeCheckout) Retrieve(context.Context, string, *stripe.CheckoutSessionRetrieveParams) (*stripe.CheckoutSession, error) {
	return f.session, nil
}

func TestStripePaymentLifecycle(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	ctx := context.Background()
	db, err := repository.Open(ctx, os.Getenv("TEST_DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	s := &Service{DB: db}
	zone := "stripe-test-" + Token()[:12]
	if _, err = db.Exec(ctx, "INSERT INTO zones(id,name,capacity,price) VALUES($1,'Stripe test',2,12300)", zone); err != nil {
		t.Fatal(err)
	}
	defer func() {
		for _, table := range []string{"audit_log", "tickets", "stripe_checkouts"} {
			_, _ = db.Exec(ctx, "DELETE FROM "+table+" WHERE booking_id IN (SELECT id FROM bookings WHERE zone_id=$1)", zone)
		}
		_, _ = db.Exec(ctx, "DELETE FROM bookings WHERE zone_id=$1", zone)
		_, _ = db.Exec(ctx, "DELETE FROM zones WHERE id=$1", zone)
	}()
	token := Token()
	b, err := s.Create(ctx, Input{ZoneID: zone, Name: "Test", Email: "test@example.com", Quantity: 2}, Token(), token)
	if err != nil {
		t.Fatal(err)
	}
	fake := &fakeCheckout{session: &stripe.CheckoutSession{ID: "cs_test_" + b.ID, URL: "https://checkout.stripe.com/test", Status: stripe.CheckoutSessionStatusOpen, Currency: stripe.CurrencyTHB}}
	p := &Payments{Bookings: s, Client: fake, WebOrigin: "http://localhost:3000"}
	if _, err = p.Checkout(ctx, b.ID, Token(), false, "en"); err == nil {
		t.Fatal("unauthorized checkout accepted")
	}
	result, err := p.Checkout(ctx, b.ID, token, true, "en")
	if err != nil {
		t.Fatal(err)
	}
	if time.Until(result.ExpiresAt) < 30*time.Minute {
		t.Fatal("checkout expires too soon")
	}
	if _, err = p.Checkout(ctx, b.ID, token, true, "en"); err != nil {
		t.Fatal(err)
	}
	if fake.creates != 1 {
		t.Fatal("duplicate Stripe session")
	}
	if err = s.SubmitAttachment(ctx, b.ID, token, "test.jpg", false, "en"); !errors.Is(err, ErrConflict) {
		t.Fatal("receipt bypasses Stripe")
	}
	updated, err := p.Sync(ctx, b.ID, token)
	if err != nil || updated.Status != "held" || len(updated.Tickets) != 0 {
		t.Fatal("unpaid session issued tickets")
	}
	if updated.MarketingConsentAt == nil || updated.MarketingConsentLanguage != "en" {
		t.Fatal("consent not persisted")
	}
	fake.session.PaymentStatus = stripe.CheckoutSessionPaymentStatusPaid
	fake.session.AmountTotal++
	if _, err = p.Sync(ctx, b.ID, token); err == nil {
		t.Fatal("incorrect amount accepted")
	}
	fake.session.AmountTotal--
	fake.session.Livemode = true
	if _, err = p.Sync(ctx, b.ID, token); err == nil {
		t.Fatal("live session accepted")
	}
	fake.session.Livemode = false
	updated, err = p.Sync(ctx, b.ID, token)
	if err != nil || updated.Status != "confirmed" || len(updated.Tickets) != 2 {
		t.Fatalf("confirmation failed: %v %+v", err, updated)
	}
	updated, err = p.Sync(ctx, b.ID, token)
	if err != nil || len(updated.Tickets) != 2 {
		t.Fatal("repeat confirmation duplicated tickets")
	}
	if err = p.SyncSession(ctx, "cs_test_unrelated"); err != nil {
		t.Fatal("unrelated event rejected")
	}
}
