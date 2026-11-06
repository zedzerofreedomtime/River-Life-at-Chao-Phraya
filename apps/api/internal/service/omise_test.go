package service

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"
)

func testOmiseCharge() OmiseCharge {
	c := OmiseCharge{ID: "chrg_test_fixture", Status: "pending", Amount: 480000, Currency: "thb", Metadata: map[string]string{"reservation_id": "reservation"}}
	c.Source.Type = "promptpay"
	c.Source.ScannableCode.Image.DownloadURI = "https://api.omise.co/charges/" + c.ID + "/documents/docu_test/downloads/test"
	return c
}

// Explicit opt-in, disposable database, real merchant test key. Complete the
// charge in the Omise test dashboard while this test waits. No real funds.
func TestOmiseSandboxRoundtrip(t *testing.T) {
	if os.Getenv("RUN_OMISE_SANDBOX") != "1" {
		t.Skip("explicit sandbox opt-in required")
	}
	s := isolatedTableService(t)
	ctx := context.Background()
	_, err := s.DB.Exec(ctx, `INSERT INTO users(id,email,role) VALUES('staff','qa-staff@example.test','admin'),('member','qa-member@example.test','user')`)
	if err != nil {
		t.Fatal(err)
	}
	departure := time.Now().Add(48 * time.Hour)
	boarding := departure.Add(-time.Hour)
	sailing, err := s.SaveSailing(ctx, Sailing{VesselID: "unicorn", Title: "Omise sandbox QA only", Status: "published", Verified: true, Departure: &departure, Boarding: &boarding, Pier: "QA only", Tables: []SailingTable{{ID: "QA1", Deck: "upper", Seats: 1, Price: 2000, X: 280, Y: 150}}}, "staff")
	if err != nil {
		t.Fatal(err)
	}
	r, err := s.ReserveCruise(ctx, ReserveCruiseInput{SailingID: sailing.ID, Tables: []string{"QA1"}, Guests: 1, ExpectedTotal: 2000, CustomerName: "Sandbox QA"}, "member", Token())
	if err != nil {
		t.Fatal(err)
	}
	p := CruisePayments{Bookings: s, Client: &OmiseClient{Secret: os.Getenv("OMISE_SECRET_KEY")}}
	checkout, err := p.Checkout(ctx, r.ID, "member")
	if err != nil {
		t.Fatal(err)
	}
	var charge string
	_ = s.DB.QueryRow(ctx, `SELECT charge_id FROM omise_checkouts WHERE reservation_id=$1`, r.ID).Scan(&charge)
	t.Logf("Sandbox charge ready: %s (THB 20.00, disposable QA reservation)", charge)
	if checkout.QR == "" {
		t.Fatal("missing real sandbox QR")
	}
	for i := 0; i < 60; i++ {
		time.Sleep(5 * time.Second)
		next, e := p.Status(ctx, r.ID, "member")
		if e != nil {
			t.Fatal(e)
		}
		if next.Status == "successful" {
			detail, e := s.CruiseReservationDetail(ctx, r.ID, "member")
			if e != nil || detail.Status != "confirmed" || len(detail.Tickets) != 1 || len(detail.Emails) != 2 {
				t.Fatal("sandbox fulfillment failed", e)
			}
			if e = p.SyncCharge(ctx, charge); e != nil {
				t.Fatal(e)
			}
			t.Log("Real Omise sandbox paid; one ticket and two email jobs persisted; duplicate sync safe")
			return
		}
	}
	t.Fatal("sandbox simulation was not completed within five minutes")
}
func TestOmiseHTTPAndValidation(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key, password, ok := r.BasicAuth()
		if !ok || key != "skey_test_fixture" || password != "" {
			t.Error("missing server authentication")
		}
		if r.Header.Get("Omise-Version") != "2019-05-29" {
			t.Error("unversioned request")
		}
		if r.Method == "POST" {
			_ = r.ParseForm()
			if r.Form.Get("webhook_endpoints[]") != "https://qa.example.test/api/v1/payments/omise/webhook" {
				t.Error("missing charge-specific webhook")
			}
			if r.Form.Get("source[type]") != "promptpay" || r.Form.Get("amount") != "480000" || r.Form.Get("metadata[reservation_id]") != "reservation" {
				t.Error("invalid charge parameters")
			}
		}
		_ = json.NewEncoder(w).Encode(testOmiseCharge())
	}))
	defer srv.Close()
	client := OmiseClient{Secret: "skey_test_fixture", BaseURL: srv.URL, HTTP: srv.Client(), WebhookURL: "https://qa.example.test/api/v1/payments/omise/webhook"}
	c, err := client.Create(context.Background(), "reservation", 480000, time.Now().Add(time.Minute))
	if err != nil {
		t.Fatal(err)
	}
	if err = validateOmiseCharge(c, "reservation", 480000); err != nil {
		t.Fatal(err)
	}
	client.WebhookURL = "http://qa.example.test/webhook"
	if _, err = client.Create(context.Background(), "reservation", 480000, time.Now()); err == nil {
		t.Fatal("insecure webhook accepted")
	}
	for _, mutate := range []func(*OmiseCharge){func(c *OmiseCharge) { c.Livemode = true }, func(c *OmiseCharge) { c.Amount-- }, func(c *OmiseCharge) { c.Currency = "usd" }, func(c *OmiseCharge) { c.Metadata = map[string]string{} }, func(c *OmiseCharge) { c.RefundedAmount = 1 }, func(c *OmiseCharge) { c.Source.Type = "card" }} {
		invalid := testOmiseCharge()
		mutate(&invalid)
		if validateOmiseCharge(invalid, "reservation", 480000) == nil {
			t.Fatal("mismatched charge accepted")
		}
	}
	c.Source.ScannableCode.Image.DownloadURI = "https://api.omise.co.evil.test/qr"
	if omiseQR(c) != "" {
		t.Fatal("foreign QR accepted")
	}
	client.Secret = "skey_live_fixture"
	if _, err = client.Retrieve(context.Background(), c.ID); err == nil {
		t.Fatal("live secret accepted")
	}
}

type fakeCruiseGateway struct {
	charge  OmiseCharge
	creates int
	fail    bool
}

func (f *fakeCruiseGateway) Create(_ context.Context, id string, amount int, _ time.Time) (OmiseCharge, error) {
	f.creates++
	if f.fail {
		return OmiseCharge{}, errors.New("ambiguous timeout")
	}
	f.charge.Metadata = map[string]string{"reservation_id": id}
	f.charge.Amount = amount
	return f.charge, nil
}
func (f *fakeCruiseGateway) Retrieve(context.Context, string) (OmiseCharge, error) {
	return f.charge, nil
}
func TestOmiseCruiseLifecycle(t *testing.T) {
	s := isolatedTableService(t)
	ctx := context.Background()
	_, err := s.DB.Exec(ctx, `INSERT INTO users(id,email,role) VALUES('staff','staff@example.test','admin'),('member','member@example.test','user')`)
	if err != nil {
		t.Fatal(err)
	}
	departure := time.Now().Add(48 * time.Hour)
	boarding := departure.Add(-time.Hour)
	sailing, err := s.SaveSailing(ctx, Sailing{VesselID: "unicorn", Title: "Omise test", Status: "published", Verified: true, Departure: &departure, Boarding: &boarding, Pier: "Test pier", Tables: []SailingTable{{ID: "U01", Deck: "upper", Seats: 4, Price: 480000, X: 280, Y: 150}, {ID: "U02", Deck: "upper", Seats: 4, Price: 480000, X: 380, Y: 150}}}, "staff")
	if err != nil {
		t.Fatal(err)
	}
	reserve := func(table string) CruiseReservation {
		r, e := s.ReserveCruise(ctx, ReserveCruiseInput{SailingID: sailing.ID, Tables: []string{table}, Guests: 2, ExpectedTotal: 480000, CustomerName: "Test"}, "member", Token())
		if e != nil {
			t.Fatal(e)
		}
		return r
	}
	r := reserve("U01")
	gateway := &fakeCruiseGateway{charge: testOmiseCharge()}
	p := CruisePayments{Bookings: s, Client: gateway}
	if _, err = p.Checkout(ctx, r.ID, "other"); err == nil {
		t.Fatal("ownership bypass")
	}
	if _, err = p.Checkout(ctx, r.ID, "member"); err != nil {
		t.Fatal(err)
	}
	if _, err = p.Checkout(ctx, r.ID, "member"); err != nil || gateway.creates != 1 {
		t.Fatal("duplicate charge", err)
	}
	if err = s.CancelCruiseReservation(ctx, r.ID, "member"); !errors.Is(err, ErrConflict) {
		t.Fatal("payable reservation cancelled", err)
	}
	gateway.charge.Status = "successful"
	if _, err = p.Status(ctx, r.ID, "member"); err == nil {
		t.Fatal("successful flag without paid accepted")
	}
	gateway.charge.Paid = true
	gateway.charge.Amount--
	if _, err = p.Status(ctx, r.ID, "member"); err == nil {
		t.Fatal("underpayment accepted")
	}
	gateway.charge.Amount++
	for i := 0; i < 2; i++ {
		if err = p.SyncCharge(ctx, gateway.charge.ID); err != nil {
			t.Fatal(err)
		}
	}
	detail, err := s.CruiseReservationDetail(ctx, r.ID, "member")
	if err != nil || detail.Status != "confirmed" || len(detail.Tickets) != 2 || len(detail.Emails) != 2 {
		t.Fatal("confirmation not idempotent", detail, err)
	}
	r = reserve("U02")
	gateway.fail = true
	if _, err = p.Checkout(ctx, r.ID, "member"); err == nil {
		t.Fatal("missing timeout")
	}
	if next, e := p.Checkout(ctx, r.ID, "member"); e != nil || next.Status != "review_required" || gateway.creates != 2 {
		t.Fatal("ambiguous create was retried or hidden", e)
	}
	if _, err = p.Reconcile(ctx, r.ID, gateway.charge.ID, "member"); err == nil {
		t.Fatal("non-admin reconciliation allowed")
	}
	// A charge from another reservation must never be attached.
	if _, err = p.Reconcile(ctx, r.ID, gateway.charge.ID, "staff"); err == nil {
		t.Fatal("foreign charge linked")
	}
	gateway.charge.ID = "chrg_test_recovered"
	gateway.charge.Metadata = map[string]string{"reservation_id": r.ID}
	gateway.charge.Status = "pending"
	gateway.charge.Paid = false
	if next, e := p.Reconcile(ctx, r.ID, gateway.charge.ID, "staff"); e != nil || next.Status != "pending" {
		t.Fatal("valid lost response could not be reconciled", e)
	}
	// Inventory can be reserved by someone else after the hold. Late money must
	// remain reviewable without issuing tickets or rejecting webhooks forever.
	if _, err = s.DB.Exec(ctx, `UPDATE cruise_reservations SET expires_at=now()-interval '1 minute' WHERE id=$1`, r.ID); err != nil {
		t.Fatal(err)
	}
	reserve("U02")
	gateway.charge.Status = "successful"
	gateway.charge.Paid = true
	for i := 0; i < 2; i++ {
		next, e := p.Status(ctx, r.ID, "member")
		if e != nil || next.Status != "review_required" || next.ReviewReason != "paid_after_hold" {
			t.Fatal("late payment not held for review", e)
		}
	}
	detail, err = s.CruiseReservationDetail(ctx, r.ID, "member")
	if err != nil || len(detail.Tickets) != 0 || len(detail.Emails) != 0 || detail.Payment == nil || detail.Payment.ReviewReason != "paid_after_hold" {
		t.Fatal("late payment issued fulfillment or lost review", err)
	}
}
