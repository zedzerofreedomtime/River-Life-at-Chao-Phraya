package service

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5"
	"sort"
)

// Demo catalogue only. Replace with operator-approved sailing inventory before live sales.
func tableForTicket(ids []string, index int) string {
	if index >= 0 && index/4 < len(ids) {
		return ids[index/4]
	}
	return ""
}

type TableOption struct {
	ID     string `json:"id"`
	Deck   string `json:"deck"`
	Seats  int    `json:"seats"`
	Price  int    `json:"price"`
	Status string `json:"status"`
	zone   string
}

func demoTableOptions() []TableOption {
	out := []TableOption{}
	for _, deck := range []string{"upper", "lower"} {
		count, prefix, zone := 18, "U", "A"
		if deck == "lower" {
			count, prefix, zone = 12, "L", "C"
		}
		for i := 1; i <= count; i++ {
			status := "available"
			// Preserve the unavailable example fixtures, but never sell them as real holds.
			if i == 6 || i == 10 || i == 17 {
				status = "blocked"
			}
			out = append(out, TableOption{ID: fmt.Sprintf("%s%02d", prefix, i), Deck: deck, Seats: 4, Status: status, zone: zone})
		}
	}
	return out
}

func normalizeTableInput(in Input) (Input, error) {
	if len(in.TableIDs) == 0 || len(in.TableIDs) > 30 {
		return in, ErrConflict
	}
	lookup := map[string]TableOption{}
	for _, t := range demoTableOptions() {
		lookup[t.ID] = t
	}
	ids := append([]string(nil), in.TableIDs...)
	sort.Strings(ids)
	zone := ""
	for i, id := range ids {
		t, ok := lookup[id]
		if !ok || t.Status != "available" || (i > 0 && ids[i-1] == id) || (zone != "" && zone != t.zone) {
			return in, ErrConflict
		}
		zone = t.zone
	}
	seats := 4 * len(ids)
	if in.GuestCount < 1 || in.GuestCount > seats {
		return in, ErrConflict
	}
	in.TableIDs, in.ZoneID, in.Quantity = ids, zone, seats
	return in, nil
}

// Call only while holding the corresponding zone row lock. Both reservation and
// delayed payment confirmation use this check, so an expired hold cannot oversell.
func checkTableConflict(ctx context.Context, tx pgx.Tx, ids []string, exclude string) error {
	if len(ids) == 0 {
		return nil
	}
	var conflict bool
	err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM bookings WHERE id<>$1 AND table_ids && $2::text[]
 AND (status IN ('review','confirmed','no_show') OR (status='held' AND expires_at>now())))`, exclude, ids).Scan(&conflict)
	if err != nil {
		return err
	}
	if conflict {
		return ErrConflict
	}
	return nil
}

func (s *Service) TableOptions(ctx context.Context) ([]TableOption, error) {
	options := demoTableOptions()
	zones, err := s.Zones(ctx)
	if err != nil {
		return nil, err
	}
	prices := map[string]Zone{}
	for _, z := range zones {
		prices[z.ID] = z
	}
	rows, err := s.DB.Query(ctx, `SELECT unnest(table_ids),status FROM bookings WHERE
 status IN ('review','confirmed','no_show') OR (status='held' AND expires_at>now())`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	occupied := map[string]string{}
	for rows.Next() {
		var id, status string
		if err = rows.Scan(&id, &status); err != nil {
			return nil, err
		}
		if status == "held" {
			occupied[id] = "held"
		} else {
			occupied[id] = "sold"
		}
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	for i, t := range options {
		z, ok := prices[t.zone]
		options[i].Price = z.Price * t.Seats
		if !ok || z.Price <= 0 || z.Available < t.Seats {
			options[i].Status = "blocked"
		}
		if status, ok := occupied[t.ID]; ok {
			options[i].Status = status
		}
	}
	return options, nil
}
