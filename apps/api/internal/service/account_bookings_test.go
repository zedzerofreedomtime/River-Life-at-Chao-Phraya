package service

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/jackc/pgx/v5"
	stripe "github.com/stripe/stripe-go/v85"
	"riverlife/api/internal/repository"
)

func TestAccountBookingOwnership(t *testing.T) {
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
	zone, owner, other := "account-test-"+Token()[:12], Token(), Token()
	for _, id := range []string{owner, other} {
		if _, err = db.Exec(ctx, "INSERT INTO users(id,email,name) VALUES($1,$2,'Test')", id, id+"@example.test"); err != nil {
			t.Fatal(err)
		}
	}
	if _, err = db.Exec(ctx, "INSERT INTO zones(id,name,capacity,price) VALUES($1,'Test',10,12300)", zone); err != nil {
		t.Fatal(err)
	}
	defer func() {
		for _, table := range []string{"audit_log", "tickets", "stripe_checkouts"} {
			_, _ = db.Exec(ctx, "DELETE FROM "+table+" WHERE booking_id IN (SELECT id FROM bookings WHERE zone_id=$1)", zone)
		}
		_, _ = db.Exec(ctx, "DELETE FROM bookings WHERE zone_id=$1", zone)
		_, _ = db.Exec(ctx, "DELETE FROM zones WHERE id=$1", zone)
		_, _ = db.Exec(ctx, "DELETE FROM users WHERE id IN ($1,$2)", owner, other)
	}()
	original, key := Token(), Token()
	in := Input{UserID: owner, ZoneID: zone, Name: "Test", Email: owner + "@example.test", Quantity: 1}
	b, err := s.Create(ctx, in, key, original)
	if err != nil {
		t.Fatal(err)
	}
	// Client JSON excludes UserID; ownership must still protect idempotent retries.
	in.UserID = other
	if _, err = s.Create(ctx, in, key, original); !errors.Is(err, ErrConflict) {
		t.Fatalf("cross-account retry: %v", err)
	}
	legacy, err := s.Create(ctx, Input{ZoneID: zone, Name: "Legacy", Email: in.Email, Quantity: 1}, Token(), Token())
	if err != nil {
		t.Fatal(err)
	}
	items, err := s.ListForUser(ctx, owner)
	if err != nil || len(items) != 1 || items[0].ID != b.ID {
		t.Fatalf("owner list: %+v %v", items, err)
	}
	items, err = s.ListForUser(ctx, other)
	if err != nil || len(items) != 0 {
		t.Fatal("another account sees bookings")
	}
	for _, id := range []string{b.ID, legacy.ID} {
		if _, _, err = s.AccountAccess(ctx, id, other); !errors.Is(err, pgx.ErrNoRows) {
			t.Fatalf("unauthorized access: %v", err)
		}
	}
	_, access, err := s.AccountAccess(ctx, b.ID, owner)
	if err != nil || len(access) != 64 {
		t.Fatalf("recover: %v", err)
	}
	if _, err = s.Get(ctx, b.ID, original, false); err != nil {
		t.Fatal("original private code was invalidated")
	}
	if _, err = s.Get(ctx, b.ID, access, false); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Get(ctx, b.ID, Token(), false); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal("random credential accepted")
	}
	fake := &fakeCheckout{session: &stripe.CheckoutSession{ID: "cs_test_" + b.ID, URL: "https://checkout.stripe.com/test", Status: stripe.CheckoutSessionStatusOpen, Currency: stripe.CurrencyTHB}}
	p := &Payments{Bookings: s, Client: fake, WebOrigin: "http://localhost:5173"}
	if _, err = p.Checkout(ctx, b.ID, access, false, "en"); err != nil {
		t.Fatalf("resume checkout: %v", err)
	}
	fake.session.PaymentStatus = stripe.CheckoutSessionPaymentStatusPaid
	paid, err := p.Sync(ctx, b.ID, access)
	if err != nil || paid.Status != "confirmed" || len(paid.Tickets) != 1 {
		t.Fatalf("account ticket: %+v %v", paid, err)
	}
	_, fresh, err := s.AccountAccess(ctx, b.ID, owner)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.Get(ctx, b.ID, fresh, false); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Get(ctx, b.ID, original, false); err != nil {
		t.Fatal("original credential no longer valid")
	}
}
