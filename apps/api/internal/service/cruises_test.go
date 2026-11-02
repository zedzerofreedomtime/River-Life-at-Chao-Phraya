package service

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"sync"
	"testing"
	"time"
)

func TestSailingPublicationValidation(t *testing.T) {
	now := time.Now()
	departure := now.Add(24 * time.Hour)
	boarding := departure.Add(-15 * time.Minute)
	base := Sailing{Verified: true, Title: "Dinner", Status: "published", Departure: &departure, Boarding: &boarding, Pier: "Pier 4", Tables: []SailingTable{{ID: "A1", Deck: "upper", Seats: 4, Price: 800000, X: 280, Y: 150}}}
	tests := []struct {
		name   string
		change func(*Sailing)
		valid  bool
	}{
		{"complete", func(*Sailing) {}, true},
		{"not verified", func(v *Sailing) { v.Verified = false }, false},
		{"missing coordinates", func(v *Sailing) { v.Tables[0].X = 0 }, false},
		{"incomplete draft", func(v *Sailing) { v.Status = "draft"; v.Departure = nil; v.Boarding = nil; v.Pier = ""; v.Tables = nil }, true},
		{"missing departure", func(v *Sailing) { v.Departure = nil }, false},
		{"missing boarding", func(v *Sailing) { v.Boarding = nil }, false},
		{"empty pier", func(v *Sailing) { v.Pier = "  " }, false},
		{"no tables", func(v *Sailing) { v.Tables = nil }, false},
		{"unpriced table", func(v *Sailing) { v.Tables[0].Price = 0 }, false},
		{"duplicate tables", func(v *Sailing) { v.Tables = append(v.Tables, v.Tables[0]) }, false},
		{"past departure", func(v *Sailing) { past := now.Add(-time.Hour); v.Departure = &past }, false},
		{"late boarding", func(v *Sailing) { late := departure.Add(time.Minute); v.Boarding = &late }, false},
		{"unknown status", func(v *Sailing) { v.Status = "paid" }, false},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			v := base
			v.Tables = append([]SailingTable{}, base.Tables...)
			tc.change(&v)
			if validateSailing(v, now) != tc.valid {
				t.Fatal("unexpected publication decision")
			}
		})
	}
}
func TestCruiseDraftPublishReserveAndOwnership(t *testing.T) {
	s := isolatedTableService(t)
	ctx := context.Background()
	_, err := s.DB.Exec(ctx, `INSERT INTO users(id,email,role) VALUES('staff','staff@example.test','admin'),('member','member@example.test','user'),('other','other@example.test','user')`)
	if err != nil {
		t.Fatal(err)
	}
	v, err := s.SaveSailing(ctx, Sailing{VesselID: "unicorn", Title: "Draft", Status: "draft"}, "staff")
	if err != nil {
		t.Fatal(err)
	}
	public, err := s.Sailings(ctx, "unicorn", false)
	if err != nil || len(public) != 0 {
		t.Fatalf("draft leaked: %v %v", public, err)
	}
	saved, err := s.Sailings(ctx, "", true)
	if err != nil || len(saved) != 1 || saved[0].ID != v.ID {
		t.Fatal("draft did not persist", err)
	}
	dep := time.Now().Add(24 * time.Hour)
	board := dep.Add(-15 * time.Minute)
	v.Departure = &dep
	v.Boarding = &board
	v.Pier = "ICONSIAM"
	v.Status = "published"
	v.Verified = true
	v.Tables = []SailingTable{{ID: "A1", Deck: "upper", Seats: 4, Price: 800000, X: 280, Y: 150}}
	v, err = s.SaveSailing(ctx, v, "staff")
	if err != nil {
		t.Fatal(err)
	}
	public, err = s.Sailings(ctx, "unicorn", false)
	if err != nil || len(public) != 1 || len(public[0].Tables) != 1 {
		t.Fatal("published missing", err)
	}
	var wg sync.WaitGroup
	results := make(chan CruiseReservation, 12)
	errs := make(chan error, 12)
	for i := 0; i < 12; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r, e := s.ReserveCruise(ctx, ReserveCruiseInput{SailingID: v.ID, Tables: []string{"A1"}, Guests: 3, ExpectedTotal: 800000}, "member", Token())
			if e != nil {
				errs <- e
			} else {
				results <- r
			}
		}()
	}
	wg.Wait()
	close(results)
	close(errs)
	if len(results) != 1 || len(errs) != 11 {
		t.Fatalf("oversold: %d success %d failures", len(results), len(errs))
	}
	for e := range errs {
		if !errors.Is(e, ErrConflict) {
			t.Fatal(e)
		}
	}
	r := <-results
	if _, err = s.CruiseReservation(ctx, r.ID, "other"); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal("owner isolation failed", err)
	}
	if err = s.CancelCruiseReservation(ctx, r.ID, "other"); !errors.Is(err, ErrConflict) {
		t.Fatal("foreign cancellation", err)
	}
	if err = s.CancelCruiseReservation(ctx, r.ID, "member"); err != nil {
		t.Fatal(err)
	}
	input := ReserveCruiseInput{SailingID: v.ID, Tables: []string{"A1"}, Guests: 4, ExpectedTotal: 800000}
	key := Token()
	r, err = s.ReserveCruise(ctx, input, "member", key)
	if err != nil {
		t.Fatal(err)
	}
	retry, err := s.ReserveCruise(ctx, input, "member", key)
	if err != nil || r.ID != retry.ID {
		t.Fatal("retry duplicated", err)
	}
	input.Guests = 2
	if _, err = s.ReserveCruise(ctx, input, "member", key); !errors.Is(err, ErrConflict) {
		t.Fatal("changed retry accepted", err)
	}
	if _, err = s.SaveSailing(ctx, v, "staff"); !errors.Is(err, ErrConflict) {
		t.Fatal("booked terms editable", err)
	}
	if _, err = s.DB.Exec(ctx, `UPDATE cruise_reservations SET expires_at=now()-interval '1 second' WHERE id=$1`, r.ID); err != nil {
		t.Fatal(err)
	}
	if _, err = s.ReserveCruise(ctx, input, "other", Token()); err != nil {
		t.Fatal("expiry did not free inventory", err)
	}
	otherSailing := v
	otherSailing.ID = ""
	otherSailing.Revision = 0
	otherSailing.VesselID = "viva"
	otherSailing, err = s.SaveSailing(ctx, otherSailing, "staff")
	if err != nil {
		t.Fatal(err)
	}
	input.SailingID = otherSailing.ID
	input.ExpectedTotal = 1
	if _, err = s.ReserveCruise(ctx, input, "member", Token()); !errors.Is(err, ErrConflict) {
		t.Fatal("client price accepted", err)
	}
	input.ExpectedTotal = 800000
	if _, err = s.ReserveCruise(ctx, input, "member", Token()); err != nil {
		t.Fatal("table ID not isolated by sailing", err)
	}
	if err = s.CloseSailing(ctx, otherSailing.ID, "staff", otherSailing.Revision+1); !errors.Is(err, ErrConflict) {
		t.Fatal("stale close accepted", err)
	}
	if err = s.CloseSailing(ctx, otherSailing.ID, "staff", otherSailing.Revision); err != nil {
		t.Fatal(err)
	}
	public, err = s.Sailings(ctx, "viva", false)
	if err != nil || len(public) != 0 {
		t.Fatal("closed sailing exposed", err)
	}
	if _, err = s.ReserveCruise(ctx, input, "other", Token()); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal("closed sailing reserved", err)
	}
}
