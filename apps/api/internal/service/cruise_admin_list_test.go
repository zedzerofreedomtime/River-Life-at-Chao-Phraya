package service

import (
	"context"
	"errors"
	"testing"
)

func TestAdminCruiseReservationPagination(t *testing.T) {
	s := isolatedTableService(t)
	ctx := context.Background()
	empty, err := s.AdminCruiseReservationPage(ctx, 25, "")
	if err != nil || empty.Items == nil || len(empty.Items) != 0 || empty.NextCursor != "" {
		t.Fatalf("empty page: %+v %v", empty, err)
	}
	_, err = s.DB.Exec(ctx, `INSERT INTO users(id,email) VALUES('paging','paging@example.test');
	INSERT INTO sailings(id,vessel_id,title) VALUES('paging','unicorn','Pagination test');
	INSERT INTO cruise_reservations(id,user_id,sailing_id,request_key,request_hash,table_ids,guest_count,total,status,expires_at,created_at)
	SELECT 'page-'||lpad(g::text,3,'0'),'paging','paging',g::text,'hash',ARRAY['U01'],1,100,'held',now()-interval '1 minute','2026-01-01'::timestamptz FROM generate_series(1,105) g;`)
	if err != nil {
		t.Fatal(err)
	}
	seen := map[string]bool{}
	cursor := ""
	for n := 0; ; n++ {
		page, err := s.AdminCruiseReservationPage(ctx, 25, cursor)
		if err != nil {
			t.Fatal(err)
		}
		if len(page.Items) > 25 {
			t.Fatal("page limit exceeded")
		}
		for _, item := range page.Items {
			if seen[item.ID] || item.ID == "newest" || item.Status != "expired" {
				t.Fatalf("shifted/duplicate/status: %+v", item)
			}
			seen[item.ID] = true
		}
		if n == 0 {
			if page.Items[0].ID != "page-105" {
				t.Fatal("unstable timestamp tie ordering")
			}
			_, err = s.DB.Exec(ctx, `INSERT INTO cruise_reservations(id,user_id,sailing_id,request_key,request_hash,table_ids,guest_count,total,status,expires_at) VALUES('newest','paging','paging','newest','hash',ARRAY['U01'],1,100,'held',now()+interval '1 hour')`)
			if err != nil {
				t.Fatal(err)
			}
		}
		if page.NextCursor == "" {
			break
		}
		if n > 5 || page.NextCursor == cursor {
			t.Fatal("cursor failed to advance")
		}
		cursor = page.NextCursor
	}
	if len(seen) != 105 {
		t.Fatalf("lost records: %d", len(seen))
	}
	legacy, err := s.AdminCruiseReservations(ctx)
	if err != nil || len(legacy) != 100 || legacy[0].ID != "newest" {
		t.Fatalf("legacy compatibility: %d %v", len(legacy), err)
	}
	for _, limit := range []int{0, 101, -1} {
		if _, err := s.AdminCruiseReservationPage(ctx, limit, ""); !errors.Is(err, ErrConflict) {
			t.Fatalf("accepted limit %d", limit)
		}
	}
	for _, cursor := range []string{"not-base64!", "e30"} {
		if _, err := s.AdminCruiseReservationPage(ctx, 25, cursor); !errors.Is(err, ErrConflict) {
			t.Fatal("accepted invalid cursor")
		}
	}
}
