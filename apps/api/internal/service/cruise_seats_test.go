package service

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"
)

func TestIndividualCruiseChairs(t *testing.T) {
	s := isolatedTableService(t)
	ctx := context.Background()
	_, err := s.DB.Exec(ctx, `INSERT INTO users(id,email,role) VALUES('staff','staff@seat.test','admin'),('one','one@seat.test','user'),('two','two@seat.test','user'),('three','three@seat.test','user'),('four','four@seat.test','user')`)
	if err != nil {
		t.Fatal(err)
	}
	dep := time.Now().Add(time.Hour)
	board := time.Now().Add(-time.Minute)
	v, err := s.SaveSailing(ctx, Sailing{VesselID: "unicorn", Title: "Chair QA", Status: "published", Verified: true, Departure: &dep, Boarding: &board, Pier: "QA", Tables: []SailingTable{{ID: "A1", Deck: "upper", Seats: 4, Price: 800000, SeatPrice: 210000, X: 280, Y: 150}, {ID: "A2", Deck: "upper", Seats: 4, Price: 800000, X: 480, Y: 150}}}, "staff")
	if err != nil {
		t.Fatal(err)
	}
	input := func(ids ...string) ReserveCruiseInput {
		return ReserveCruiseInput{SailingID: v.ID, SeatIDs: ids, Guests: len(ids), ExpectedTotal: 210000 * len(ids)}
	}
	for _, bad := range []ReserveCruiseInput{input("A1:1", "A1:1"), input("A1:5"), input("A1:01"), input("A2:1"), input("missing:1"), {SailingID: v.ID, SeatIDs: []string{"A1:1"}, Guests: 2, ExpectedTotal: 210000}, {SailingID: v.ID, SeatIDs: []string{"A1:1"}, Tables: []string{"A1"}, Guests: 1, ExpectedTotal: 210000}, {SailingID: v.ID, SeatIDs: []string{"A1:1"}, Guests: 1, ExpectedTotal: 1}} {
		if _, err = s.ReserveCruise(ctx, bad, "one", Token()); !errors.Is(err, ErrConflict) {
			t.Fatalf("invalid chair selection accepted: %+v: %v", bad, err)
		}
	}
	key := Token()
	first, err := s.ReserveCruise(ctx, input("A1:1"), "one", key)
	if err != nil || first.Total != 210000 || len(first.SeatIDs) != 1 {
		t.Fatal("single chair failed", first, err)
	}
	retry, err := s.ReserveCruise(ctx, input("A1:1"), "one", key)
	if err != nil || retry.ID != first.ID {
		t.Fatal("retry duplicated", err)
	}
	if _, err = s.ReserveCruise(ctx, input("A1:1"), "two", Token()); !errors.Is(err, ErrConflict) {
		t.Fatal("chair oversold", err)
	}
	whole := ReserveCruiseInput{SailingID: v.ID, Tables: []string{"A1"}, Guests: 4, ExpectedTotal: 800000}
	if _, err = s.ReserveCruise(ctx, whole, "two", Token()); !errors.Is(err, ErrConflict) {
		t.Fatal("whole table overlapped chair", err)
	}
	shared, err := s.ReserveCruise(ctx, input("A1:2"), "two", Token())
	if err != nil {
		t.Fatal("shared table rejected", err)
	}
	public, err := s.Sailings(ctx, "unicorn", false)
	if err != nil || len(public) != 1 || len(public[0].Tables[0].AvailableSeats) != 2 || public[0].Tables[0].Available {
		t.Fatal("incorrect public availability", public, err)
	}
	confirmed, err := s.ConfirmCruisePayment(ctx, first.ID, "staff", "TEST-CHAIR-PAY-1", first.Total)
	if err != nil || len(confirmed.Tickets) != 1 || confirmed.Tickets[0].TableID != "A1:1" || len(confirmed.Emails) != 2 {
		t.Fatal("chair ticket/email incomplete", confirmed, err)
	}
	admitted, err := s.CheckInCruiseTicket(ctx, confirmed.Tickets[0].ID, v.ID, "staff")
	_ = admitted
	if err != nil {
		t.Fatal("chair check-in failed", err)
	}
	if err = s.CancelCruiseReservation(ctx, shared.ID, "two"); err != nil {
		t.Fatal(err)
	}
	// Different accounts racing the same chair must produce exactly one hold.
	var wg sync.WaitGroup
	results := make(chan error, 2)
	for _, user := range []string{"three", "four"} {
		wg.Add(1)
		go func(user string) {
			defer wg.Done()
			_, e := s.ReserveCruise(ctx, input("A1:2"), user, Token())
			results <- e
		}(user)
	}
	wg.Wait()
	close(results)
	wins := 0
	for e := range results {
		if e == nil {
			wins++
		} else if !errors.Is(e, ErrConflict) {
			t.Fatal(e)
		}
	}
	if wins != 1 {
		t.Fatalf("concurrent chair holds: %d", wins)
	}
	// Expiry releases only the unconfirmed chair; confirmed A1:1 remains blocked.
	_, err = s.DB.Exec(ctx, `UPDATE cruise_reservations SET expires_at=now()-interval '1 second' WHERE status='held'`)
	if err != nil {
		t.Fatal(err)
	}
	whole.Tables = []string{"A2"}
	if _, err = s.ReserveCruise(ctx, whole, "two", Token()); err != nil {
		t.Fatal("whole-table compatibility", err)
	}
	if _, err = s.ReserveCruise(ctx, input("A2:1"), "three", Token()); !errors.Is(err, ErrConflict) {
		t.Fatal("whole table did not block chair", err)
	}
	public, err = s.Sailings(ctx, "unicorn", false)
	if err != nil || len(public[0].Tables[0].AvailableSeats) != 3 {
		t.Fatal("expiry or confirmation availability", err)
	}
}
