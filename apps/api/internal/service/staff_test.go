package service

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"os"
	"riverlife/api/internal/repository"
	"sync"
	"testing"
)

func TestStaffBookingAndBoarding(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("isolated PostgreSQL required")
	}
	ctx := context.Background()
	db, err := repository.Open(ctx, os.Getenv("TEST_DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	s := &Service{DB: db, DemoConfirmation: true}
	sale, other, customer, admin := Token(), Token(), Token(), Token()
	zone := "staff-" + Token()[:12]
	for id, role := range map[string]string{sale: RoleSales, other: RoleOperator, customer: RoleUser, admin: RoleAdmin} {
		if _, err = db.Exec(ctx, "INSERT INTO users(id,email,name,role) VALUES($1,$2,'Test',$3)", id, id+"@example.test", role); err != nil {
			t.Fatal(err)
		}
	}
	if _, err = db.Exec(ctx, "INSERT INTO zones(id,name,capacity,price) VALUES($1,'Staff test',5,12000)", zone); err != nil {
		t.Fatal(err)
	}
	defer func() {
		db.Exec(ctx, "DELETE FROM staff_audit WHERE actor_id IN ($1,$2,$3,$4)", sale, other, customer, admin)
		for _, table := range []string{"audit_log", "tickets", "stripe_checkouts"} {
			db.Exec(ctx, "DELETE FROM "+table+" WHERE booking_id IN (SELECT id FROM bookings WHERE zone_id=$1)", zone)
		}
		db.Exec(ctx, "DELETE FROM bookings WHERE zone_id=$1", zone)
		db.Exec(ctx, "DELETE FROM zones WHERE id=$1", zone)
		db.Exec(ctx, "DELETE FROM users WHERE id IN ($1,$2,$3,$4)", sale, other, customer, admin)
	}()
	token, key := Token(), Token()
	in := Input{Name: "Customer", Email: customer + "@example.test", ZoneID: zone, Quantity: 2}
	b, err := s.SalesCreate(ctx, in, key, token, sale)
	if err != nil {
		t.Fatal(err)
	}
	items, err := s.SalesBookings(ctx, sale)
	if err != nil || len(items) != 1 || items[0].ID != b.ID {
		t.Fatal("sales ownership", err)
	}
	items, err = s.SalesBookings(ctx, other)
	if err != nil || len(items) != 0 {
		t.Fatal("cross-sales leak")
	}
	customerBookings, err := s.ListForUser(ctx, customer)
	if err != nil || len(customerBookings) != 1 {
		t.Fatal("customer link", err)
	}
	if _, err = s.SalesCreate(ctx, in, key, token, other); !errors.Is(err, ErrConflict) {
		t.Fatal("retry changed salesperson")
	}
	if _, _, err = s.SalesAccess(ctx, b.ID, other); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal("foreign sales access")
	}
	_, customerToken, err := s.AccountAccess(ctx, b.ID, customer)
	if err != nil {
		t.Fatal(err)
	}
	_, salesToken, err := s.SalesAccess(ctx, b.ID, sale)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.Get(ctx, b.ID, customerToken, false); err != nil {
		t.Fatal("sales revoked customer access")
	}
	if err = s.SubmitAttachment(ctx, b.ID, salesToken, "test.png", false, "en"); err != nil {
		t.Fatal(err)
	}
	ready, err := s.Get(ctx, b.ID, token, false)
	if err != nil || len(ready.Tickets) != 2 {
		t.Fatal("tickets", err)
	}
	var wg sync.WaitGroup
	var mu sync.Mutex
	accepted := 0
	for i := 0; i < 6; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if s.CheckIn(ctx, ready.Tickets[0].ID, other) == nil {
				mu.Lock()
				accepted++
				mu.Unlock()
			}
		}()
	}
	wg.Wait()
	if accepted != 1 {
		t.Fatalf("accepted %d repeated scans", accepted)
	}
	passengers, err := s.Passengers(ctx)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, p := range passengers {
		if p.ID == b.ID {
			found = true
			if p.CheckedIn != 1 || p.Quantity != 2 {
				t.Fatal("wrong boarding totals")
			}
		}
	}
	if !found {
		t.Fatal("passenger missing")
	}
	if err = s.CancelByAdmin(ctx, b.ID); !errors.Is(err, ErrConflict) {
		t.Fatal("cancelled checked-in booking")
	}
	if err = s.UpdateZone(ctx, zone, ZoneUpdate{Name: "Staff test", Capacity: 1, Price: 100}); !errors.Is(err, ErrConflict) {
		t.Fatal("capacity below reservations")
	}
	if err = s.SetRole(ctx, admin, admin, RoleUser); !errors.Is(err, ErrConflict) {
		t.Fatal("self demotion")
	}
	if err = s.SetRole(ctx, sale, customer, RoleAdmin); !errors.Is(err, ErrConflict) {
		t.Fatal("non-admin promoted customer")
	}
	if err = s.SetRole(ctx, admin, customer, RoleSales); err != nil {
		t.Fatal(err)
	}
	changed, err := s.User(ctx, customer)
	if err != nil || changed.Role != RoleSales {
		t.Fatal("role not persisted")
	}
	if err = s.SetRole(ctx, admin, sale, RoleOperator); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Get(ctx, b.ID, salesToken, false); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal("revoked staff credential still works")
	}
	if _, _, err = s.SalesAccess(ctx, b.ID, sale); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal("revoked salesperson recovered credential")
	}
	if _, err = s.Get(ctx, b.ID, customerToken, false); err != nil {
		t.Fatal("revocation invalidated customer access")
	}
}
