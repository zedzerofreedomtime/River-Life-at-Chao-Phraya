package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"time"
)

var ErrConflict = errors.New("รายการเปลี่ยนแปลงหรือโควตาไม่เพียงพอ")

type Service struct{ DB *pgxpool.Pool }
type Zone struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Capacity  int    `json:"capacity"`
	Price     int    `json:"price"`
	Available int    `json:"available"`
}
type Input struct {
	ZoneID    string `json:"zone_id" binding:"required"`
	Name      string `json:"name" binding:"required,max=120"`
	Email     string `json:"email" binding:"required,email,max=200"`
	Quantity  int    `json:"quantity" binding:"required,min=1,max=10"`
	AgentCode string `json:"agent_code" binding:"max=40"`
}
type Booking struct {
	ID        string    `json:"id"`
	ZoneID    string    `json:"zone_id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Quantity  int       `json:"quantity"`
	Total     int       `json:"total"`
	Status    string    `json:"status"`
	ExpiresAt time.Time `json:"expires_at"`
	AgentCode string    `json:"agent_code"`
	HasSlip   bool      `json:"has_slip"`
	Tickets   []Ticket  `json:"tickets"`
}
type Ticket struct {
	ID          string     `json:"id"`
	CheckedInAt *time.Time `json:"checked_in_at"`
}

func Token() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}
func Hash(v string) string { h := sha256.Sum256([]byte(v)); return hex.EncodeToString(h[:]) }

const columns = "id,zone_id,name,email,quantity,total,CASE WHEN status='held' AND expires_at<=now() THEN 'expired' ELSE status END,expires_at,agent_code,(slip_path<>'')"

func scan(row pgx.Row) (b Booking, err error) {
	err = row.Scan(&b.ID, &b.ZoneID, &b.Name, &b.Email, &b.Quantity, &b.Total, &b.Status, &b.ExpiresAt, &b.AgentCode, &b.HasSlip)
	b.Tickets = []Ticket{}
	return
}
func (s *Service) Zones(ctx context.Context) ([]Zone, error) {
	rows, err := s.DB.Query(ctx, `SELECT z.id,z.name,z.capacity,z.price,z.capacity-COALESCE((SELECT SUM(quantity) FROM bookings b WHERE b.zone_id=z.id AND (b.status IN ('review','confirmed','no_show') OR (b.status='held' AND b.expires_at>now()))),0) FROM zones z WHERE active ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Zone{}
	for rows.Next() {
		var z Zone
		if err = rows.Scan(&z.ID, &z.Name, &z.Capacity, &z.Price, &z.Available); err != nil {
			return nil, err
		}
		out = append(out, z)
	}
	return out, rows.Err()
}
func (s *Service) Hold(ctx context.Context, in Input, key, token string) (Booking, error) {
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return Booking{}, err
	}
	defer tx.Rollback(ctx)
	// Same idempotency key serializes before inventory locks; token is supplied by client for safe retry.
	if _, err = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtextextended($1,0))", key); err != nil {
		return Booking{}, err
	}
	raw, _ := json.Marshal(in)
	fingerprint := Hash(string(raw))
	var oldID, oldHash, oldToken string
	err = tx.QueryRow(ctx, "SELECT id,request_hash,token_hash FROM bookings WHERE request_key=$1", key).Scan(&oldID, &oldHash, &oldToken)
	if err == nil {
		if oldHash != fingerprint || oldToken != Hash(token) {
			return Booking{}, ErrConflict
		}
		// Release this connection before reading the result through the pool.
		// Otherwise concurrent retries can exhaust the pool while holding locks.
		if err = tx.Commit(ctx); err != nil {
			return Booking{}, err
		}
		return s.Get(ctx, oldID, token, false)
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return Booking{}, err
	}
	var capacity, price int
	err = tx.QueryRow(ctx, "SELECT capacity,price FROM zones WHERE id=$1 AND active FOR UPDATE", in.ZoneID).Scan(&capacity, &price)
	if err != nil {
		return Booking{}, err
	}
	var used int
	err = tx.QueryRow(ctx, "SELECT COALESCE(SUM(quantity),0) FROM bookings WHERE zone_id=$1 AND (status IN ('review','confirmed','no_show') OR (status='held' AND expires_at>now()))", in.ZoneID).Scan(&used)
	if err != nil {
		return Booking{}, err
	}
	if in.Quantity < 1 || in.Quantity > 10 || capacity-used < in.Quantity {
		return Booking{}, ErrConflict
	}
	id := Token()[:20]
	b, err := scan(tx.QueryRow(ctx, "INSERT INTO bookings(id,token_hash,request_key,request_hash,zone_id,name,email,quantity,total,agent_code,status,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'held',now()+interval '15 minutes') RETURNING "+columns, id, Hash(token), key, fingerprint, in.ZoneID, in.Name, in.Email, in.Quantity, price*in.Quantity, in.AgentCode))
	if err != nil {
		return b, err
	}
	_, err = tx.Exec(ctx, "INSERT INTO audit_log(booking_id,action) VALUES($1,'hold_created')", id)
	if err == nil {
		err = tx.Commit(ctx)
	}
	return b, err
}

// Submit confirms a held booking and issues one ticket per requested admission.
func (s *Service) Submit(ctx context.Context, id, token, path string) error {
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var quantity int
	err = tx.QueryRow(ctx, "UPDATE bookings SET status='confirmed',slip_path=$3 WHERE id=$1 AND token_hash=$2 AND status='held' AND expires_at>now() RETURNING quantity", id, Hash(token), path).Scan(&quantity)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrConflict
	}
	if err != nil {
		return err
	}
	for i := 0; i < quantity; i++ {
		if _, err = tx.Exec(ctx, "INSERT INTO tickets(id,booking_id) VALUES($1,$2)", Token(), id); err != nil {
			return err
		}
	}
	if _, err = tx.Exec(ctx, "INSERT INTO audit_log(booking_id,action) VALUES($1,'slip_uploaded_qr_issued')", id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
func (s *Service) Get(ctx context.Context, id, token string, admin bool) (Booking, error) {
	b, err := scan(s.DB.QueryRow(ctx, "SELECT "+columns+" FROM bookings WHERE id=$1 AND ($2 OR token_hash=$3)", id, admin, Hash(token)))
	if err != nil {
		return b, err
	}
	rows, err := s.DB.Query(ctx, "SELECT id,checked_in_at FROM tickets WHERE booking_id=$1 ORDER BY id", id)
	if err != nil {
		return b, err
	}
	defer rows.Close()
	for rows.Next() {
		var t Ticket
		if err = rows.Scan(&t.ID, &t.CheckedInAt); err != nil {
			return b, err
		}
		b.Tickets = append(b.Tickets, t)
	}
	return b, rows.Err()
}
// AutoConfirmReviews upgrades bookings created by the legacy review workflow.
func (s *Service) AutoConfirmReviews(ctx context.Context) error {
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	rows, err := tx.Query(ctx, "SELECT id,quantity FROM bookings WHERE status='review' FOR UPDATE")
	if err != nil {
		return err
	}
	defer rows.Close()
	type pending struct{ id string; quantity int }
	bookings := []pending{}
	for rows.Next() {
		var booking pending
		if err = rows.Scan(&booking.id, &booking.quantity); err != nil {
			return err
		}
		bookings = append(bookings, booking)
	}
	if err = rows.Err(); err != nil {
		return err
	}
	rows.Close()
	for _, booking := range bookings {
		if _, err = tx.Exec(ctx, "UPDATE bookings SET status='confirmed' WHERE id=$1", booking.id); err != nil {
			return err
		}
		for i := 0; i < booking.quantity; i++ {
			if _, err = tx.Exec(ctx, "INSERT INTO tickets(id,booking_id) VALUES($1,$2)", Token(), booking.id); err != nil {
				return err
			}
		}
		if _, err = tx.Exec(ctx, "INSERT INTO audit_log(booking_id,action) VALUES($1,'legacy_review_auto_confirmed')", booking.id); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
func (s *Service) Decide(ctx context.Context, id, action string) error {
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var status string
	var n int
	err = tx.QueryRow(ctx, "SELECT status,quantity FROM bookings WHERE id=$1 FOR UPDATE", id).Scan(&status, &n)
	if err != nil {
		return err
	}
	next := ""
	switch action {
	case "approve":
		if status != "review" {
			return ErrConflict
		}
		next = "confirmed"
	case "reject":
		if status != "review" {
			return ErrConflict
		}
		next = "cancelled"
	case "no_show":
		if status != "confirmed" {
			return ErrConflict
		}
		var checked int
		if err = tx.QueryRow(ctx, "SELECT count(*) FROM tickets WHERE booking_id=$1 AND checked_in_at IS NOT NULL", id).Scan(&checked); err != nil {
			return err
		}
		if checked > 0 {
			return ErrConflict
		}
		next = "no_show"
	default:
		return ErrConflict
	}
	if _, err = tx.Exec(ctx, "UPDATE bookings SET status=$2 WHERE id=$1", id, next); err != nil {
		return err
	}
	if action == "approve" {
		for i := 0; i < n; i++ {
			if _, err = tx.Exec(ctx, "INSERT INTO tickets(id,booking_id) VALUES($1,$2)", Token(), id); err != nil {
				return err
			}
		}
	}
	if _, err = tx.Exec(ctx, "INSERT INTO audit_log(booking_id,action) VALUES($1,$2)", id, action); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
func (s *Service) CheckIn(ctx context.Context, token string) error {
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var id, status string
	err = tx.QueryRow(ctx, "SELECT b.id,b.status FROM bookings b JOIN tickets t ON t.booking_id=b.id WHERE t.id=$1 FOR UPDATE OF b", token).Scan(&id, &status)
	if err != nil {
		return err
	}
	if status != "confirmed" {
		return ErrConflict
	}
	tag, err := tx.Exec(ctx, "UPDATE tickets SET checked_in_at=now() WHERE id=$1 AND checked_in_at IS NULL", token)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return fmt.Errorf("%w: บัตรนี้เช็กอินแล้ว", ErrConflict)
	}
	if _, err = tx.Exec(ctx, "INSERT INTO audit_log(booking_id,action) VALUES($1,'ticket_checked_in')", id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
func (s *Service) List(ctx context.Context) ([]Booking, error) {
	rows, err := s.DB.Query(ctx, "SELECT "+columns+" FROM bookings ORDER BY created_at DESC LIMIT 200")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Booking{}
	for rows.Next() {
		b, err := scan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}
