package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"time"
)

type CruiseReservationPage struct {
	Items      []CruiseReservationDetail `json:"items"`
	NextCursor string                    `json:"next_cursor"`
}

type reservationCursor struct {
	Created time.Time `json:"created"`
	ID      string    `json:"id"`
}

// Keep the array response for existing API callers.
func (s *Service) AdminCruiseReservations(ctx context.Context) ([]CruiseReservationDetail, error) {
	page, err := s.AdminCruiseReservationPage(ctx, 100, "")
	return page.Items, err
}

func (s *Service) AdminCruiseReservationPage(ctx context.Context, limit int, cursor string) (CruiseReservationPage, error) {
	page := CruiseReservationPage{Items: []CruiseReservationDetail{}}
	var before reservationCursor
	if limit < 1 || limit > 100 || len(cursor) > 512 {
		return page, ErrConflict
	}
	if cursor != "" {
		raw, err := base64.RawURLEncoding.DecodeString(cursor)
		if err != nil || json.Unmarshal(raw, &before) != nil || before.Created.IsZero() || before.ID == "" || len(before.ID) > 100 {
			return page, ErrConflict
		}
	}
	// One database round trip returns a bounded page and its related data.
	// The timestamp/ID cursor avoids shifted pages when new bookings arrive.
	rows, err := s.DB.Query(ctx, `WITH selected AS (
		SELECT * FROM cruise_reservations
		WHERE ($1 = '' OR (created_at,id) < ($2,$1))
		ORDER BY created_at DESC,id DESC LIMIT $3
	)
	SELECT `+reservationColumns+`,u.email,
	CASE WHEN o.reservation_id IS NULL THEN 'null'::jsonb ELSE jsonb_build_object(
	'charge_id',COALESCE(o.charge_id,''),'status',o.provider_status,
	'review_reason',CASE WHEN o.charge_id IS NULL THEN 'creation_unknown' ELSE o.review_reason END,'checked_at',o.checked_at) END,
	COALESCE((SELECT jsonb_agg(jsonb_build_object('id',t.id,'table_id',t.table_id,'ordinal',t.ordinal,'checked_in_at',t.checked_in_at) ORDER BY t.ordinal)
	FROM cruise_tickets t WHERE t.reservation_id=r.id AND r.status='confirmed'),'[]'::jsonb),
	COALESCE((SELECT jsonb_agg(jsonb_build_object('kind',e.kind,'attempts',e.attempts,'sent_at',e.sent_at,'stopped_at',e.stopped_at) ORDER BY e.kind)
	FROM cruise_emails e WHERE e.reservation_id=r.id),'[]'::jsonb),r.created_at
	FROM selected r JOIN sailings s ON s.id=r.sailing_id JOIN vessels v ON v.id=s.vessel_id
	JOIN users u ON u.id=r.user_id LEFT JOIN omise_checkouts o ON o.reservation_id=r.id
	ORDER BY r.created_at DESC,r.id DESC`, before.ID, before.Created, limit+1)
	if err != nil {
		return page, err
	}
	defer rows.Close()
	var last reservationCursor
	for rows.Next() {
		if len(page.Items) == limit {
			raw, err := json.Marshal(last)
			if err != nil {
				return page, err
			}
			page.NextCursor = base64.RawURLEncoding.EncodeToString(raw)
			break
		}
		var detail CruiseReservationDetail
		var payment, tickets, emails []byte
		var created time.Time
		detail.CruiseReservation, err = scanReservation(rows, &detail.Email, &payment, &tickets, &emails, &created)
		if err != nil {
			return page, err
		}
		if err = json.Unmarshal(payment, &detail.Payment); err != nil {
			return page, err
		}
		if err = json.Unmarshal(tickets, &detail.Tickets); err != nil {
			return page, err
		}
		if err = json.Unmarshal(emails, &detail.Emails); err != nil {
			return page, err
		}
		page.Items = append(page.Items, detail)
		last = reservationCursor{created, detail.ID}
	}
	return page, rows.Err()
}
