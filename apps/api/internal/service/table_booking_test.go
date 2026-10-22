package service

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	stripe "github.com/stripe/stripe-go/v85"
	"net/url"
	"os"
	"riverlife/api/internal/repository"
	"sync"
	"testing"
	"time"
)

func TestNormalizeTableInput(t *testing.T) {
	for _, tc := range []struct {
		ids    []string
		guests int
		valid  bool
	}{
		{[]string{"U03", "U01"}, 5, true}, {[]string{"L01"}, 1, true},
		{[]string{"U01", "U01"}, 4, false}, {[]string{"U01", "L01"}, 4, false},
		{[]string{"U06"}, 1, false}, {[]string{"U99"}, 1, false},
		{[]string{"U01"}, 5, false}, {[]string{"U01"}, 0, false},
	} {
		got, err := normalizeTableInput(Input{TableIDs: tc.ids, GuestCount: tc.guests, Quantity: 999, ZoneID: "spoof"})
		if (err == nil) != tc.valid {
			t.Fatalf("%+v: %v", tc, err)
		}
		if tc.valid && (got.Quantity != 4*len(tc.ids) || got.ZoneID == "spoof") {
			t.Fatal("browser price/quantity source trusted")
		}
	}
}

func isolatedTableService(t *testing.T) *Service {
	t.Helper()
	connectionURL := os.Getenv("TEST_DATABASE_URL")
	if connectionURL == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, connectionURL)
	if err != nil {
		t.Fatal(err)
	}
	schema := "table_test_" + Token()[:12]
	quoted := pgx.Identifier{schema}.Sanitize()
	if _, err = admin.Exec(ctx, "CREATE SCHEMA "+quoted); err != nil {
		admin.Close()
		t.Fatal(err)
	}
	scopedURL, err := url.Parse(connectionURL)
	if err != nil {
		t.Fatal(err)
	}
	query := scopedURL.Query()
	query.Set("search_path", schema)
	scopedURL.RawQuery = query.Encode()
	db, err := repository.Open(ctx, scopedURL.String())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close(); _, _ = admin.Exec(ctx, "DROP SCHEMA "+quoted+" CASCADE"); admin.Close() })
	if _, err = db.Exec(ctx, "INSERT INTO zones(id,name,capacity,price) VALUES('A','Demo upper',100,12300),('C','Demo lower',100,8900)"); err != nil {
		t.Fatal(err)
	}
	return &Service{DB: db, TableBookingDemo: true}
}

func TestTableReservationConcurrencyAndLatePayment(t *testing.T) {
	s := isolatedTableService(t)
	ctx := context.Background()
	in := Input{Name: "Table QA", Email: "table-qa@example.test", TableIDs: []string{"U01"}, GuestCount: 3, ExpectedTotal: 49200}
	type result struct {
		booking    Booking
		token, key string
		err        error
	}
	results := make(chan result, 12)
	var wg sync.WaitGroup
	for i := 0; i < 12; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			token, key := Token(), Token()
			b, err := s.Create(ctx, in, key, token)
			results <- result{b, token, key, err}
		}()
	}
	wg.Wait()
	close(results)
	count := 0
	var winner result
	for r := range results {
		if r.err == nil {
			count++
			winner = r
		} else if !errors.Is(r.err, ErrConflict) {
			t.Fatal(r.err)
		}
	}
	if count != 1 {
		t.Fatalf("same table sold %d times", count)
	}
	if winner.booking.Quantity != 4 || winner.booking.Total != 49200 || winner.booking.GuestCount != 3 {
		t.Fatal("whole-table totals wrong")
	}
	again, err := s.Create(ctx, in, winner.key, winner.token)
	if err != nil || again.ID != winner.booking.ID {
		t.Fatal("idempotency failed", err)
	}
	fake := &fakeCheckout{session: &stripe.CheckoutSession{ID: "cs_table_" + winner.booking.ID, URL: "https://checkout.stripe.com/test", Status: stripe.CheckoutSessionStatusOpen, Currency: stripe.CurrencyTHB}}
	payment := &Payments{Bookings: s, Client: fake, WebOrigin: "http://localhost:3000"}
	if _, err = payment.Checkout(ctx, winner.booking.ID, winner.token, false, "en"); err != nil {
		t.Fatal(err)
	}
	if _, err = s.DB.Exec(ctx, "UPDATE bookings SET expires_at=now()-interval '1 minute' WHERE id=$1", winner.booking.ID); err != nil {
		t.Fatal(err)
	}
	replacement, err := s.Create(ctx, in, Token(), Token())
	if err != nil {
		t.Fatal(err)
	}
	fake.session.PaymentStatus = stripe.CheckoutSessionPaymentStatusPaid
	if err = payment.SyncSession(ctx, fake.session.ID); !errors.Is(err, ErrConflict) {
		t.Fatal("late payment stole an occupied table", err)
	}
	var status string
	if err = s.DB.QueryRow(ctx, "SELECT status FROM bookings WHERE id=$1", replacement.ID).Scan(&status); err != nil || status != "held" {
		t.Fatal("replacement reservation changed")
	}
	options, err := s.TableOptions(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if options[0].Status != "held" {
		t.Fatal("catalogue failed to reflect hold")
	}
}

func TestTableStripeTicketsAndPersistence(t *testing.T) {
	s := isolatedTableService(t)
	ctx := context.Background()
	token := Token()
	input := Input{Name: "Table QA", Email: "table-qa@example.test", TableIDs: []string{"U02", "U03", "U04"}, GuestCount: 9, ExpectedTotal: 147600}
	spoof := input
	spoof.ExpectedTotal = 1
	if _, err := s.Create(ctx, spoof, Token(), Token()); !errors.Is(err, ErrConflict) {
		t.Fatal("price change/tampering accepted", err)
	}
	b, err := s.Create(ctx, input, Token(), token)
	if err != nil {
		t.Fatal(err)
	}
	if b.Quantity != 12 || b.Total != 147600 {
		t.Fatal("three table price/quantity incorrect")
	}
	fake := &fakeCheckout{session: &stripe.CheckoutSession{ID: "cs_table_" + b.ID, URL: "https://checkout.stripe.com/test", Status: stripe.CheckoutSessionStatusOpen, Currency: stripe.CurrencyTHB}}
	p := &Payments{Bookings: s, Client: fake, WebOrigin: "http://localhost:3000"}
	checkout, err := p.Checkout(ctx, b.ID, token, false, "en")
	if err != nil || time.Until(checkout.ExpiresAt) < 30*time.Minute {
		t.Fatal(err)
	}
	fake.session.PaymentStatus = stripe.CheckoutSessionPaymentStatusPaid
	updated, err := p.Sync(ctx, b.ID, token)
	if err != nil {
		t.Fatal(err)
	}
	if updated.Status != "confirmed" || len(updated.Tickets) != 12 || len(updated.TableIDs) != 3 || updated.GuestCount != 9 {
		t.Fatal("confirmed order lost details")
	}
	counts := map[string]int{}
	for _, ticket := range updated.Tickets {
		counts[ticket.TableID]++
	}
	for _, id := range input.TableIDs {
		if counts[id] != 4 {
			t.Fatal("ticket table assignment wrong", counts)
		}
	}
	updated, err = p.Sync(ctx, b.ID, token)
	if err != nil || len(updated.Tickets) != 12 {
		t.Fatal("duplicate payment duplicated tickets")
	}
	fetched, err := s.Get(ctx, b.ID, token, false)
	if err != nil || len(fetched.TableIDs) != 3 {
		t.Fatal("reload lost table IDs")
	}
	s.TableBookingDemo = false
	if _, err = s.Create(ctx, Input{TableIDs: []string{"L01"}, GuestCount: 1}, Token(), Token()); !errors.Is(err, ErrConflict) {
		t.Fatal("demo table booking allowed without flag")
	}
}
