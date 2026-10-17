package service

import (
	"context"
	"github.com/jackc/pgx/v5"
)

type Passenger struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	ZoneID    string `json:"zone_id"`
	Quantity  int    `json:"quantity"`
	CheckedIn int    `json:"checked_in"`
}
type Program struct {
	Title      string  `json:"title" binding:"required,max=160"`
	Date       *string `json:"date"`
	Boarding   string  `json:"boarding" binding:"required"`
	Departure  string  `json:"departure" binding:"required"`
	Pier       string  `json:"pier" binding:"required,max=120"`
	PierNumber int     `json:"pier_number" binding:"min=1,max=100"`
	Duration   int     `json:"duration_minutes" binding:"min=1,max=1440"`
}

func (s *Service) Program(ctx context.Context) (p Program, err error) {
	err = s.DB.QueryRow(ctx, "SELECT title,sailing_date,boarding,departure,pier,pier_number,duration_minutes FROM cruise_program WHERE id=1").Scan(&p.Title, &p.Date, &p.Boarding, &p.Departure, &p.Pier, &p.PierNumber, &p.Duration)
	return
}
func (s *Service) UpdateProgram(ctx context.Context, p Program) error {
	_, err := s.DB.Exec(ctx, "UPDATE cruise_program SET title=$1,sailing_date=$2,boarding=$3,departure=$4,pier=$5,pier_number=$6,duration_minutes=$7 WHERE id=1", p.Title, p.Date, p.Boarding, p.Departure, p.Pier, p.PierNumber, p.Duration)
	return err
}
func (s *Service) SalesBookings(ctx context.Context, userID string) ([]Booking, error) {
	rows, err := s.DB.Query(ctx, "SELECT "+columns+" FROM bookings WHERE sales_user_id=$1 ORDER BY created_at DESC LIMIT 200", userID)
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
func (s *Service) SalesAccess(ctx context.Context, id, userID string) (Booking, string, error) {
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return Booking{}, "", err
	}
	defer tx.Rollback(ctx)
	var actor string
	if err = tx.QueryRow(ctx, "SELECT id FROM users WHERE id=$1 AND role IN ('sales','admin') FOR SHARE", userID).Scan(&actor); err != nil {
		return Booking{}, "", err
	}
	access := Token()
	var owned string
	err = tx.QueryRow(ctx, "UPDATE bookings SET sales_token_hash=$3 WHERE id=$1 AND sales_user_id=$2 RETURNING id", id, userID, Hash(access)).Scan(&owned)
	if err != nil {
		return Booking{}, "", err
	}
	if err = tx.Commit(ctx); err != nil {
		return Booking{}, "", err
	}
	b, err := s.Get(ctx, id, access, false)
	return b, access, err
}
func (s *Service) SalesCreate(ctx context.Context, in Input, key, token, actor string) (Booking, error) {
	// Link only an existing customer account; never make a salesperson the passenger.
	var customer string
	err := s.DB.QueryRow(ctx, "SELECT id FROM users WHERE lower(email)=lower($1) AND role='user'", in.Email).Scan(&customer)
	if err != nil && err != pgx.ErrNoRows {
		return Booking{}, err
	}
	in.UserID = customer
	in.SalesUserID = actor
	in.AgentCode = actor
	return s.Create(ctx, in, key, token)
}
func (s *Service) Passengers(ctx context.Context) ([]Passenger, error) {
	rows, err := s.DB.Query(ctx, `SELECT b.id,b.name,b.zone_id,b.quantity,COUNT(t.checked_in_at)::int FROM bookings b LEFT JOIN tickets t ON t.booking_id=b.id WHERE b.status='confirmed' GROUP BY b.id ORDER BY b.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Passenger{}
	for rows.Next() {
		var p Passenger
		if err = rows.Scan(&p.ID, &p.Name, &p.ZoneID, &p.Quantity, &p.CheckedIn); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}
func (s *Service) StaffUsers(ctx context.Context) ([]User, error) {
	rows, err := s.DB.Query(ctx, "SELECT id,name,email,role FROM users ORDER BY created_at DESC LIMIT 200")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []User{}
	for rows.Next() {
		var u User
		if err = rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}
func (s *Service) SetRole(ctx context.Context, actor, target, role string) error {
	if actor == target {
		return ErrConflict
	}
	switch role {
	case RoleUser, RoleSales, RoleOperator, RoleAdmin:
	default:
		return ErrConflict
	}
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(820034)"); err != nil {
		return err
	}
	var actorRole string
	if err = tx.QueryRow(ctx, "SELECT role FROM users WHERE id=$1 FOR UPDATE", actor).Scan(&actorRole); err != nil {
		return err
	}
	if actorRole != RoleAdmin {
		return ErrConflict
	}
	var id string
	if err = tx.QueryRow(ctx, "UPDATE users SET role=$2,updated_at=now() WHERE id=$1 RETURNING id", target, role).Scan(&id); err != nil {
		return err
	}
	if role != RoleSales && role != RoleAdmin {
		if _, err = tx.Exec(ctx, "UPDATE bookings SET sales_token_hash='' WHERE sales_user_id=$1", target); err != nil {
			return err
		}
	}
	if _, err = tx.Exec(ctx, "INSERT INTO staff_audit(actor_id,action,target_id) VALUES($1,$2,$3)", actor, "role_changed:"+role, target); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
