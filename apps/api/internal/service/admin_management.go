package service

import (
	"context"
	"time"
)

type ManagedUser struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	Suspended bool   `json:"suspended"`
}

func (s *Service) ManagedUsers(ctx context.Context, query string, offset int) ([]ManagedUser, error) {
	rows, err := s.DB.Query(ctx, `SELECT id,name,email,role,suspended FROM users WHERE position(lower($1) in lower(name||' '||email))>0 ORDER BY created_at DESC,id LIMIT 50 OFFSET $2`, query, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ManagedUser{}
	for rows.Next() {
		var u ManagedUser
		if err = rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Suspended); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}
func (s *Service) ManageAccount(ctx context.Context, actor, target, action string) error {
	if actor == target {
		return ErrConflict
	}
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `SELECT pg_advisory_xact_lock(820034)`); err != nil {
		return err
	}
	var ar, tr string
	if err = tx.QueryRow(ctx, `SELECT role FROM users WHERE id=$1 AND NOT suspended FOR UPDATE`, actor).Scan(&ar); err != nil {
		return err
	}
	if err = tx.QueryRow(ctx, `SELECT role FROM users WHERE id=$1 FOR UPDATE`, target).Scan(&tr); err != nil {
		return err
	}
	if (ar != RoleAdmin && ar != RoleOwner) || tr == RoleOwner || (tr == RoleAdmin && ar != RoleOwner) {
		return ErrConflict
	}
	if action == "suspend" || action == "logout" {
		if _, err = tx.Exec(ctx, "UPDATE bookings SET sales_token_hash='',token_hash='' WHERE sales_user_id=$1", target); err != nil {
			return err
		}
	}
	switch action {
	case "suspend", "restore":
		_, err = tx.Exec(ctx, `UPDATE users SET suspended=$2,auth_version=auth_version+1,updated_at=now() WHERE id=$1`, target, action == "suspend")
	case "logout":
		_, err = tx.Exec(ctx, `UPDATE users SET auth_version=auth_version+1 WHERE id=$1`, target)
	default:
		return ErrConflict
	}
	if err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO staff_audit(actor_id,action,target_id) VALUES($1,$2,$3)`, actor, action, target); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

type AuditEntry struct {
	ID     int64     `json:"id"`
	Actor  string    `json:"actor"`
	Action string    `json:"action"`
	Target string    `json:"target"`
	At     time.Time `json:"at"`
}

func (s *Service) StaffAudit(ctx context.Context, offset int) ([]AuditEntry, error) {
	rows, err := s.DB.Query(ctx, `SELECT id,actor,action,target,created_at FROM (SELECT a.id,u.email actor,a.action,a.target_id target,a.created_at FROM staff_audit a JOIN users u ON u.id=a.actor_id UNION ALL SELECT -a.id,COALESCE(u.email,'system'),a.action,a.sailing_id,a.created_at FROM cruise_admin_audit a LEFT JOIN users u ON u.id=a.actor_id) logs ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET $1`, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []AuditEntry{}
	for rows.Next() {
		var a AuditEntry
		if err = rows.Scan(&a.ID, &a.Actor, &a.Action, &a.Target, &a.At); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}
func (s *Service) ResendCruiseEmail(ctx context.Context, actor, id, kind string) error {
	if err := s.managementAdmin(ctx, actor); err != nil {
		return err
	}
	if kind != "booking" && kind != "tickets" {
		return ErrConflict
	}
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	// Lock queue first, matching the SMTP worker, so a resend never races its send.
	var last *time.Time
	if err = tx.QueryRow(ctx, `SELECT sent_at FROM cruise_emails WHERE reservation_id=$1 AND kind=$2 FOR UPDATE`, id, kind).Scan(&last); err != nil {
		return err
	}
	if last != nil && time.Since(*last) < time.Minute {
		return ErrConflict
	}
	tag, err := tx.Exec(ctx, `UPDATE cruise_emails SET sent_at=NULL,stopped_at=NULL,attempts=0,next_attempt_at=now() WHERE reservation_id=$1 AND kind=$2 AND EXISTS(SELECT 1 FROM cruise_reservations WHERE id=$1 AND status='confirmed')`, id, kind)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return ErrConflict
	}
	if _, err = tx.Exec(ctx, `INSERT INTO staff_audit(actor_id,action,target_id) VALUES($1,$2,$3)`, actor, "resend:"+kind, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

type SalesReportRow struct {
	Sailing   string    `json:"sailing"`
	Departure time.Time `json:"departure"`
	Seller    string    `json:"seller"`
	Method    string    `json:"method"`
	Bookings  int       `json:"bookings"`
	Seats     int       `json:"seats"`
	Total     int64     `json:"total"`
}

func (s *Service) SalesReport(ctx context.Context, from, to time.Time) ([]SalesReportRow, error) {
	rows, err := s.DB.Query(ctx, `SELECT s.title,s.departure_at,COALESCE(u.email,'web'),CASE WHEN o.charge_id IS NOT NULL THEN 'Omise' ELSE 'manual' END,count(*),sum(r.guest_count),sum(r.total) FROM cruise_reservations r JOIN sailings s ON s.id=r.sailing_id LEFT JOIN users u ON u.id=r.sales_user_id LEFT JOIN omise_checkouts o ON o.reservation_id=r.id WHERE r.status='confirmed' AND r.created_at >= $1 AND r.created_at < $2 GROUP BY s.id,s.title,s.departure_at,u.email,CASE WHEN o.charge_id IS NOT NULL THEN 'Omise' ELSE 'manual' END ORDER BY s.departure_at,s.title LIMIT 1000`, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []SalesReportRow{}
	for rows.Next() {
		var r SalesReportRow
		if err = rows.Scan(&r.Sailing, &r.Departure, &r.Seller, &r.Method, &r.Bookings, &r.Seats, &r.Total); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Service) managementAdmin(ctx context.Context, actor string) error {
	var role string
	if err := s.DB.QueryRow(ctx, "SELECT role FROM users WHERE id=$1 AND NOT suspended", actor).Scan(&role); err != nil {
		return err
	}
	if role != RoleAdmin && role != RoleOwner {
		return ErrConflict
	}
	return nil
}
