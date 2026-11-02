package service

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"strings"
	"sync"
	"testing"
	"time"
)

type captureCruiseMail struct {
	kinds    []string
	messages [][]byte
	fail     bool
}

func (m *captureCruiseMail) SendBookingMail(ctx context.Context, b Booking, p BookingProgram, kind string, demo bool) error {
	if m.fail {
		return errors.New("test SMTP temporarily unavailable")
	}
	if demo || b.Status != "confirmed" || !strings.Contains(p.ExtraDetails, "ไวน์แดง") {
		return errors.New("incorrect confirmation payload")
	}
	raw, err := bookingMessage("River Life <sender@example.test>", b, p, kind, demo)
	if err != nil {
		return err
	}
	m.kinds = append(m.kinds, kind)
	m.messages = append(m.messages, raw)
	return nil
}
func TestCruiseSalesExtrasPaymentTicketsAndEmails(t *testing.T) {
	s := isolatedTableService(t)
	ctx := context.Background()
	if _, err := s.DB.Exec(ctx, `INSERT INTO users(id,email,name,role) VALUES('staff','staff@example.test','Admin','admin'),('member','member@example.test','Guest','user'),('other','other@example.test','Other','user'),('operator','operator@example.test','Crew','operator')`); err != nil {
		t.Fatal(err)
	}
	dep := time.Now().Add(24 * time.Hour)
	board := dep.Add(-15 * time.Minute)
	sailing := Sailing{VesselID: "unicorn", Title: "QA only", Status: "published", Verified: true, Departure: &dep, Boarding: &board, Pier: "ICONSIAM Pier 4", Tables: []SailingTable{{ID: "U01", Deck: "upper", Seats: 4, Price: 480000, X: 280, Y: 150}, {ID: "L01", Deck: "lower", Seats: 4, Price: 400000, X: 280, Y: 410}}, Extras: []CruiseExtra{{ID: "red", Name: "ไวน์แดง", Category: "wine", Price: 140000, Stock: 1, Enabled: true}}}
	sailing, err := s.SaveSailing(ctx, sailing, "staff")
	if err != nil {
		t.Fatal(err)
	}
	input := ReserveCruiseInput{SailingID: sailing.ID, Tables: []string{"U01"}, Guests: 3, ExpectedTotal: 620000, Extras: []CruiseExtraSelection{{ID: "red", Quantity: 1}}, Notes: "แพ้ถั่ว", Requests: []string{"cake"}, CustomerName: "Guest", CustomerPhone: "000-test"}
	tampered := input
	tampered.ExpectedTotal = 1
	if _, err = s.ReserveCruise(ctx, tampered, "member", Token()); !errors.Is(err, ErrConflict) {
		t.Fatal("client total trusted", err)
	}
	tampered = input
	tampered.Extras = []CruiseExtraSelection{{ID: "unknown", Quantity: 1}}
	if _, err = s.ReserveCruise(ctx, tampered, "member", Token()); !errors.Is(err, ErrConflict) {
		t.Fatal("unknown extra accepted", err)
	}
	var wg sync.WaitGroup
	results := make(chan CruiseReservation, 2)
	errs := make(chan error, 2)
	for i, table := range []string{"U01", "L01"} {
		wg.Add(1)
		go func(i int, table string) {
			defer wg.Done()
			in := input
			in.Tables = []string{table}
			if i == 1 {
				in.ExpectedTotal = 540000
			}
			r, e := s.ReserveCruise(ctx, in, "member", Token())
			if e != nil {
				errs <- e
			} else {
				results <- r
			}
		}(i, table)
	}
	wg.Wait()
	close(results)
	close(errs)
	if len(results) != 1 || len(errs) != 1 {
		t.Fatal("extra stock oversold", len(results), len(errs))
	}
	for e := range errs {
		if !errors.Is(e, ErrConflict) {
			t.Fatal(e)
		}
	}
	r := <-results
	if r.ExtrasTotal != 140000 || r.TableTotal+r.ExtrasTotal != r.Total || r.Notes != "แพ้ถั่ว" || len(r.Items) != 1 || len(r.Requests) != 1 {
		t.Fatal("snapshot or totals missing", r)
	}
	if _, err = s.CruiseReservationDetail(ctx, r.ID, "other"); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal("foreign order visible", err)
	}
	if _, err = s.ConfirmCruisePayment(ctx, r.ID, "member", "TEST-PAY-0001", r.Total); !errors.Is(err, ErrConflict) {
		t.Fatal("member confirmed payment", err)
	}
	if _, err = s.ConfirmCruisePayment(ctx, r.ID, "staff", "TEST-PAY-0001", r.Total-1); !errors.Is(err, ErrConflict) {
		t.Fatal("wrong amount confirmed", err)
	}
	confirmed, err := s.ConfirmCruisePayment(ctx, r.ID, "staff", "TEST-PAY-0001", r.Total)
	if err != nil {
		t.Fatal(err)
	}
	if confirmed.Status != "confirmed" || len(confirmed.Tickets) != 3 || len(confirmed.Emails) != 2 {
		t.Fatal("confirmation incomplete", confirmed)
	}
	again, err := s.ConfirmCruisePayment(ctx, r.ID, "staff", "TEST-PAY-0001", r.Total)
	if err != nil || again.Tickets[0].ID != confirmed.Tickets[0].ID {
		t.Fatal("confirmation retry duplicated tickets", err)
	}
	if _, err = s.ConfirmCruisePayment(ctx, r.ID, "staff", "DIFFERENT-REFERENCE", r.Total); !errors.Is(err, ErrConflict) {
		t.Fatal("second reference accepted", err)
	}
	public, err := s.Sailings(ctx, "unicorn", false)
	if err != nil {
		t.Fatal(err)
	}
	for _, table := range public[0].Tables {
		if table.ID == r.TableIDs[0] && table.Available {
			t.Fatal("paid table released")
		}
	}
	if public[0].Extras[0].Remaining != 0 {
		t.Fatal("paid extra restocked")
	}
	if err = s.CancelCruiseReservation(ctx, r.ID, "member"); !errors.Is(err, ErrConflict) {
		t.Fatal("paid order cancelled without refund", err)
	}
	freeTable := "L01"
	freePrice := 400000
	if r.TableIDs[0] == "L01" {
		freeTable = "U01"
		freePrice = 480000
	}
	other, err := s.ReserveCruise(ctx, ReserveCruiseInput{SailingID: sailing.ID, Tables: []string{freeTable}, Guests: 1, ExpectedTotal: freePrice}, "other", Token())
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.ConfirmCruisePayment(ctx, other.ID, "staff", "TEST-PAY-0001", other.Total); !errors.Is(err, ErrConflict) {
		t.Fatal("bank reference reused", err)
	}
	if _, err = s.DB.Exec(ctx, `UPDATE cruise_reservations SET expires_at=now()-interval '1 second' WHERE id=$1`, other.ID); err != nil {
		t.Fatal(err)
	}
	if _, err = s.ConfirmCruisePayment(ctx, other.ID, "staff", "TEST-PAY-0002", other.Total); !errors.Is(err, ErrConflict) {
		t.Fatal("expired order confirmed", err)
	}
	if _, err = s.CheckInCruiseTicket(ctx, confirmed.Tickets[0].ID, sailing.ID, "operator"); !errors.Is(err, ErrConflict) {
		t.Fatal("check-in before boarding", err)
	}
	if _, err = s.DB.Exec(ctx, `UPDATE sailings SET boarding_at=now()-interval '1 minute' WHERE id=$1`, sailing.ID); err != nil {
		t.Fatal(err)
	}
	if _, err = s.CheckInCruiseTicket(ctx, confirmed.Tickets[0].ID, "wrong-round", "operator"); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal("wrong sailing admitted", err)
	}
	if _, err = s.CheckInCruiseTicket(ctx, confirmed.Tickets[0].ID, sailing.ID, "member"); !errors.Is(err, ErrConflict) {
		t.Fatal("customer scanned ticket", err)
	}
	checked, err := s.CheckInCruiseTicket(ctx, confirmed.Tickets[0].ID, sailing.ID, "operator")
	if err != nil || checked.CheckedIn == nil {
		t.Fatal("check-in failed", err)
	}
	if _, err = s.CheckInCruiseTicket(ctx, confirmed.Tickets[0].ID, sailing.ID, "operator"); !errors.Is(err, ErrConflict) {
		t.Fatal("ticket used twice", err)
	}
	if _, err = s.DB.Exec(ctx, `UPDATE sailings SET departure_at=now()-interval '1 second' WHERE id=$1`, sailing.ID); err != nil {
		t.Fatal(err)
	}
	if _, err = s.CheckInCruiseTicket(ctx, confirmed.Tickets[1].ID, sailing.ID, "operator"); !errors.Is(err, ErrConflict) {
		t.Fatal("late check-in accepted", err)
	}
	sender := &captureCruiseMail{fail: true}
	worked, err := DeliverNextCruiseEmail(ctx, s, sender)
	if err != nil || !worked {
		t.Fatal("queue retry failed", err)
	}
	var attempts int
	if err = s.DB.QueryRow(ctx, `SELECT max(attempts) FROM cruise_emails WHERE reservation_id=$1`, r.ID).Scan(&attempts); err != nil || attempts != 1 {
		t.Fatal("email retry not recorded", err)
	}
	if _, err = s.DB.Exec(ctx, `UPDATE cruise_emails SET next_attempt_at=now() WHERE reservation_id=$1`, r.ID); err != nil {
		t.Fatal(err)
	}
	sender.fail = false
	for i := 0; i < 2; i++ {
		worked, err = DeliverNextCruiseEmail(ctx, s, sender)
		if err != nil || !worked {
			t.Fatal("email delivery failed", err)
		}
	}
	if len(sender.kinds) != 2 || sender.kinds[0] == sender.kinds[1] {
		t.Fatal("two separate emails missing")
	}
	for i, kind := range sender.kinds {
		if kind == "tickets" && strings.Count(string(sender.messages[i]), "Content-Type: image/png") != 3 {
			t.Fatal("QR attachments missing")
		}
	}
	worked, err = DeliverNextCruiseEmail(ctx, s, sender)
	if err != nil || worked {
		t.Fatal("delivered message queued again", err)
	}
	detail, err := s.CruiseReservationDetail(ctx, r.ID, "member")
	if err != nil {
		t.Fatal(err)
	}
	for _, mail := range detail.Emails {
		if mail.SentAt == nil {
			t.Fatal("email delivery state not persisted")
		}
	}
	if _, err = s.DB.Exec(ctx, `UPDATE cruise_emails SET sent_at=NULL,attempts=7,next_attempt_at=now() WHERE reservation_id=$1 AND kind='booking'`, r.ID); err != nil {
		t.Fatal(err)
	}
	sender.fail = true
	if worked, err = DeliverNextCruiseEmail(ctx, s, sender); err != nil || !worked {
		t.Fatal("final retry failed", err)
	}
	var stopped bool
	if err = s.DB.QueryRow(ctx, `SELECT stopped_at IS NOT NULL AND attempts=8 FROM cruise_emails WHERE reservation_id=$1 AND kind='booking'`, r.ID).Scan(&stopped); err != nil || !stopped {
		t.Fatal("exhausted email stayed queued", err)
	}
}
