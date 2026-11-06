package service

import (
	"context"
	"strings"
)

// Keep customer ownership, pricing, seat locks and email delivery on the same
// reservation path. Sales attribution is written in that transaction as well.
func (s *Service) SalesReserveCruise(ctx context.Context, in ReserveCruiseInput, email, actor, key string) (CruiseReservation, error) {
	var user, role string
	if err := s.DB.QueryRow(ctx, `SELECT role FROM users WHERE id=$1`, actor).Scan(&role); err != nil {
		return CruiseReservation{}, err
	}
	if role != RoleSales && role != RoleAdmin && role != RoleOwner {
		return CruiseReservation{}, ErrConflict
	}
	if len(in.SeatIDs) == 0 {
		return CruiseReservation{}, ErrConflict
	}
	if err := s.DB.QueryRow(ctx, `SELECT id FROM users WHERE lower(email)=$1 AND role='user'`, strings.ToLower(strings.TrimSpace(email))).Scan(&user); err != nil {
		return CruiseReservation{}, err
	}
	return s.reserveCruise(ctx, in, user, key, actor)
}

func (s *Service) SalesCruiseReservations(ctx context.Context, actor string) ([]CruiseReservation, error) {
	rows, err := s.DB.Query(ctx, `SELECT `+reservationColumns+` FROM cruise_reservations r JOIN sailings s ON s.id=r.sailing_id JOIN vessels v ON v.id=s.vessel_id WHERE r.sales_user_id=$1 ORDER BY r.created_at DESC LIMIT 100`, actor)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []CruiseReservation{}
	for rows.Next() {
		r, err := scanReservation(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}
