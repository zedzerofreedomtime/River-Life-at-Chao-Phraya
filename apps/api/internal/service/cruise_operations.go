package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/jackc/pgx/v5"
	"strings"
	"time"
)

type CruiseTicket struct {
	ID        string     `json:"id"`
	TableID   string     `json:"table_id"`
	Ordinal   int        `json:"ordinal"`
	CheckedIn *time.Time `json:"checked_in_at"`
}
type CruiseEmailStatus struct {
	Kind      string     `json:"kind"`
	Attempts  int        `json:"attempts"`
	SentAt    *time.Time `json:"sent_at"`
	StoppedAt *time.Time `json:"stopped_at"`
}
type CruiseReservationDetail struct {
	CruiseReservation
	Email   string              `json:"email"`
	Tickets []CruiseTicket      `json:"tickets"`
	Emails  []CruiseEmailStatus `json:"emails"`
}
type CruiseMailPayload struct {
	Booking Booking        `json:"booking"`
	Program BookingProgram `json:"program"`
}

func (s *Service) AdminCruiseReservations(ctx context.Context) ([]CruiseReservationDetail, error) {
	rows, err := s.DB.Query(ctx, `SELECT r.id,r.user_id FROM cruise_reservations r ORDER BY r.created_at DESC LIMIT 100`)
	if err != nil {
		return nil, err
	}
	type identity struct{ id, user string }
	ids := []identity{}
	for rows.Next() {
		var i identity
		if err = rows.Scan(&i.id, &i.user); err != nil {
			rows.Close()
			return nil, err
		}
		ids = append(ids, i)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}
	out := []CruiseReservationDetail{}
	for _, i := range ids {
		detail, e := s.CruiseReservationDetail(ctx, i.id, i.user)
		if e != nil {
			return nil, e
		}
		out = append(out, detail)
	}
	return out, nil
}
func (s *Service) CruiseReservationDetail(ctx context.Context, id, user string) (CruiseReservationDetail, error) {
	var out CruiseReservationDetail
	var err error
	out.CruiseReservation, err = s.CruiseReservation(ctx, id, user)
	if err != nil {
		return out, err
	}
	if err = s.DB.QueryRow(ctx, `SELECT u.email FROM cruise_reservations r JOIN users u ON u.id=r.user_id WHERE r.id=$1 AND r.user_id=$2`, id, user).Scan(&out.Email); err != nil {
		return out, err
	}
	out.Tickets = []CruiseTicket{}
	out.Emails = []CruiseEmailStatus{}
	if out.Status == "confirmed" {
		rows, e := s.DB.Query(ctx, `SELECT id,table_id,ordinal,checked_in_at FROM cruise_tickets WHERE reservation_id=$1 ORDER BY ordinal`, id)
		if e != nil {
			return out, e
		}
		for rows.Next() {
			var t CruiseTicket
			if e = rows.Scan(&t.ID, &t.TableID, &t.Ordinal, &t.CheckedIn); e != nil {
				rows.Close()
				return out, e
			}
			out.Tickets = append(out.Tickets, t)
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return out, e
		}
	}
	rows, e := s.DB.Query(ctx, `SELECT kind,attempts,sent_at,stopped_at FROM cruise_emails WHERE reservation_id=$1 ORDER BY kind`, id)
	if e != nil {
		return out, e
	}
	defer rows.Close()
	for rows.Next() {
		var status CruiseEmailStatus
		if e = rows.Scan(&status.Kind, &status.Attempts, &status.SentAt, &status.StoppedAt); e != nil {
			return out, e
		}
		out.Emails = append(out.Emails, status)
	}
	return out, rows.Err()
}

// Staff-verified bank payment only. Customer input never marks an order paid.
func (s *Service) ConfirmCruisePayment(ctx context.Context, id, actor, reference string, amount int) (CruiseReservationDetail, error) {
	return s.confirmCruisePayment(ctx, id, actor, strings.ToUpper(strings.TrimSpace(reference)), amount, "manual")
}

func (s *Service) confirmCruisePayment(ctx context.Context, id, actor, reference string, amount int, provider string) (CruiseReservationDetail, error) {
	if len(reference) < 8 || len(reference) > 100 || strings.ContainsAny(reference, "\r\n") || amount < 1 {
		return CruiseReservationDetail{}, ErrConflict
	}
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return CruiseReservationDetail{}, err
	}
	defer tx.Rollback(ctx)
	if provider == "manual" {
		var role string
		if err = tx.QueryRow(ctx, `SELECT role FROM users WHERE id=$1`, actor).Scan(&role); err != nil {
			return CruiseReservationDetail{}, err
		}
		if role != RoleAdmin {
			return CruiseReservationDetail{}, ErrConflict
		}
	} else if provider != "omise" {
		return CruiseReservationDetail{}, ErrConflict
	}
	var sailing, user string
	if err = tx.QueryRow(ctx, `SELECT sailing_id,user_id FROM cruise_reservations WHERE id=$1`, id).Scan(&sailing, &user); err != nil {
		return CruiseReservationDetail{}, err
	}
	if _, err = tx.Exec(ctx, `SELECT id FROM sailings WHERE id=$1 FOR UPDATE`, sailing); err != nil {
		return CruiseReservationDetail{}, err
	}
	var status, name, phone, email string
	var total, guests int
	var expires time.Time
	var tables, seatIDs []string
	var terms []byte
	err = tx.QueryRow(ctx, `SELECT r.status,r.total,r.guest_count,r.expires_at,r.table_ids,r.customer_name,r.customer_phone,u.email,r.terms,r.seat_ids FROM cruise_reservations r JOIN users u ON u.id=r.user_id WHERE r.id=$1 FOR UPDATE OF r`, id).Scan(&status, &total, &guests, &expires, &tables, &name, &phone, &email, &terms, &seatIDs)
	if err != nil {
		return CruiseReservationDetail{}, err
	}
	if total != amount {
		return CruiseReservationDetail{}, ErrConflict
	}
	if provider == "manual" {
		var gatewayPending bool
		if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM omise_checkouts WHERE reservation_id=$1)`, id).Scan(&gatewayPending); err != nil {
			return CruiseReservationDetail{}, err
		}
		if gatewayPending {
			return CruiseReservationDetail{}, ErrConflict
		}
	}
	if status == "confirmed" {
		var existing string
		if err = tx.QueryRow(ctx, `SELECT reference FROM cruise_payments WHERE reservation_id=$1`, id).Scan(&existing); err != nil {
			return CruiseReservationDetail{}, err
		}
		if existing != reference {
			return CruiseReservationDetail{}, ErrConflict
		}
		_ = tx.Rollback(ctx)
		return s.CruiseReservationDetail(ctx, id, user)
	}
	if status != "held" || !expires.After(time.Now()) {
		return CruiseReservationDetail{}, ErrConflict
	}
	tag, err := tx.Exec(ctx, `INSERT INTO cruise_payments(reservation_id,provider,reference,amount,actor_id) VALUES($1,$5,$2,$3,NULLIF($4,'')) ON CONFLICT DO NOTHING`, id, reference, amount, actor, provider)
	if err != nil {
		return CruiseReservationDetail{}, err
	}
	if tag.RowsAffected() != 1 {
		return CruiseReservationDetail{}, ErrConflict
	}
	if _, err = tx.Exec(ctx, `UPDATE cruise_reservations SET status='confirmed' WHERE id=$1`, id); err != nil {
		return CruiseReservationDetail{}, err
	}
	booking := Booking{ID: id, Name: name, Email: email, GuestCount: guests, Quantity: guests, Total: total, Status: "confirmed", TableIDs: tables, Tickets: []Ticket{}}
	if len(seatIDs) > 0 {
		tables = seatIDs
		booking.TableIDs = seatIDs
	}
	ordinal := 1
	for _, table := range tables {
		seats := 1
		if len(seatIDs) == 0 {
			if err = tx.QueryRow(ctx, `SELECT seats FROM sailing_tables WHERE sailing_id=$1 AND id=$2`, sailing, table).Scan(&seats); err != nil {
				return CruiseReservationDetail{}, err
			}
		}
		for n := 0; n < seats && ordinal <= guests; n++ {
			ticketID := "RLC1." + Token()
			if _, err = tx.Exec(ctx, `INSERT INTO cruise_tickets(id,reservation_id,table_id,ordinal) VALUES($1,$2,$3,$4)`, ticketID, id, table, ordinal); err != nil {
				return CruiseReservationDetail{}, err
			}
			booking.Tickets = append(booking.Tickets, Ticket{ID: ticketID, TableID: table})
			ordinal++
		}
	}
	if ordinal != guests+1 {
		return CruiseReservationDetail{}, ErrConflict
	}
	var snapshot struct {
		Title     string    `json:"title"`
		Vessel    string    `json:"vessel"`
		Departure time.Time `json:"departure_at"`
		Boarding  time.Time `json:"boarding_at"`
		Pier      string    `json:"pier"`
	}
	if err = json.Unmarshal(terms, &snapshot); err != nil {
		return CruiseReservationDetail{}, err
	}
	loc := time.FixedZone("Asia/Bangkok", 7*3600)
	date := snapshot.Departure.In(loc).Format("2006-01-02")
	program := BookingProgram{Title: snapshot.Vessel + " · " + snapshot.Title, SailingDate: &date, Boarding: snapshot.Boarding.In(loc).Format("15:04"), Departure: snapshot.Departure.In(loc).Format("15:04"), FullPier: snapshot.Pier}
	if provider == "omise" {
		program.Title = "[TEST · Omise sandbox] " + program.Title
	}
	var notes string
	var requests []string
	var tableTotal, extraTotal int
	if err = tx.QueryRow(ctx, `SELECT notes,requests,table_total,extras_total FROM cruise_reservations WHERE id=$1`, id).Scan(&notes, &requests, &tableTotal, &extraTotal); err != nil {
		return CruiseReservationDetail{}, err
	}
	program.ExtraDetails = fmt.Sprintf("ค่าที่นั่ง / Seating: THB %.2f\nบริการเสริม / Extras: THB %.2f\n", float64(tableTotal)/100, float64(extraTotal)/100)
	rows, err := tx.Query(ctx, `SELECT name,quantity,unit_price FROM cruise_reservation_items WHERE reservation_id=$1 ORDER BY extra_id`, id)
	if err != nil {
		return CruiseReservationDetail{}, err
	}
	for rows.Next() {
		var label string
		var quantity, unit int
		if err = rows.Scan(&label, &quantity, &unit); err != nil {
			rows.Close()
			return CruiseReservationDetail{}, err
		}
		program.ExtraDetails += fmt.Sprintf("%s × %d: THB %.2f\n", label, quantity, float64(quantity*unit)/100)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return CruiseReservationDetail{}, err
	}
	if len(requests) > 0 {
		program.ExtraDetails += "คำขอรอยืนยัน / Enquiries (not priced): " + strings.Join(requests, ", ") + "\n"
	}
	if notes != "" {
		program.ExtraDetails += "หมายเหตุ / Notes: " + notes + "\n"
	}
	if phone != "" {
		program.ExtraDetails += "โทรศัพท์ / Phone: " + phone + "\n"
	}
	payload, err := json.Marshal(CruiseMailPayload{Booking: booking, Program: program})
	if err != nil {
		return CruiseReservationDetail{}, err
	}
	for _, kind := range []string{"booking", "tickets"} {
		if _, err = tx.Exec(ctx, `INSERT INTO cruise_emails(reservation_id,kind,payload) VALUES($1,$2,$3)`, id, kind, payload); err != nil {
			return CruiseReservationDetail{}, err
		}
	}
	if _, err = tx.Exec(ctx, `INSERT INTO cruise_admin_audit(actor_id,sailing_id,action) VALUES(NULLIF($1,''),$2,$3)`, actor, sailing, provider+":confirm-payment:"+id); err != nil {
		return CruiseReservationDetail{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return CruiseReservationDetail{}, err
	}
	return s.CruiseReservationDetail(ctx, id, user)
}

func (s *Service) CheckInCruiseTicket(ctx context.Context, code, sailing, actor string) (CruiseTicket, error) {
	var out CruiseTicket
	if !strings.HasPrefix(code, "RLC1.") || len(code) != 69 || sailing == "" {
		return out, ErrConflict
	}
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return out, err
	}
	defer tx.Rollback(ctx)
	var role string
	if err = tx.QueryRow(ctx, `SELECT role FROM users WHERE id=$1`, actor).Scan(&role); err != nil {
		return out, err
	}
	if role != RoleAdmin && role != RoleOperator {
		return out, ErrConflict
	}
	var status string
	var boarding, departure time.Time
	err = tx.QueryRow(ctx, `SELECT t.id,t.table_id,t.ordinal,t.checked_in_at,r.status,s.boarding_at,s.departure_at FROM cruise_tickets t JOIN cruise_reservations r ON r.id=t.reservation_id JOIN sailings s ON s.id=r.sailing_id WHERE t.id=$1 AND r.sailing_id=$2 FOR UPDATE OF t`, code, sailing).Scan(&out.ID, &out.TableID, &out.Ordinal, &out.CheckedIn, &status, &boarding, &departure)
	if err != nil {
		return out, err
	}
	now := time.Now()
	if status != "confirmed" || out.CheckedIn != nil || boarding.After(now) || !departure.After(now) {
		return out, ErrConflict
	}
	if err = tx.QueryRow(ctx, `UPDATE cruise_tickets SET checked_in_at=now(),checked_in_by=$2 WHERE id=$1 RETURNING checked_in_at`, code, actor).Scan(&out.CheckedIn); err != nil {
		return out, err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO cruise_admin_audit(actor_id,sailing_id,action) VALUES($1,$2,$3)`, actor, sailing, "check-in:"+Hash(code)); err != nil {
		return out, err
	}
	return out, tx.Commit(ctx)
}

func DeliverNextCruiseEmail(ctx context.Context, s *Service, sender BookingMailSender) (bool, error) {
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)
	var id, kind string
	var raw []byte
	var attempts int
	err = tx.QueryRow(ctx, `SELECT reservation_id,kind,payload,attempts FROM cruise_emails WHERE sent_at IS NULL AND stopped_at IS NULL AND attempts<8 AND next_attempt_at<=now() ORDER BY created_at,kind FOR UPDATE SKIP LOCKED LIMIT 1`).Scan(&id, &kind, &raw, &attempts)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	var status string
	if err = tx.QueryRow(ctx, `SELECT status FROM cruise_reservations WHERE id=$1`, id).Scan(&status); err != nil {
		return true, err
	}
	if status != "confirmed" {
		_, err = tx.Exec(ctx, `UPDATE cruise_emails SET stopped_at=now() WHERE reservation_id=$1 AND kind=$2`, id, kind)
	} else {
		var payload CruiseMailPayload
		if err = json.Unmarshal(raw, &payload); err != nil {
			return true, err
		}
		sendCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
		sendErr := sender.SendBookingMail(sendCtx, payload.Booking, payload.Program, kind, false)
		cancel()
		if sendErr == nil {
			_, err = tx.Exec(ctx, `UPDATE cruise_emails SET sent_at=now(),attempts=attempts+1 WHERE reservation_id=$1 AND kind=$2`, id, kind)
		} else {
			_, err = tx.Exec(ctx, `UPDATE cruise_emails SET attempts=attempts+1,stopped_at=CASE WHEN attempts+1>=8 THEN now() ELSE NULL END,next_attempt_at=now()+($3*interval '1 minute') WHERE reservation_id=$1 AND kind=$2`, id, kind, 1<<attempts)
		}
	}
	if err != nil {
		return true, err
	}
	return true, tx.Commit(ctx)
}
func RunCruiseEmails(ctx context.Context, s *Service, sender BookingMailSender) {
	for ctx.Err() == nil {
		worked, err := DeliverNextCruiseEmail(ctx, s, sender)
		if worked && err == nil {
			continue
		}
		timer := time.NewTimer(5 * time.Second)
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
		}
	}
}
