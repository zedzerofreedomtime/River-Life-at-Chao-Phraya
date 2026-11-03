package service

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/jackc/pgx/v5"
	"sort"
	"strconv"
	"strings"
	"time"
)

var ErrInvalidSailing = errors.New("กรุณาตรวจสอบวัน เวลา ท่าเรือ หมายเลขโต๊ะ ที่นั่ง ราคา ตำแหน่ง X/Y และเมนูเสริม พร้อมรับรองข้อมูลก่อนเปิดรับจอง")

// Closing stops new holds without changing existing customers' sailing terms.
func (s *Service) CloseSailing(ctx context.Context, id, actor string, revision int) error {
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	tag, err := tx.Exec(ctx, `UPDATE sailings SET status='closed',revision=revision+1 WHERE id=$1 AND revision=$2`, id, revision)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return ErrConflict
	}
	if _, err = tx.Exec(ctx, `INSERT INTO cruise_admin_audit(actor_id,sailing_id,action) VALUES($1,$2,'close')`, actor, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

type Vessel struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Thai        string `json:"th"`
	Pier        string `json:"pier"`
	Time        string `json:"time"`
	Crop        string `json:"crop"`
	Description string `json:"description"`
	English     string `json:"english"`
}
type SailingTable struct {
	SeatPrice      int      `json:"seat_price"`
	AvailableSeats []string `json:"available_seats"`
	ID             string   `json:"id"`
	Deck           string   `json:"deck"`
	Seats          int      `json:"seats"`
	Price          int      `json:"price"`
	Available      bool     `json:"available"`
	X              int      `json:"x"`
	Y              int      `json:"y"`
}
type CruiseExtra struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Category    string `json:"category"`
	Description string `json:"description"`
	Image       string `json:"image"`
	Price       int    `json:"price"`
	Stock       int    `json:"stock"`
	Remaining   int    `json:"remaining"`
	Enabled     bool   `json:"enabled"`
}
type Sailing struct {
	ID        string         `json:"id"`
	VesselID  string         `json:"vessel_id"`
	Title     string         `json:"title"`
	Departure *time.Time     `json:"departure_at"`
	Boarding  *time.Time     `json:"boarding_at"`
	Pier      string         `json:"pier"`
	Status    string         `json:"status"`
	Revision  int            `json:"revision"`
	Tables    []SailingTable `json:"tables"`
	Verified  bool           `json:"verified"`
	Extras    []CruiseExtra  `json:"extras"`
}
type CruiseReservation struct {
	SeatIDs       []string         `json:"seat_ids"`
	ID            string           `json:"id"`
	SailingID     string           `json:"sailing_id"`
	Title         string           `json:"title"`
	Vessel        string           `json:"vessel"`
	Departure     *time.Time       `json:"departure_at"`
	Pier          string           `json:"pier"`
	TableIDs      []string         `json:"table_ids"`
	Guests        int              `json:"guest_count"`
	Total         int              `json:"total"`
	Status        string           `json:"status"`
	Expires       time.Time        `json:"expires_at"`
	TableTotal    int              `json:"table_total"`
	ExtrasTotal   int              `json:"extras_total"`
	Notes         string           `json:"notes"`
	Requests      []string         `json:"requests"`
	CustomerName  string           `json:"customer_name"`
	CustomerPhone string           `json:"customer_phone"`
	Items         []CruiseLineItem `json:"items"`
}
type CruiseLineItem struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Category  string `json:"category"`
	Quantity  int    `json:"quantity"`
	UnitPrice int    `json:"unit_price"`
}

func (s *Service) Vessels(ctx context.Context) ([]Vessel, error) {
	rows, err := s.DB.Query(ctx, `SELECT id,name,name_th,pier,sailing_time,image_crop,description,description_en FROM vessels WHERE active ORDER BY CASE id WHEN 'unicorn' THEN 0 ELSE 1 END,id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Vessel{}
	for rows.Next() {
		var v Vessel
		if err = rows.Scan(&v.ID, &v.Name, &v.Thai, &v.Pier, &v.Time, &v.Crop, &v.Description, &v.English); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}
func (s *Service) Sailings(ctx context.Context, vessel string, admin bool) ([]Sailing, error) {
	rows, err := s.DB.Query(ctx, `SELECT s.id,s.vessel_id,s.title,s.departure_at,s.boarding_at,s.pier,s.status,s.revision,s.verified,s.extras FROM sailings s JOIN vessels v ON v.id=s.vessel_id WHERE ($1='' OR s.vessel_id=$1) AND ($2 OR (v.active AND s.verified AND s.status='published' AND s.departure_at>now())) ORDER BY s.departure_at NULLS LAST,s.created_at DESC LIMIT 200`, vessel, admin)
	if err != nil {
		return nil, err
	}
	out := []Sailing{}
	for rows.Next() {
		var v Sailing
		var extraJSON []byte
		if err = rows.Scan(&v.ID, &v.VesselID, &v.Title, &v.Departure, &v.Boarding, &v.Pier, &v.Status, &v.Revision, &v.Verified, &extraJSON); err != nil {
			rows.Close()
			return nil, err
		}
		if err = json.Unmarshal(extraJSON, &v.Extras); err != nil {
			rows.Close()
			return nil, err
		}
		out = append(out, v)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}
	for i := range out {
		out[i].Tables = []SailingTable{}
		r, e := s.DB.Query(ctx, `SELECT t.id,t.deck,t.seats,t.price,NOT EXISTS(SELECT 1 FROM cruise_reservations r WHERE r.sailing_id=t.sailing_id AND t.id=ANY(r.table_ids) AND (r.status='confirmed' OR (r.status='held' AND r.expires_at>now()))),t.x,t.y,t.seat_price FROM sailing_tables t WHERE t.sailing_id=$1 ORDER BY t.deck,t.id`, out[i].ID)
		if e != nil {
			return nil, e
		}
		for r.Next() {
			var t SailingTable
			if e = r.Scan(&t.ID, &t.Deck, &t.Seats, &t.Price, &t.Available, &t.X, &t.Y, &t.SeatPrice); e != nil {
				r.Close()
				return nil, e
			}
			out[i].Tables = append(out[i].Tables, t)
		}
		e = r.Err()
		r.Close()
		if e != nil {
			return nil, e
		}
		// Read occupied inventory once per sailing, rather than once per chair.
		occupied, e := s.DB.Query(ctx, `SELECT table_ids,seat_ids FROM cruise_reservations WHERE sailing_id=$1 AND (status='confirmed' OR (status='held' AND expires_at>now()))`, out[i].ID)
		if e != nil {
			return nil, e
		}
		blockedTables, blockedSeats := map[string]bool{}, map[string]bool{}
		for occupied.Next() {
			var tables, seats []string
			if e = occupied.Scan(&tables, &seats); e != nil {
				occupied.Close()
				return nil, e
			}
			if len(seats) == 0 {
				for _, id := range tables {
					blockedTables[id] = true
				}
			}
			for _, id := range seats {
				blockedSeats[id] = true
			}
		}
		e = occupied.Err()
		occupied.Close()
		if e != nil {
			return nil, e
		}
		for j := range out[i].Tables {
			table := &out[i].Tables[j]
			table.AvailableSeats = []string{}
			for n := 1; n <= table.Seats; n++ {
				id := table.ID + ":" + strconv.Itoa(n)
				if table.SeatPrice > 0 && !blockedTables[table.ID] && !blockedSeats[id] {
					table.AvailableSeats = append(table.AvailableSeats, id)
				}
			}
		}
		stock, e := s.DB.Query(ctx, `SELECT i.extra_id,sum(i.quantity) FROM cruise_reservation_items i JOIN cruise_reservations r ON r.id=i.reservation_id WHERE r.sailing_id=$1 AND (r.status='confirmed' OR (r.status='held' AND r.expires_at>now())) GROUP BY i.extra_id`, out[i].ID)
		if e != nil {
			return nil, e
		}
		used := map[string]int{}
		for stock.Next() {
			var id string
			var n int
			if e = stock.Scan(&id, &n); e != nil {
				stock.Close()
				return nil, e
			}
			used[id] = n
		}
		e = stock.Err()
		stock.Close()
		if e != nil {
			return nil, e
		}
		visible := []CruiseExtra{}
		for _, item := range out[i].Extras {
			item.Remaining = max(0, item.Stock-used[item.ID])
			if admin || item.Enabled {
				visible = append(visible, item)
			}
		}
		out[i].Extras = visible
	}
	return out, nil
}

// Drafts may be incomplete. Publication requires a future sailing and a priced seating plan.
func validateSailing(v Sailing, now time.Time) bool {
	if strings.TrimSpace(v.Title) == "" || len(v.Title) > 240 || len(v.Pier) > 240 || len(v.Tables) > 150 || (v.Status != "draft" && v.Status != "published" && v.Status != "closed") {
		return false
	}
	seen := map[string]bool{}
	for _, t := range v.Tables {
		if strings.TrimSpace(t.ID) == "" || len(t.ID) > 20 || strings.Contains(t.ID, ":") || t.SeatPrice < 0 || t.SeatPrice > 100000000 || seen[t.ID] || (t.Deck != "upper" && t.Deck != "lower") || t.Seats < 1 || t.Seats > 20 || t.Price < 1 || t.Price > 100000000 || t.X < 0 || t.X > 1000 || t.Y < 0 || t.Y > 580 {
			return false
		}
		if v.Status == "published" && (t.X < 200 || t.X > 800 || t.Y < 110 || t.Y > 470) {
			return false
		}
		seen[t.ID] = true
	}
	if len(v.Extras) > 50 {
		return false
	}
	seen = map[string]bool{}
	for _, e := range v.Extras {
		if e.ID == "" || len(e.ID) > 40 || seen[e.ID] || strings.TrimSpace(e.Name) == "" || len(e.Name) > 200 || len(e.Description) > 1000 || len(e.Image) > 500 || e.Price < 0 || e.Price > 100000000 || e.Stock < 0 || e.Stock > 10000 || (e.Category != "food" && e.Category != "wine") {
			return false
		}
		if e.Image != "" && ((!strings.HasPrefix(e.Image, "/images/") && !strings.HasPrefix(e.Image, "/api/v1/cruise-images/")) || strings.Contains(e.Image, "..")) {
			return false
		}
		if v.Status == "published" && e.Enabled && e.Price < 1 {
			return false
		}
		seen[e.ID] = true
	}
	if v.Status == "published" {
		return v.Verified && v.Departure != nil && v.Departure.After(now) && v.Boarding != nil && !v.Boarding.After(*v.Departure) && strings.TrimSpace(v.Pier) != "" && len(v.Tables) > 0
	}
	return true
}
func (s *Service) SaveSailing(ctx context.Context, v Sailing, actor string) (Sailing, error) {
	if !validateSailing(v, time.Now()) {
		return v, ErrInvalidSailing
	}
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return v, err
	}
	defer tx.Rollback(ctx)
	if v.Extras == nil {
		v.Extras = []CruiseExtra{}
	}
	extraJSON, _ := json.Marshal(v.Extras)
	var vessel string
	if err = tx.QueryRow(ctx, `SELECT id FROM vessels WHERE id=$1 AND active FOR SHARE`, v.VesselID).Scan(&vessel); err != nil {
		return v, err
	}
	if v.ID == "" {
		v.ID = Token()[:24]
		v.Revision = 1
		_, err = tx.Exec(ctx, `INSERT INTO sailings(id,vessel_id,title,departure_at,boarding_at,pier,status,verified,extras) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, v.ID, v.VesselID, v.Title, v.Departure, v.Boarding, v.Pier, v.Status, v.Verified, extraJSON)
	} else {
		var revision int
		err = tx.QueryRow(ctx, `SELECT revision FROM sailings WHERE id=$1 FOR UPDATE`, v.ID).Scan(&revision)
		if err != nil {
			return v, err
		}
		if revision != v.Revision {
			return v, ErrConflict
		}
		var count int
		err = tx.QueryRow(ctx, `SELECT count(*) FROM cruise_reservations WHERE sailing_id=$1`, v.ID).Scan(&count)
		if err != nil {
			return v, err
		}
		if count > 0 {
			return v, ErrConflict
		} // Never rewrite a customer's booking terms.
		v.Revision++
		_, err = tx.Exec(ctx, `UPDATE sailings SET vessel_id=$2,title=$3,departure_at=$4,boarding_at=$5,pier=$6,status=$7,revision=$8,verified=$9,extras=$10 WHERE id=$1`, v.ID, v.VesselID, v.Title, v.Departure, v.Boarding, v.Pier, v.Status, v.Revision, v.Verified, extraJSON)
	}
	if err != nil {
		return v, err
	}
	if _, err = tx.Exec(ctx, `DELETE FROM sailing_tables WHERE sailing_id=$1`, v.ID); err != nil {
		return v, err
	}
	for _, t := range v.Tables {
		if _, err = tx.Exec(ctx, `INSERT INTO sailing_tables(sailing_id,id,deck,seats,price,x,y,seat_price) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, v.ID, t.ID, t.Deck, t.Seats, t.Price, t.X, t.Y, t.SeatPrice); err != nil {
			return v, err
		}
	}
	if _, err = tx.Exec(ctx, `INSERT INTO cruise_admin_audit(actor_id,sailing_id,action) VALUES($1,$2,$3)`, actor, v.ID, "save:"+v.Status); err != nil {
		return v, err
	}
	return v, tx.Commit(ctx)
}

type ReserveCruiseInput struct {
	SeatIDs       []string               `json:"seat_ids" binding:"max=200,dive,max=24"`
	SailingID     string                 `json:"sailing_id" binding:"required,max=24"`
	Tables        []string               `json:"table_ids" binding:"max=30,dive,max=20"`
	Guests        int                    `json:"guest_count" binding:"required,min=1,max=200"`
	ExpectedTotal int                    `json:"expected_total" binding:"required,min=1"`
	Extras        []CruiseExtraSelection `json:"extras" binding:"max=50,dive"`
	Notes         string                 `json:"notes" binding:"max=1000"`
	Requests      []string               `json:"requests" binding:"max=6,dive,max=40"`
	CustomerName  string                 `json:"customer_name" binding:"max=200"`
	CustomerPhone string                 `json:"customer_phone" binding:"max=50"`
}
type CruiseExtraSelection struct {
	ID       string `json:"id" binding:"required,max=40"`
	Quantity int    `json:"quantity" binding:"required,min=1,max=10"`
}

func (s *Service) ReserveCruise(ctx context.Context, in ReserveCruiseInput, user, key string) (CruiseReservation, error) {
	var out CruiseReservation
	if len(in.SeatIDs) > 0 {
		if len(in.Tables) != 0 || len(in.SeatIDs) != in.Guests || len(in.SeatIDs) > 200 {
			return out, ErrConflict
		}
		sort.Strings(in.SeatIDs)
		seen := map[string]bool{}
		for i, id := range in.SeatIDs {
			parts := strings.Split(id, ":")
			if len(parts) != 2 || len(parts[0]) == 0 || len(parts[0]) > 20 || (i > 0 && in.SeatIDs[i-1] == id) {
				return out, ErrConflict
			}
			n, e := strconv.Atoi(parts[1])
			if e != nil || n < 1 || n > 20 || strconv.Itoa(n) != parts[1] {
				return out, ErrConflict
			}
			if !seen[parts[0]] {
				in.Tables = append(in.Tables, parts[0])
				seen[parts[0]] = true
			}
		}
	} else {
		in.SeatIDs = []string{}
	}
	if len(key) < 16 || len(key) > 100 || len(in.Tables) < 1 || len(in.Tables) > 30 || in.Guests < 1 || in.Guests > 200 {
		return out, ErrConflict
	}
	sort.Strings(in.Tables)
	if len(in.Notes) > 1000 || len(in.CustomerName) > 200 || len(in.CustomerPhone) > 50 || len(in.Extras) > 50 || len(in.Requests) > 6 {
		return out, ErrConflict
	}
	sort.Slice(in.Extras, func(i, j int) bool { return in.Extras[i].ID < in.Extras[j].ID })
	sort.Strings(in.Requests)
	for i, e := range in.Extras {
		if e.Quantity < 1 || e.Quantity > 10 || len(e.ID) > 40 || e.ID == "" || (i > 0 && in.Extras[i-1].ID == e.ID) {
			return out, ErrConflict
		}
	}
	allowedRequests := map[string]bool{"cake": true, "celebration": true, "decoration": true, "request": true}
	for i, r := range in.Requests {
		if !allowedRequests[r] || (i > 0 && in.Requests[i-1] == r) {
			return out, ErrConflict
		}
	}
	for i, id := range in.Tables {
		if id == "" || (i > 0 && in.Tables[i-1] == id) {
			return out, ErrConflict
		}
	}
	raw, _ := json.Marshal(in)
	fingerprint := Hash(string(raw))
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return out, err
	}
	defer tx.Rollback(ctx)
	// Serialize this customer's hold budget even across different request keys.
	if _, err = tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, "cruise-holds:"+user); err != nil {
		return out, err
	}
	var oldID, oldHash string
	err = tx.QueryRow(ctx, `SELECT id,request_hash FROM cruise_reservations WHERE user_id=$1 AND request_key=$2`, user, key).Scan(&oldID, &oldHash)
	if err == nil {
		if oldHash != fingerprint {
			return out, ErrConflict
		}
		_ = tx.Rollback(ctx)
		return s.CruiseReservation(ctx, oldID, user)
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return out, err
	}
	var dep time.Time
	var extraJSON, terms []byte
	err = tx.QueryRow(ctx, `SELECT s.departure_at,s.extras,jsonb_build_object('title',s.title,'departure_at',s.departure_at,'boarding_at',s.boarding_at,'pier',s.pier,'vessel',v.name) FROM sailings s JOIN vessels v ON v.id=s.vessel_id WHERE s.id=$1 AND s.status='published' AND s.verified AND s.departure_at>now() AND v.active FOR UPDATE OF s`, in.SailingID).Scan(&dep, &extraJSON, &terms)
	if err != nil {
		return out, err
	}
	var active, recent int
	if err = tx.QueryRow(ctx, `SELECT count(*) FILTER (WHERE status='held' AND expires_at>now()), count(*) FILTER (WHERE created_at>now()-interval '15 minutes') FROM cruise_reservations WHERE user_id=$1`, user).Scan(&active, &recent); err != nil {
		return out, err
	}
	// Allow corrections, but not indefinitely renewed unpaid inventory locks.
	if active > 0 || recent >= 3 {
		return out, ErrConflict
	}
	rows, err := tx.Query(ctx, `SELECT id,seats,price,seat_price FROM sailing_tables WHERE sailing_id=$1 AND id=ANY($2) ORDER BY id`, in.SailingID, in.Tables)
	if err != nil {
		return out, err
	}
	seats, total, count := 0, 0, 0
	minSeats := 201
	for rows.Next() {
		var id string
		var n, p, seatPrice int
		if err = rows.Scan(&id, &n, &p, &seatPrice); err != nil {
			rows.Close()
			return out, err
		}
		seats += n
		if n < minSeats {
			minSeats = n
		}
		if len(in.SeatIDs) > 0 {
			if seatPrice <= 0 {
				rows.Close()
				return out, ErrConflict
			}
			for _, seatID := range in.SeatIDs {
				if strings.HasPrefix(seatID, id+":") {
					ordinal, _ := strconv.Atoi(strings.TrimPrefix(seatID, id+":"))
					if ordinal > n {
						rows.Close()
						return out, ErrConflict
					}
					total += seatPrice
				}
			}
		} else {
			total += p
		}
		count++
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return out, err
	}
	if count != len(in.Tables) || seats < in.Guests || (len(in.SeatIDs) == 0 && seats-minSeats >= in.Guests) {
		return out, ErrConflict
	}
	tableTotal := total
	var catalogue []CruiseExtra
	if err = json.Unmarshal(extraJSON, &catalogue); err != nil {
		return out, err
	}
	products := map[string]CruiseExtra{}
	for _, p := range catalogue {
		products[p.ID] = p
	}
	lines := []CruiseLineItem{}
	for _, selection := range in.Extras {
		p, ok := products[selection.ID]
		if !ok || !p.Enabled || p.Price < 1 {
			return out, ErrConflict
		}
		var used int
		if err = tx.QueryRow(ctx, `SELECT COALESCE(sum(i.quantity),0) FROM cruise_reservation_items i JOIN cruise_reservations r ON r.id=i.reservation_id WHERE r.sailing_id=$1 AND i.extra_id=$2 AND (r.status='confirmed' OR (r.status='held' AND r.expires_at>now()))`, in.SailingID, p.ID).Scan(&used); err != nil {
			return out, err
		}
		if p.Stock-used < selection.Quantity {
			return out, ErrConflict
		}
		total += selection.Quantity * p.Price
		lines = append(lines, CruiseLineItem{ID: p.ID, Name: p.Name, Category: p.Category, Quantity: selection.Quantity, UnitPrice: p.Price})
	}
	if total > 2000000000 || total != in.ExpectedTotal {
		return out, ErrConflict
	}
	var occupied bool
	err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM cruise_reservations WHERE sailing_id=$1 AND table_ids && $2 AND (cardinality($3::text[])=0 OR cardinality(seat_ids)=0 OR seat_ids && $3) AND (status='confirmed' OR (status='held' AND expires_at>now())))`, in.SailingID, in.Tables, in.SeatIDs).Scan(&occupied)
	if err != nil {
		return out, err
	}
	if occupied {
		return out, ErrConflict
	}
	id := Token()[:24]
	if in.Requests == nil {
		in.Requests = []string{}
	}
	_, err = tx.Exec(ctx, `INSERT INTO cruise_reservations(id,user_id,sailing_id,request_key,request_hash,table_ids,guest_count,total,expires_at,table_total,extras_total,notes,requests,customer_name,customer_phone,terms,seat_ids) VALUES($1,$2,$3,$4,$5,$6,$7,$8,LEAST(now()+interval '15 minutes',$9),$10,$11,$12,$13,$14,$15,$16,$17)`, id, user, in.SailingID, key, fingerprint, in.Tables, in.Guests, total, dep, tableTotal, total-tableTotal, in.Notes, in.Requests, in.CustomerName, in.CustomerPhone, terms, in.SeatIDs)
	if err != nil {
		return out, err
	}
	for _, line := range lines {
		if _, err = tx.Exec(ctx, `INSERT INTO cruise_reservation_items(reservation_id,extra_id,name,category,quantity,unit_price) VALUES($1,$2,$3,$4,$5,$6)`, id, line.ID, line.Name, line.Category, line.Quantity, line.UnitPrice); err != nil {
			return out, err
		}
	}
	if err = tx.Commit(ctx); err != nil {
		return out, err
	}
	return s.CruiseReservation(ctx, id, user)
}

const reservationColumns = `r.id,r.sailing_id,s.title,v.name,s.departure_at,s.pier,r.table_ids,r.guest_count,r.total,CASE WHEN r.status='held' AND r.expires_at<=now() THEN 'expired' ELSE r.status END,r.expires_at,r.table_total,r.extras_total,r.notes,r.requests,r.customer_name,r.customer_phone,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.extra_id,'name',i.name,'category',i.category,'quantity',i.quantity,'unit_price',i.unit_price) ORDER BY i.extra_id) FROM cruise_reservation_items i WHERE i.reservation_id=r.id),'[]'::jsonb),r.seat_ids`

func scanReservation(row pgx.Row) (r CruiseReservation, err error) {
	var items []byte
	err = row.Scan(&r.ID, &r.SailingID, &r.Title, &r.Vessel, &r.Departure, &r.Pier, &r.TableIDs, &r.Guests, &r.Total, &r.Status, &r.Expires, &r.TableTotal, &r.ExtrasTotal, &r.Notes, &r.Requests, &r.CustomerName, &r.CustomerPhone, &items, &r.SeatIDs)
	if err == nil {
		err = json.Unmarshal(items, &r.Items)
	}
	return
}
func (s *Service) CruiseReservation(ctx context.Context, id, user string) (CruiseReservation, error) {
	return scanReservation(s.DB.QueryRow(ctx, `SELECT `+reservationColumns+` FROM cruise_reservations r JOIN sailings s ON s.id=r.sailing_id JOIN vessels v ON v.id=s.vessel_id WHERE r.id=$1 AND r.user_id=$2`, id, user))
}
func (s *Service) CruiseReservations(ctx context.Context, user string) ([]CruiseReservation, error) {
	rows, err := s.DB.Query(ctx, `SELECT `+reservationColumns+` FROM cruise_reservations r JOIN sailings s ON s.id=r.sailing_id JOIN vessels v ON v.id=s.vessel_id WHERE r.user_id=$1 ORDER BY r.created_at DESC LIMIT 100`, user)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []CruiseReservation{}
	for rows.Next() {
		r, e := scanReservation(rows)
		if e != nil {
			return nil, e
		}
		out = append(out, r)
	}
	return out, rows.Err()
}
func (s *Service) CancelCruiseReservation(ctx context.Context, id, user string) error {
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var locked string
	if err = tx.QueryRow(ctx, `SELECT id FROM cruise_reservations WHERE id=$1 AND user_id=$2 FOR UPDATE`, id, user).Scan(&locked); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrConflict
		}
		return err
	}
	tag, err := tx.Exec(ctx, `UPDATE cruise_reservations SET status='cancelled' WHERE id=$1 AND user_id=$2 AND status='held' AND NOT EXISTS(SELECT 1 FROM omise_checkouts o WHERE o.reservation_id=cruise_reservations.id)`, id, user)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return ErrConflict
	}
	return tx.Commit(ctx)
}
