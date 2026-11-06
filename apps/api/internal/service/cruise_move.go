package service

import (
	"context"
	"encoding/json"
	"sort"
	"strconv"
	"strings"
)

// Same-sailing, same-price moves preserve the paid total. Price changes need a
// separate adjustment/refund, never an unchecked edit to a captured payment.
func (s *Service) MoveCruiseSeats(ctx context.Context, actor, id, reason string, seats []string) error {
	if err := s.managementAdmin(ctx, actor); err != nil {
		return err
	}
	if len(strings.TrimSpace(reason)) < 3 || len(reason) > 500 || len(seats) < 1 || len(seats) > 200 {
		return ErrConflict
	}
	sort.Strings(seats)
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	rows, err := tx.Query(ctx, `SELECT kind FROM cruise_emails WHERE reservation_id=$1 ORDER BY kind FOR UPDATE`, id)
	if err != nil {
		return err
	}
	for rows.Next() {
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	var sailing string
	if err = tx.QueryRow(ctx, `SELECT sailing_id FROM cruise_reservations WHERE id=$1`, id).Scan(&sailing); err != nil {
		return err
	}
	var published string
	if err = tx.QueryRow(ctx, `SELECT status FROM sailings WHERE id=$1 AND departure_at>now() FOR UPDATE`, sailing).Scan(&published); err != nil {
		return err
	}
	var guests, total int
	var status string
	if err = tx.QueryRow(ctx, `SELECT guest_count,table_total,status FROM cruise_reservations WHERE id=$1 FOR UPDATE`, id).Scan(&guests, &total, &status); err != nil {
		return err
	}
	if status != "confirmed" || len(seats) != guests {
		return ErrConflict
	}
	ticketRows, err := tx.Query(ctx, `SELECT id FROM cruise_tickets WHERE reservation_id=$1 ORDER BY ordinal FOR UPDATE`, id)
	if err != nil {
		return err
	}
	for ticketRows.Next() {
	}
	err = ticketRows.Err()
	ticketRows.Close()
	if err != nil {
		return err
	}
	var checked bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM cruise_tickets WHERE reservation_id=$1 AND checked_in_at IS NOT NULL) OR EXISTS(SELECT 1 FROM cruise_refunds WHERE reservation_id=$1 AND status<>'rejected')`, id).Scan(&checked); err != nil {
		return err
	}
	if checked {
		return ErrConflict
	}
	tables := []string{}
	seen := map[string]bool{}
	sum := 0
	for i, seat := range seats {
		parts := strings.Split(seat, ":")
		if len(parts) != 2 || (i > 0 && seats[i-1] == seat) {
			return ErrConflict
		}
		n, e := strconv.Atoi(parts[1])
		if e != nil || n < 1 || strconv.Itoa(n) != parts[1] {
			return ErrConflict
		}
		var cap, price int
		if err = tx.QueryRow(ctx, `SELECT seats,seat_price FROM sailing_tables WHERE sailing_id=$1 AND id=$2`, sailing, parts[0]).Scan(&cap, &price); err != nil {
			return err
		}
		if n > cap || price <= 0 {
			return ErrConflict
		}
		sum += price
		if !seen[parts[0]] {
			tables = append(tables, parts[0])
			seen[parts[0]] = true
		}
	}
	if sum != total {
		return ErrConflict
	}
	var occupied bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM cruise_reservations WHERE id<>$1 AND sailing_id=$2 AND table_ids && $3 AND (cardinality(seat_ids)=0 OR seat_ids && $4) AND (status='confirmed' OR (status='held' AND expires_at>now())))`, id, sailing, tables, seats).Scan(&occupied); err != nil {
		return err
	}
	if occupied {
		return ErrConflict
	}
	if _, err = tx.Exec(ctx, `UPDATE cruise_reservations SET table_ids=$2,seat_ids=$3 WHERE id=$1`, id, tables, seats); err != nil {
		return err
	}
	tickets := []Ticket{}
	for i, seat := range seats {
		code := "RLC1." + Token()
		if _, err = tx.Exec(ctx, `UPDATE cruise_tickets SET id=$3,table_id=$4 WHERE reservation_id=$1 AND ordinal=$2`, id, i+1, code, seat); err != nil {
			return err
		}
		tickets = append(tickets, Ticket{ID: code, TableID: seat})
	}
	for _, kind := range []string{"booking", "tickets"} {
		var raw []byte
		if err = tx.QueryRow(ctx, `SELECT payload FROM cruise_emails WHERE reservation_id=$1 AND kind=$2`, id, kind).Scan(&raw); err != nil {
			return err
		}
		var payload CruiseMailPayload
		if err = json.Unmarshal(raw, &payload); err != nil {
			return err
		}
		payload.Booking.TableIDs = seats
		payload.Booking.Tickets = tickets
		raw, err = json.Marshal(payload)
		if err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `UPDATE cruise_emails SET payload=$3,sent_at=NULL,stopped_at=NULL,attempts=0,next_attempt_at=now() WHERE reservation_id=$1 AND kind=$2`, id, kind, raw); err != nil {
			return err
		}
	}
	if _, err = tx.Exec(ctx, `INSERT INTO staff_audit(actor_id,action,target_id) VALUES($1,$2,$3)`, actor, "move-seats:"+reason, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
