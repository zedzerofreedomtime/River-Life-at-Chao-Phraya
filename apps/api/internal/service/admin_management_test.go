package service

import (
	"context"
	"testing"
	"time"
)

func TestManagementOwnerAndAccountProtection(t *testing.T) {
	s := isolatedTableService(t)
	ctx := context.Background()
	if _, e := s.DB.Exec(ctx, `INSERT INTO users(id,email,role) VALUES('owner','owner@qa.test','owner'),('admin','admin@qa.test','admin'),('sales','sales@qa.test','sales'),('user','user@qa.test','user'),('operator','operator@qa.test','operator')`); e != nil {
		t.Fatal(e)
	}
	for _, v := range [][3]string{{"admin", "sales", "admin"}, {"admin", "owner", "user"}, {"admin", "admin", "user"}, {"sales", "user", "operator"}} {
		if e := s.SetRole(ctx, v[0], v[1], v[2]); e == nil {
			t.Fatal("privilege escalation", v)
		}
	}
	if e := s.SetRole(ctx, "owner", "sales", "admin"); e != nil {
		t.Fatal(e)
	}
	for _, v := range [][3]string{{"admin", "owner", "suspend"}, {"admin", "sales", "suspend"}, {"owner", "owner", "logout"}, {"operator", "user", "suspend"}} {
		if e := s.ManageAccount(ctx, v[0], v[1], v[2]); e == nil {
			t.Fatal("protected account changed", v)
		}
	}
	if e := s.ManageAccount(ctx, "admin", "user", "suspend"); e != nil {
		t.Fatal(e)
	}
	var active bool
	var version int
	if e := s.DB.QueryRow(ctx, `SELECT suspended,auth_version FROM users WHERE id='user'`).Scan(&active, &version); e != nil || !active || version != 1 {
		t.Fatal("suspension not persisted", e)
	}
	if e := s.ManageAccount(ctx, "admin", "user", "restore"); e != nil {
		t.Fatal(e)
	}
	if e := s.ManageAccount(ctx, "admin", "user", "logout"); e != nil {
		t.Fatal(e)
	}
	list, e := s.ManagedUsers(ctx, "USER@QA", 0)
	if e != nil || len(list) != 1 {
		t.Fatal("search", list, e)
	}
	log, e := s.StaffAudit(ctx, 0)
	if e != nil || len(log) != 4 {
		t.Fatal("audit", log, e)
	}
	report, e := s.SalesReport(ctx, time.Now().Add(-time.Hour), time.Now())
	if e != nil || len(report) != 0 {
		t.Fatal("empty report", e)
	}
}
