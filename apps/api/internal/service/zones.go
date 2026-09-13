package service

import "context"

type ZoneUpdate struct {
	Name     string `json:"name" binding:"required,max=80"`
	Capacity int    `json:"capacity" binding:"min=0,max=1000"`
	Price    int    `json:"price" binding:"min=0,max=10000000"`
}

func (s *Service) UpdateZone(ctx context.Context, id string, in ZoneUpdate) error {
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var current string
	if err = tx.QueryRow(ctx, "SELECT id FROM zones WHERE id=$1 FOR UPDATE", id).Scan(&current); err != nil {
		return err
	}
	var used int
	if err = tx.QueryRow(ctx, "SELECT COALESCE(SUM(quantity),0) FROM bookings WHERE zone_id=$1 AND (status IN ('review','confirmed','no_show') OR (status='held' AND expires_at>now()))", id).Scan(&used); err != nil {
		return err
	}
	if in.Capacity < used {
		return ErrConflict
	}
	if _, err = tx.Exec(ctx, "UPDATE zones SET name=$2,capacity=$3,price=$4 WHERE id=$1", id, in.Name, in.Capacity, in.Price); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
