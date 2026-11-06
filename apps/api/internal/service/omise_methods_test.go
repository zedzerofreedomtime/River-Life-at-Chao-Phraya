package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"
)

// Explicit opt-in: a pending test charge only. No bank authorization, SMTP or real money.
func TestOmiseSandboxMobileBanking(t *testing.T) {
	if os.Getenv("RUN_OMISE_METHODS") != "1" {
		t.Skip("explicit sandbox opt-in required")
	}
	s := isolatedTableService(t)
	ctx := context.Background()
	if _, err := s.DB.Exec(ctx, `INSERT INTO users(id,email,role) VALUES('staff','qa-staff@example.test','admin'),('member','qa-member@example.test','user')`); err != nil {
		t.Fatal(err)
	}
	departure := time.Now().Add(48 * time.Hour)
	boarding := departure.Add(-time.Hour)
	sailing, err := s.SaveSailing(ctx, Sailing{VesselID: "unicorn", Title: "Sandbox methods QA", Status: "published", Verified: true, Departure: &departure, Boarding: &boarding, Pier: "QA", Tables: []SailingTable{{ID: "QA1", Deck: "upper", Seats: 1, Price: 2000, X: 280, Y: 150}}}, "staff")
	if err != nil {
		t.Fatal(err)
	}
	reservation, err := s.ReserveCruise(ctx, ReserveCruiseInput{SailingID: sailing.ID, Tables: []string{"QA1"}, Guests: 1, ExpectedTotal: 2000, CustomerName: "QA methods"}, "member", Token())
	if err != nil {
		t.Fatal(err)
	}
	client := &OmiseClient{Secret: os.Getenv("OMISE_SECRET_KEY"), PublicKey: os.Getenv("OMISE_PUBLIC_KEY"), ReturnOrigin: "http://localhost:3000"}
	form := url.Values{"type": {"mobile_banking_kbank"}, "amount": {"2000"}, "currency": {"thb"}}
	req, err := http.NewRequest("POST", "https://api.omise.co/sources", strings.NewReader(form.Encode()))
	if err != nil {
		t.Fatal(err)
	}
	req.SetBasicAuth(client.PublicKey, "")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Omise-Version", "2019-05-29")
	httpClient := &http.Client{Timeout: 15 * time.Second}
	res, err := httpClient.Do(req)
	if err != nil {
		t.Fatal("sandbox source request failed")
	}
	defer res.Body.Close()
	var source struct {
		ID string `json:"id"`
	}
	if res.StatusCode != 200 {
		t.Fatalf("source HTTP %d", res.StatusCode)
	}
	if err = json.NewDecoder(res.Body).Decode(&source); err != nil {
		t.Fatal(err)
	}
	p := CruisePayments{Bookings: s, Client: client}
	checkout, err := p.Checkout(ctx, reservation.ID, "member", OmisePaymentInput{Source: source.ID})
	if err != nil {
		t.Fatal(err)
	}
	if checkout.Status != "pending" || checkout.AuthorizeURL == "" || checkout.QR != "" {
		t.Fatal("bank authorization was not returned")
	}
	again, err := p.Checkout(ctx, reservation.ID, "member", OmisePaymentInput{Source: source.ID})
	if err != nil || again.AuthorizeURL != checkout.AuthorizeURL {
		t.Fatal("checkout was not idempotent", err)
	}
	detail, err := s.CruiseReservationDetail(ctx, reservation.ID, "member")
	if err != nil || detail.Status != "held" || len(detail.Tickets) != 0 || len(detail.Emails) != 0 {
		t.Fatal("pending payment must not issue tickets/mail", err)
	}
}

func TestOmiseMethodsAndPaymentSources(t *testing.T) {
	var sourceAmount = 480000
	var sourceType = "mobile_banking_kbank"
	var currency = "THB"
	var live bool
	var capabilityCalls int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key, _, _ := r.BasicAuth()
		switch r.URL.Path {
		case "/capability":
			capabilityCalls++
			if key != "pkey_test_fixture" {
				t.Error("capability must use public key")
			}
			json.NewEncoder(w).Encode(map[string]any{"payment_methods": []any{
				map[string]any{"name": "card", "currencies": []string{"THB"}},
				map[string]any{"name": "mobile_banking_kbank", "currencies": []string{"THB"}},
				map[string]any{"name": "offline", "currencies": []string{"THB"}},
				map[string]any{"name": "alipay", "currencies": []string{"USD"}},
			}})
		case "/sources/src_test_fixture":
			if key != "skey_test_fixture" {
				t.Error("source verification must use secret key")
			}
			json.NewEncoder(w).Encode(map[string]any{"id": "src_test_fixture", "type": sourceType, "amount": sourceAmount, "currency": currency, "livemode": live})
		case "/charges":
			r.ParseForm()
			if key != "skey_test_fixture" || r.Form.Get("amount") != "480000" || r.Form.Get("metadata[reservation_id]") != "reservation" || r.Form.Get("return_uri") != "http://localhost:3000/booking?payment=reservation" {
				t.Error("charge not bound to server total/return URL")
			}
			if r.Form.Get("card") != "tokn_test_fixture" || r.Form.Get("source") != "" || r.Form.Get("metadata[payment_method]") != "card" {
				t.Error("invalid tokenized card charge")
			}
			c := testOmiseCharge()
			c.Source.Type = ""
			c.Card = &struct {
				ID string `json:"id"`
			}{"card_test_fixture"}
			c.Metadata["payment_method"] = "card"
			json.NewEncoder(w).Encode(c)
		default:
			t.Errorf("unexpected endpoint %s", r.URL.Path)
			w.WriteHeader(404)
		}
	}))
	defer srv.Close()
	o := &OmiseClient{Secret: "skey_test_fixture", PublicKey: "pkey_test_fixture", BaseURL: srv.URL, HTTP: srv.Client(), ReturnOrigin: "http://localhost:3000"}
	methods, err := o.PaymentMethods(context.Background())
	if err != nil || strings.Join(methods.Methods, ",") != "card,mobile_banking_kbank" {
		t.Fatal(methods, err)
	}
	prepared, err := o.PreparePayment(context.Background(), OmisePaymentInput{Token: "tokn_test_fixture"}, 480000)
	if err != nil || prepared.Method != "card" {
		t.Fatal(prepared, err)
	}
	c, err := o.CreatePayment(context.Background(), "reservation", 480000, time.Now(), prepared)
	if err != nil {
		t.Fatal(err)
	}
	if err = validateOmiseCharge(c, "reservation", 480000); err != nil {
		t.Fatal(err)
	}
	prepared, err = o.PreparePayment(context.Background(), OmisePaymentInput{Source: "src_test_fixture"}, 480000)
	if err != nil || prepared.Method != "mobile_banking_kbank" {
		t.Fatal(prepared, err)
	}
	if capabilityCalls != 1 {
		t.Fatal("capabilities not cached", capabilityCalls)
	}
	for _, change := range []string{"underpayment", "currency", "live", "disabled", "unsupported"} {
		t.Run(change, func(t *testing.T) {
			sourceAmount = 480000
			currency = "THB"
			live = false
			sourceType = "mobile_banking_kbank"
			switch change {
			case "underpayment":
				sourceAmount--
			case "currency":
				currency = "USD"
			case "live":
				live = true
			case "disabled":
				sourceType = "shopeepay"
			case "unsupported":
				sourceType = "offline"
			}
			if _, err = o.PreparePayment(context.Background(), OmisePaymentInput{Source: "src_test_fixture"}, 480000); err == nil {
				t.Fatal("invalid source accepted")
			}
		})
	}
	for _, input := range []OmisePaymentInput{{Token: "tokn_live_bad"}, {Source: "src_test_../other"}, {Token: "tokn_test_fixture", Source: "src_test_fixture"}} {
		if _, err = o.PreparePayment(context.Background(), input, 480000); err == nil {
			t.Fatal("invalid nonce accepted")
		}
	}
	c.Source.Type = "promptpay"
	if validateOmiseCharge(c, "reservation", 480000) == nil {
		t.Fatal("wrong method accepted")
	}
	c = testOmiseCharge()
	c.Source.Type = "unknown"
	if validateOmiseCharge(c, "reservation", 480000) == nil {
		t.Fatal("unknown charge source accepted")
	}
}

func TestOmiseAuthorizationURL(t *testing.T) {
	for _, uri := range []string{"https://api.omise.co/payments/paym_test_fixture/authorize", "https://pay.omise.co/authorize", "https://3ds.omise.co/authorize"} {
		if omiseAuthorizeURL(OmiseCharge{AuthorizeURI: uri}) != uri {
			t.Fatal("valid authorization rejected")
		}
	}
	for _, uri := range []string{"javascript:alert(1)", "https://api.omise.co.evil.test/payments/x", "https://evil.test", "http://api.omise.co/payments/x", "https://user@api.omise.co/payments/x", "https://api.omise.co:444/payments/x", "https://api.omise.co/not-a-payment"} {
		if omiseAuthorizeURL(OmiseCharge{AuthorizeURI: uri}) != "" {
			t.Fatal("untrusted authorization accepted")
		}
	}
}

func TestOmiseHostedPromptPayKeepsHoldExpiry(t *testing.T) {
	expiry := time.Now().Add(10 * time.Minute).Truncate(time.Second)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			t.Fatal(err)
		}
		if r.Form.Get("source") != "src_test_fixture" || r.Form.Get("expires_at") != expiry.UTC().Format(time.RFC3339) {
			t.Error("hosted PromptPay source lost hold expiry")
		}
		json.NewEncoder(w).Encode(testOmiseCharge())
	}))
	defer srv.Close()
	client := &OmiseClient{Secret: "skey_test_fixture", BaseURL: srv.URL, HTTP: srv.Client(), ReturnOrigin: "http://localhost:3000"}
	if _, err := client.CreatePayment(context.Background(), "reservation", 480000, expiry, OmisePaymentInput{Method: "promptpay", Source: "src_test_fixture"}); err != nil {
		t.Fatal(err)
	}
}
