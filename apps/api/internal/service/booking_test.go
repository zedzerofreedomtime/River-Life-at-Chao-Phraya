package service

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"riverlife/api/internal/repository"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestToken(t *testing.T) {
	a, b := Token(), Token()
	if len(a) != 64 || a == b || Hash(a) == a {
		t.Fatal("invalid token generation")
	}
}

// Uses isolated fixture zone IDs and deletes only records created by this test.
func TestInventoryLifecycle(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required for PostgreSQL integration")
	}
	ctx := context.Background()
	db, err := repository.Open(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	s := Service{DB: db}
	zone := "test-" + Token()[:12]
	_, err = db.Exec(ctx, "INSERT INTO zones(id,name,capacity,price) VALUES($1,'Test',3,10000)", zone)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		_, _ = db.Exec(ctx, "DELETE FROM audit_log WHERE booking_id IN (SELECT id FROM bookings WHERE zone_id=$1)", zone)
		_, _ = db.Exec(ctx, "DELETE FROM tickets WHERE booking_id IN (SELECT id FROM bookings WHERE zone_id=$1)", zone)
		_, _ = db.Exec(ctx, "DELETE FROM bookings WHERE zone_id=$1", zone)
		_, _ = db.Exec(ctx, "DELETE FROM zones WHERE id=$1", zone)
	}()
	var wg sync.WaitGroup
	var success atomic.Int32
	var first Booking
	var auth, key string
	var mu sync.Mutex
	for i := 0; i < 12; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			tk, k := Token(), Token()
			b, e := s.Create(ctx, Input{ZoneID: zone, Name: "Test", Email: "test@example.com", Quantity: 1}, k, tk)
			if e == nil {
				success.Add(1)
				mu.Lock()
				first, auth, key = b, tk, k
				mu.Unlock()
			} else if !errors.Is(e, ErrConflict) {
				t.Error(e)
			}
		}()
	}
	wg.Wait()
	if success.Load() != 3 {
		t.Fatalf("oversell or missing inventory: %d", success.Load())
	}
	again, err := s.Create(ctx, Input{ZoneID: zone, Name: "Test", Email: "test@example.com", Quantity: 1}, key, auth)
	if err != nil || again.ID != first.ID {
		t.Fatal("idempotency failed", err)
	}
	cfg := db.Config()
	cfg.MaxConns = 1
	narrow, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer narrow.Close()
	retryCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	narrowService := Service{DB: narrow}
	if _, err = narrowService.Create(retryCtx, Input{ZoneID: zone, Name: "Test", Email: "test@example.com", Quantity: 1}, key, auth); err != nil {
		t.Fatal("idempotent retry exhausted single-connection pool", err)
	}
	if err = s.UpdateZone(ctx, zone, ZoneUpdate{Name: "Test", Capacity: 2, Price: 10000}); !errors.Is(err, ErrConflict) {
		t.Fatal("capacity reduction below reserved inventory accepted", err)
	}
	if _, err = s.Get(ctx, first.ID, "wrong", false); err == nil {
		t.Fatal("unauthorized booking access")
	}
	b, err := s.Get(ctx, first.ID, auth, false)
	if err != nil || b.Status != "confirmed" || len(b.Tickets) != 1 {
		t.Fatal("ticket issuance failed", err)
	}
	if err = s.CheckIn(ctx, b.Tickets[0].ID); err != nil {
		t.Fatal(err)
	}
	if err = s.CheckIn(ctx, b.Tickets[0].ID); !errors.Is(err, ErrConflict) {
		t.Fatal("double check-in accepted")
	}
	if err = s.Decide(ctx, first.ID, "no_show"); !errors.Is(err, ErrConflict) {
		t.Fatal("checked in marked no show")
	}
}
