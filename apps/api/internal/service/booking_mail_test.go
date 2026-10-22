package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"image/png"
	"io"
	"mime"
	"mime/multipart"
	"net/mail"
	"os"
	"strings"
	"testing"
	"time"

	"riverlife/api/internal/repository"
)

func TestBookingMessages(t *testing.T) {
	date := "2026-12-01"
	b := Booking{ID: "booking-test", Name: "<script>unsafe</script>", Email: "customer@example.test", Quantity: 2, Total: 12300, Tickets: []Ticket{{ID: strings.Repeat("a", 64), TableID: "U01"}, {ID: strings.Repeat("b", 64), TableID: "U01"}}, TableIDs: []string{"U01"}, GuestCount: 2}
	p := BookingProgram{Title: "River Life", SailingDate: &date, Boarding: "18:45", Departure: "19:00", Pier: "ICONSIAM", PierNumber: 4}
	for _, kind := range []string{"booking", "tickets"} {
		raw, err := bookingMessage("River Life <sender@example.test>", b, p, kind, true)
		if err != nil {
			t.Fatal(err)
		}
		m, err := mail.ReadMessage(bytes.NewReader(raw))
		if err != nil {
			t.Fatal(err)
		}
		subject, err := new(mime.WordDecoder).DecodeHeader(m.Header.Get("Subject"))
		if err != nil || !strings.Contains(subject, "[DEMO]") {
			t.Fatal("missing demo subject", err)
		}
		_, params, _ := mime.ParseMediaType(m.Header.Get("Content-Type"))
		r := multipart.NewReader(m.Body, params["boundary"])
		root, err := r.NextPart()
		if err != nil {
			t.Fatal(err)
		}
		_, params, _ = mime.ParseMediaType(root.Header.Get("Content-Type"))
		alt := multipart.NewReader(root, params["boundary"])
		plain, _ := alt.NextPart()
		text, _ := io.ReadAll(base64.NewDecoder(base64.StdEncoding, plain))
		if !strings.Contains(string(text), "THB 123.00") || !strings.Contains(string(text), date) || !strings.Contains(string(text), "U01") {
			t.Fatal("booking details missing")
		}
		htmlPart, _ := alt.NextPart()
		markup, _ := io.ReadAll(base64.NewDecoder(base64.StdEncoding, htmlPart))
		if strings.Contains(string(markup), "<script>") || !strings.Contains(string(markup), "&lt;script&gt;") {
			t.Fatal("HTML escaping failed")
		}
		images := 0
		for {
			part, e := r.NextPart()
			if e == io.EOF {
				break
			}
			if e != nil {
				t.Fatal(e)
			}
			img, e := png.Decode(base64.NewDecoder(base64.StdEncoding, part))
			if e != nil || img.Bounds().Dx() != 320 {
				t.Fatal("invalid QR PNG", e)
			}
			images++
		}
		want := 0
		if kind == "tickets" {
			want = 2
		}
		if images != want {
			t.Fatalf("%s images=%d", kind, images)
		}
	}
	b.Email = "customer@example.test\r\nBcc: victim@example.test"
	if _, err := bookingMessage("sender@example.test", b, p, "booking", false); err == nil {
		t.Fatal("header injection accepted")
	}
}

type capturedBookingMail struct {
	kinds     []string
	fail      bool
	recipient string
	tickets   int
}

func (m *capturedBookingMail) SendBookingMail(_ context.Context, b Booking, _ BookingProgram, kind string, _ bool) error {
	m.kinds = append(m.kinds, kind)
	m.recipient = b.Email
	m.tickets = len(b.Tickets)
	if m.fail {
		return errors.New("simulated SMTP outage")
	}
	return nil
}

func TestBookingEmailQueue(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	ctx := context.Background()
	db, err := repository.Open(ctx, os.Getenv("TEST_DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	zone := "mail-test-" + Token()[:12]
	if _, err = db.Exec(ctx, "INSERT INTO zones(id,name,capacity,price) VALUES($1,'Mail test',20,12300)", zone); err != nil {
		t.Fatal(err)
	}
	defer func() {
		for _, table := range []string{"audit_log", "tickets", "stripe_checkouts"} {
			_, _ = db.Exec(ctx, "DELETE FROM "+table+" WHERE booking_id IN (SELECT id FROM bookings WHERE zone_id=$1)", zone)
		}
		_, _ = db.Exec(ctx, "DELETE FROM bookings WHERE zone_id=$1", zone)
		_, _ = db.Exec(ctx, "DELETE FROM zones WHERE id=$1", zone)
	}()
	svc := &Service{DB: db, DemoConfirmation: true}
	token := Token()
	b, err := svc.Create(ctx, Input{ZoneID: zone, Name: "Mail Test", Email: "customer@example.test", Quantity: 2}, Token(), token)
	if err != nil {
		t.Fatal(err)
	}
	var count int
	_ = db.QueryRow(ctx, "SELECT count(*) FROM booking_emails WHERE booking_id=$1", b.ID).Scan(&count)
	if count != 0 {
		t.Fatal("held booking queued mail")
	}
	tx, _ := db.Begin(ctx)
	_, err = tx.Exec(ctx, "UPDATE bookings SET status='confirmed' WHERE id=$1", b.ID)
	if err != nil {
		t.Fatal(err)
	}
	_ = tx.Rollback(ctx)
	_ = db.QueryRow(ctx, "SELECT count(*) FROM booking_emails WHERE booking_id=$1", b.ID).Scan(&count)
	if count != 0 {
		t.Fatal("rolled back confirmation leaked email")
	}
	if err = svc.SubmitAttachment(ctx, b.ID, token, "test.png", false, "th"); err != nil {
		t.Fatal(err)
	}
	_, _ = db.Exec(ctx, "UPDATE bookings SET status='confirmed' WHERE id=$1", b.ID)
	_ = db.QueryRow(ctx, "SELECT count(*) FROM booking_emails WHERE booking_id=$1", b.ID).Scan(&count)
	if count != 2 {
		t.Fatalf("expected two jobs, got %d", count)
	}
	sender := &capturedBookingMail{fail: true}
	if worked, e := DeliverNextBookingEmail(ctx, db, sender, true); e != nil || !worked {
		t.Fatal("retry recording failed", e)
	}
	sender.fail = false
	if worked, e := DeliverNextBookingEmail(ctx, db, sender, true); e != nil || !worked {
		t.Fatal("independent second email failed", e)
	}
	_, _ = db.Exec(ctx, "UPDATE booking_emails SET next_attempt_at=now() WHERE booking_id=$1", b.ID)
	if worked, e := DeliverNextBookingEmail(ctx, db, sender, true); e != nil || !worked {
		t.Fatal("retry failed", e)
	}
	if worked, e := DeliverNextBookingEmail(ctx, db, sender, true); e != nil || worked {
		t.Fatal("sent emails duplicated", e)
	}
	if len(sender.kinds) != 3 || sender.recipient != b.Email || sender.tickets != 2 {
		t.Fatal("wrong recipient or ticket collection", sender)
	}
	_ = db.QueryRow(ctx, "SELECT count(*) FROM booking_emails WHERE booking_id=$1 AND sent_at IS NOT NULL", b.ID).Scan(&count)
	if count != 2 {
		t.Fatal("sent state not persisted")
	}
	// A real-mode upload must not mutate a held booking, issue tickets or queue mail.
	live := &Service{DB: db}
	held, e := svc.Create(ctx, Input{ZoneID: zone, Name: "Live guard", Email: "customer@example.test", Quantity: 1}, Token(), token)
	if e != nil {
		t.Fatal(e)
	}
	if e = live.SubmitAttachment(ctx, held.ID, token, "test.png", false, "th"); !errors.Is(e, ErrConflict) {
		t.Fatal("live upload accepted", e)
	}
	unchanged, e := svc.Get(ctx, held.ID, token, false)
	if e != nil || unchanged.Status != "held" || len(unchanged.Tickets) != 0 || unchanged.HasAttachment {
		t.Fatal("live upload changed booking", e)
	}
	_ = db.QueryRow(ctx, "SELECT count(*) FROM booking_emails WHERE booking_id=$1", held.ID).Scan(&count)
	if count != 0 {
		t.Fatal("live upload queued email")
	}
	_, e = db.Exec(ctx, "UPDATE bookings SET status='review' WHERE id=$1", held.ID)
	if e != nil {
		t.Fatal(e)
	}
	if e = live.AutoConfirmReviews(ctx); e != nil {
		t.Fatal(e)
	}
	unchanged, e = svc.Get(ctx, held.ID, token, false)
	if e != nil || unchanged.Status != "review" {
		t.Fatal("live legacy review auto-confirmed", e)
	}

	// While SMTP is in flight cancellation must wait for the booking lock.
	_, _ = db.Exec(ctx, "UPDATE booking_emails SET sent_at=NULL WHERE booking_id=$1", b.ID)
	blocking := &blockingBookingMail{entered: make(chan struct{}), release: make(chan struct{})}
	defer close(blocking.release)
	done := make(chan error, 1)
	go func() { _, e := DeliverNextBookingEmail(ctx, db, blocking, true); done <- e }()
	select {
	case <-blocking.entered:
	case <-time.After(5 * time.Second):
		t.Fatal("worker did not reach SMTP")
	}
	cancelCtx, cancel := context.WithTimeout(ctx, 150*time.Millisecond)
	err = svc.CancelByAdmin(cancelCtx, b.ID)
	cancel()
	if err == nil {
		t.Fatal("cancellation overtook in-flight SMTP")
	}
	blocking.release <- struct{}{}
	select {
	case e := <-done:
		if e != nil {
			t.Fatal(e)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("worker stuck")
	}
	// Cancelled bookings must not deliver remaining pending tickets.
	_, _ = db.Exec(ctx, "UPDATE booking_emails SET sent_at=NULL WHERE booking_id=$1", b.ID)
	if err = svc.CancelByAdmin(ctx, b.ID); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 2; i++ {
		if _, e := DeliverNextBookingEmail(ctx, db, sender, true); e != nil {
			t.Fatal(e)
		}
	}
	if len(sender.kinds) != 3 {
		t.Fatal("cancelled booking sent email")
	}
}

type blockingBookingMail struct{ entered, release chan struct{} }

func (m *blockingBookingMail) SendBookingMail(ctx context.Context, _ Booking, _ BookingProgram, _ string, _ bool) error {
	close(m.entered)
	select {
	case <-m.release:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func TestLiveConfirmationDisabledWithoutDatabase(t *testing.T) {
	svc := &Service{}
	if err := svc.SubmitAttachment(context.Background(), "id", "token", "slip.png", false, "th"); !errors.Is(err, ErrConflict) {
		t.Fatal(err)
	}
	if err := svc.AutoConfirmReviews(context.Background()); err != nil {
		t.Fatal(err)
	}
}
