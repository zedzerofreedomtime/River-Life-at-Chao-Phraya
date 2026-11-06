package service

import (
	"context"
	"encoding/json"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestCruiseChairEmailSnapshotAndRetry(t *testing.T) {
	s := isolatedTableService(t)
	ctx := context.Background()
	if _, err := s.DB.Exec(ctx, `INSERT INTO users(id,email,name,role) VALUES('staff','staff@example.test','Staff','admin'),('member','member@example.test','Account name','user')`); err != nil {
		t.Fatal(err)
	}
	departure := time.Date(2027, 1, 2, 12, 0, 0, 0, time.UTC)
	boarding := departure.Add(-30 * time.Minute)
	sailing, err := s.SaveSailing(ctx, Sailing{VesselID: "unicorn", Title: "Email QA", Status: "published", Verified: true, Departure: &departure, Boarding: &boarding, Pier: "ICONSIAM Pier 4", Tables: []SailingTable{{ID: "U01", Deck: "upper", Seats: 4, Price: 480000, SeatPrice: 120000, X: 280, Y: 150}}, Extras: []CruiseExtra{{ID: "wine", Name: "ไวน์แดง", Category: "wine", Price: 140000, Stock: 10, Enabled: true}, {ID: "food", Name: "อาหารพิเศษ", Category: "food", Price: 60000, Stock: 10, Enabled: true}}}, "staff")
	if err != nil {
		t.Fatal(err)
	}
	r, err := s.ReserveCruise(ctx, ReserveCruiseInput{SailingID: sailing.ID, SeatIDs: []string{"U01:2", "U01:4"}, Guests: 2, ExpectedTotal: 440000, CustomerName: "ผู้จอง ทดสอบ", Extras: []CruiseExtraSelection{{ID: "wine", Quantity: 1}, {ID: "food", Quantity: 1}}}, "member", Token())
	if err != nil {
		t.Fatal(err)
	}
	detail, err := s.ConfirmCruisePayment(ctx, r.ID, "staff", "MAIL-QA-001", 440000)
	if err != nil {
		t.Fatal(err)
	}
	// Later profile or sailing changes must not rewrite already-issued email snapshots.
	if _, err = s.DB.Exec(ctx, `UPDATE users SET name='Changed name' WHERE id='member'; UPDATE sailings SET departure_at=departure_at+interval '1 day' WHERE title='Email QA'`); err != nil {
		t.Fatal(err)
	}
	var raw []byte
	if err = s.DB.QueryRow(ctx, `SELECT payload FROM cruise_emails WHERE reservation_id=$1 AND kind='tickets'`, r.ID).Scan(&raw); err != nil {
		t.Fatal(err)
	}
	var payload CruiseMailPayload
	if err = json.Unmarshal(raw, &payload); err != nil {
		t.Fatal(err)
	}
	if payload.Booking.Name != "ผู้จอง ทดสอบ" || payload.Booking.Total != 440000 || payload.Booking.Email != "member@example.test" || payload.Program.SailingDate == nil || *payload.Program.SailingDate != "2027-01-02" || payload.Program.Departure != "19:00" || payload.Program.Boarding != "18:30" || payload.Program.FullPier != "ICONSIAM Pier 4" {
		t.Fatalf("incorrect snapshot: %+v", payload)
	}
	for _, text := range []string{"THB 2400.00", "THB 2000.00", "ไวน์แดง × 1: THB 1400.00", "อาหารพิเศษ × 1: THB 600.00"} {
		if !strings.Contains(payload.Program.ExtraDetails, text) {
			t.Fatalf("missing extra/total %q", text)
		}
	}
	if len(payload.Booking.Tickets) != 2 || payload.Booking.Tickets[0].TableID != "U01:2" || payload.Booking.Tickets[1].TableID != "U01:4" {
		t.Fatal("incorrect ticket seat mapping")
	}
	sender := &captureCruiseMail{fail: true}
	if worked, err := DeliverNextCruiseEmail(ctx, s, sender); err != nil || !worked {
		t.Fatal("failed delivery not queued", err)
	}
	var retryScheduled bool
	if err = s.DB.QueryRow(ctx, `SELECT bool_or(attempts=1 AND sent_at IS NULL AND next_attempt_at>now()) FROM cruise_emails WHERE reservation_id=$1`, r.ID).Scan(&retryScheduled); err != nil || !retryScheduled {
		t.Fatal("retry missing", err)
	}
	if _, err = s.DB.Exec(ctx, `UPDATE cruise_emails SET next_attempt_at=now() WHERE reservation_id=$1`, r.ID); err != nil {
		t.Fatal(err)
	}
	sender.fail = false
	for i := 0; i < 2; i++ {
		if worked, err := DeliverNextCruiseEmail(ctx, s, sender); err != nil || !worked {
			t.Fatal("retry did not deliver", err)
		}
	}
	if worked, err := DeliverNextCruiseEmail(ctx, s, sender); err != nil || worked {
		t.Fatal("resent delivered email", err)
	}
	after, err := s.CruiseReservationDetail(ctx, r.ID, "member")
	if err != nil || !reflect.DeepEqual(after.Tickets, detail.Tickets) {
		t.Fatal("email retry changed issued tickets", err)
	}
	if len(after.Emails) != 2 {
		t.Fatal("duplicate email jobs")
	}
	for _, email := range after.Emails {
		if email.SentAt == nil {
			t.Fatal("email not sent")
		}
	}
}
