package service

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestStaffCruiseReservationOwnershipAndSeats(t *testing.T) {
	s := isolatedTableService(t)
	ctx := context.Background()
	if _, err := s.DB.Exec(ctx, `INSERT INTO users(id,email,role) VALUES('admin','admin@sales.test','admin'),('sales','sales@sales.test','sales'),('other-sales','other-sales@sales.test','sales'),('one','one@sales.test','user'),('two','two@sales.test','user'),('operator','operator@sales.test','operator')`); err != nil {
		t.Fatal(err)
	}
	dep := time.Now().Add(24 * time.Hour)
	board := dep.Add(-30 * time.Minute)
	sailing, err := s.SaveSailing(ctx, Sailing{VesselID: "unicorn", Title: "Sales QA", Status: "published", Verified: true, Departure: &dep, Boarding: &board, Pier: "QA", Tables: []SailingTable{{ID: "U01", Deck: "upper", Seats: 4, Price: 480000, SeatPrice: 120000, X: 280, Y: 150}}, Extras: []CruiseExtra{{ID: "wine", Name: "Wine", Category: "wine", Price: 140000, Stock: 10, Enabled: true}}}, "admin")
	if err != nil {
		t.Fatal(err)
	}
	input := func(seat string) ReserveCruiseInput {
		return ReserveCruiseInput{SailingID: sailing.ID, SeatIDs: []string{seat}, Guests: 1, ExpectedTotal: 260000, CustomerName: "Customer", Extras: []CruiseExtraSelection{{ID: "wine", Quantity: 1}}}
	}
	for _, actor := range []string{"one", "operator"} {
		if _, err := s.SalesReserveCruise(ctx, input("U01:1"), "one@sales.test", actor, Token()); err == nil {
			t.Fatal("non sales actor accepted", actor)
		}
	}
	for _, email := range []string{"missing@sales.test", "sales@sales.test"} {
		if _, err := s.SalesReserveCruise(ctx, input("U01:1"), email, "sales", Token()); err == nil {
			t.Fatal("invalid customer accepted")
		}
	}
	bad := input("U01:1")
	bad.ExpectedTotal = 1
	if _, err := s.SalesReserveCruise(ctx, bad, "one@sales.test", "sales", Token()); err == nil {
		t.Fatal("price tampering accepted")
	}
	key := Token()
	first, err := s.SalesReserveCruise(ctx, input("U01:1"), " ONE@sales.test ", "sales", key)
	if err != nil {
		t.Fatal(err)
	}
	repeated, err := s.SalesReserveCruise(ctx, input("U01:1"), "one@sales.test", "sales", key)
	if err != nil || first.ID != repeated.ID {
		t.Fatal("retry duplicated reservation", err)
	}
	if _, err = s.SalesReserveCruise(ctx, input("U01:1"), "two@sales.test", "other-sales", Token()); err == nil {
		t.Fatal("occupied chair sold twice")
	}
	second, err := s.SalesReserveCruise(ctx, input("U01:2"), "two@sales.test", "other-sales", Token())
	if err != nil || second.Total != 260000 {
		t.Fatal("different chair on same table rejected", err)
	}
	for actor, want := range map[string]string{"sales": first.ID, "other-sales": second.ID} {
		list, err := s.SalesCruiseReservations(ctx, actor)
		if err != nil || len(list) != 1 || list[0].ID != want {
			t.Fatal("sales ownership leaked", actor, list, err)
		}
	}
	if _, err = s.CruiseReservationDetail(ctx, first.ID, "one"); err != nil {
		t.Fatal("customer cannot read own order", err)
	}
	for _, actor := range []string{"sales", "other-sales", "two"} {
		if _, err = s.CruiseReservationDetail(ctx, first.ID, actor); err == nil {
			t.Fatal("customer endpoint leaked", actor)
		}
	}
	if _, err = s.ConfirmCruisePayment(ctx, first.ID, "admin", "qa-sales-payment", 260000); err != nil {
		t.Fatal(err)
	}
	detail, err := s.CruiseReservationDetail(ctx, first.ID, "one")
	if err != nil || detail.Email != "one@sales.test" || len(detail.Tickets) != 1 {
		t.Fatal("wrong recipient or tickets", detail, err)
	}

	oldCode := detail.Tickets[0].ID
	for _, badSeats := range [][]string{{"U01:2"}, {"U01:5"}, {"U01:3", "U01:4"}} {
		if err = s.MoveCruiseSeats(ctx, "admin", first.ID, "invalid move", badSeats); err == nil {
			t.Fatal("invalid move accepted", badSeats)
		}
	}
	if err = s.ResendCruiseEmail(ctx, "one", first.ID, "tickets"); err == nil {
		t.Fatal("customer used staff resend")
	}
	if err = s.MoveCruiseSeats(ctx, "admin", first.ID, "customer request", []string{"U01:3"}); err != nil {
		t.Fatal(err)
	}
	moved, err := s.CruiseReservationDetail(ctx, first.ID, "one")
	if err != nil || moved.Tickets[0].ID == oldCode || moved.Tickets[0].TableID != "U01:3" {
		t.Fatal("move ticket mismatch", err)
	}
	if _, err = s.DB.Exec(ctx, "UPDATE cruise_emails SET sent_at=now()-interval '2 minutes' WHERE reservation_id=$1", first.ID); err != nil {
		t.Fatal(err)
	}
	if err = s.ResendCruiseEmail(ctx, "admin", first.ID, "tickets"); err != nil {
		t.Fatal(err)
	}
	resent, err := s.CruiseReservationDetail(ctx, first.ID, "one")
	if err != nil || resent.Tickets[0].ID != moved.Tickets[0].ID {
		t.Fatal("resend issued another ticket", err)
	}
	if _, err = s.DB.Exec(ctx, "INSERT INTO users(id,email,role) VALUES('owner','owner@refund.test','owner');"); err != nil {
		t.Fatal(err)
	}
	if _, err = s.DB.Exec(ctx, "INSERT INTO omise_checkouts(reservation_id,charge_id) VALUES($1,'chrg_test_refund')", first.ID); err != nil {
		t.Fatal(err)
	}
	gateway := &managementRefundGateway{charge: OmiseCharge{ID: "chrg_test_refund", Amount: 260000, Currency: "thb", Paid: true, Status: "successful", Metadata: map[string]string{"reservation_id": first.ID}}}
	payments := &CruisePayments{Bookings: s, Client: gateway}
	if err = payments.Refund(ctx, "admin", first.ID, "customer requested refund"); err == nil {
		t.Fatal("admin refunded without owner")
	}
	if err = payments.Refund(ctx, "owner", first.ID, "customer requested refund"); err != nil {
		t.Fatal(err)
	}
	if err = payments.Refund(ctx, "owner", first.ID, "retry"); err != nil || gateway.posts != 1 {
		t.Fatal("refund duplicated", gateway.posts, err)
	}
	if _, err = s.ConfirmCruisePayment(ctx, second.ID, "admin", "qa-second-payment", 260000); err != nil {
		t.Fatal(err)
	}
	if _, err = s.DB.Exec(ctx, "INSERT INTO omise_checkouts(reservation_id,charge_id) VALUES($1,'chrg_test_refund2')", second.ID); err != nil {
		t.Fatal(err)
	}
	gateway.charge.ID = "chrg_test_refund2"
	gateway.charge.Metadata["reservation_id"] = second.ID
	gateway.fail = true
	if err = payments.Refund(ctx, "owner", second.ID, "connection uncertainty"); err == nil {
		t.Fatal("uncertain outcome accepted")
	}
	if err = payments.Refund(ctx, "owner", second.ID, "retry"); err == nil || gateway.posts != 2 {
		t.Fatal("uncertain refund sent twice", gateway.posts, err)
	}
	gateway.charge.RefundedAmount = 260000
	if err = payments.Refund(ctx, "owner", second.ID, "reconcile"); err != nil || gateway.posts != 2 {
		t.Fatal("reconcile should not send refund", gateway.posts, err)
	}
}

type managementRefundGateway struct {
	charge OmiseCharge
	posts  int
	fail   bool
}

func (g *managementRefundGateway) Create(context.Context, string, int, time.Time) (OmiseCharge, error) {
	return g.charge, nil
}
func (g *managementRefundGateway) Retrieve(context.Context, string) (OmiseCharge, error) {
	return g.charge, nil
}
func (g *managementRefundGateway) Refund(context.Context, string, int, string) (string, error) {
	g.posts++
	if g.fail {
		return "", errors.New("outcome unknown")
	}
	return "rfnd_test_qa", nil
}
