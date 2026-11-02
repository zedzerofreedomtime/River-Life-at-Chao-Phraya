package service

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"
)

func TestSecurityInventoryHoldBudget(t *testing.T) {
	s := isolatedTableService(t)
	ctx := context.Background()
	if _, err := s.DB.Exec(ctx, `INSERT INTO users(id,email,role) VALUES('staff','staff@qa.test','admin'),('member','member@qa.test','user'),('other','other@qa.test','user')`); err != nil {
		t.Fatal(err)
	}
	dep := time.Now().Add(24 * time.Hour)
	board := dep.Add(-15 * time.Minute)
	v, err := s.SaveSailing(ctx, Sailing{VesselID: "unicorn", Title: "QA", Status: "published", Verified: true, Departure: &dep, Boarding: &board, Pier: "QA", Tables: []SailingTable{{ID: "A1", Deck: "upper", Seats: 4, Price: 10000, X: 280, Y: 150}, {ID: "A2", Deck: "upper", Seats: 4, Price: 10000, X: 480, Y: 150}, {ID: "A3", Deck: "upper", Seats: 4, Price: 10000, X: 680, Y: 150}}}, "staff")
	if err != nil {
		t.Fatal(err)
	}
	in := ReserveCruiseInput{SailingID: v.ID, Tables: []string{"A1", "A2", "A3"}, Guests: 1, ExpectedTotal: 30000}
	if _, err = s.ReserveCruise(ctx, in, "member", Token()); !errors.Is(err, ErrConflict) {
		t.Fatal("redundant bulk tables accepted", err)
	}
	in.Tables = []string{"A1", "A2"}
	in.Guests = 5
	in.ExpectedTotal = 20000
	first, err := s.ReserveCruise(ctx, in, "member", Token())
	if err != nil {
		t.Fatal("legitimate group rejected", err)
	}
	second := ReserveCruiseInput{SailingID: v.ID, Tables: []string{"A3"}, Guests: 1, ExpectedTotal: 10000}
	if _, err = s.ReserveCruise(ctx, second, "member", Token()); !errors.Is(err, ErrConflict) {
		t.Fatal("multiple live holds accepted", err)
	}
	if _, err = s.ReserveCruise(ctx, second, "other", Token()); err != nil {
		t.Fatal("independent buyer blocked", err)
	}
	if err = s.CancelCruiseReservation(ctx, first.ID, "member"); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 2; i++ {
		r, e := s.ReserveCruise(ctx, in, "member", Token())
		if e != nil {
			t.Fatal("normal correction blocked", e)
		}
		if e = s.CancelCruiseReservation(ctx, r.ID, "member"); e != nil {
			t.Fatal(e)
		}
	}
	if _, err = s.ReserveCruise(ctx, in, "member", Token()); !errors.Is(err, ErrConflict) {
		t.Fatal("repeated cancel/rehold bypasses budget", err)
	}
	if _, err = s.DB.Exec(ctx, `UPDATE cruise_reservations SET created_at=now()-interval '16 minutes' WHERE user_id='member'`); err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	results := make(chan error, 2)
	for _, id := range []string{"A1", "A2"} {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			_, e := s.ReserveCruise(ctx, ReserveCruiseInput{SailingID: v.ID, Tables: []string{id}, Guests: 1, ExpectedTotal: 10000}, "member", Token())
			results <- e
		}(id)
	}
	wg.Wait()
	close(results)
	success := 0
	for e := range results {
		if e == nil {
			success++
		} else if !errors.Is(e, ErrConflict) {
			t.Fatal(e)
		}
	}
	if success != 1 {
		t.Fatalf("concurrent holds: %d accepted", success)
	}
}
