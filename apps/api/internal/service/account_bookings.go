package service

import "context"

// ListForUser never infers ownership from an email or exposes ticket secrets.
func (s *Service) ListForUser(ctx context.Context, userID string) ([]Booking, error) {
	rows, err := s.DB.Query(ctx, "SELECT "+columns+" FROM bookings WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200", userID)
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

// AccountAccess refreshes the account credential without invalidating the original private code.
func (s *Service) AccountAccess(ctx context.Context, id, userID string) (Booking, string, error) {
	access := Token()
	var ownedID string
	err := s.DB.QueryRow(ctx, "UPDATE bookings SET account_token_hash=$3 WHERE id=$1 AND user_id=$2 RETURNING id", id, userID, Hash(access)).Scan(&ownedID)
	if err != nil {
		return Booking{}, "", err
	}
	b, err := s.Get(ctx, ownedID, access, false)
	return b, access, err
}
