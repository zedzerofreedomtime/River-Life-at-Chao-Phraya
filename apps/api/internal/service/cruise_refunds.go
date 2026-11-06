package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

var ErrRefundRejected = errors.New("Omise rejected refund; no refund completed")

type cruiseRefunder interface {
	Refund(context.Context, string, int, string) (string, error)
}

func (o *OmiseClient) Refund(ctx context.Context, charge string, amount int, reason string) (string, error) {
	if !strings.HasPrefix(o.Secret, "skey_test_") || !strings.HasPrefix(charge, "chrg_test_") || strings.ContainsAny(charge, "/?#\\") {
		return "", ErrConflict
	}
	base := o.BaseURL
	if base == "" {
		base = "https://api.omise.co"
	}
	form := url.Values{"amount": {fmt.Sprint(amount)}, "reason": {reason}}
	req, err := http.NewRequestWithContext(ctx, "POST", base+"/charges/"+url.PathEscape(charge)+"/refunds", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.SetBasicAuth(o.Secret, "")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Omise-Version", "2019-05-29")
	client := o.HTTP
	if client == nil {
		client = &http.Client{Timeout: 12 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	}
	res, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	if res.StatusCode >= 400 && res.StatusCode < 500 {
		return "", ErrRefundRejected
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return "", errors.New("refund outcome unknown")
	}
	var v struct {
		ID       string `json:"id"`
		Charge   string `json:"charge"`
		Amount   int    `json:"amount"`
		Currency string `json:"currency"`
		Live     bool   `json:"livemode"`
		Status   string `json:"status"`
	}
	if err = json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&v); err != nil {
		return "", err
	}
	if v.Live || !strings.HasPrefix(v.ID, "rfnd_test_") || v.Charge != charge || v.Amount != amount || strings.ToLower(v.Currency) != "thb" || v.Status != "closed" {
		return "", errors.New("refund requires review")
	}
	return v.ID, nil
}
func (p *CruisePayments) Refund(ctx context.Context, actor, id, reason string) error {
	if len(strings.TrimSpace(reason)) < 3 || len(reason) > 255 {
		return ErrConflict
	}
	db := p.Bookings.DB
	var role string
	if err := db.QueryRow(ctx, `SELECT role FROM users WHERE id=$1 AND NOT suspended`, actor).Scan(&role); err != nil || role != RoleOwner {
		return ErrConflict
	}
	var charge string
	var total int
	var status string
	if err := db.QueryRow(ctx, `SELECT o.charge_id,r.total,r.status FROM cruise_reservations r JOIN omise_checkouts o ON o.reservation_id=r.id WHERE r.id=$1`, id).Scan(&charge, &total, &status); err != nil {
		return err
	}
	var prior string
	_ = db.QueryRow(ctx, `SELECT status FROM cruise_refunds WHERE reservation_id=$1`, id).Scan(&prior)
	if prior == "completed" {
		return nil
	}
	if status != "confirmed" {
		return ErrConflict
	}
	remote, err := p.Client.Retrieve(ctx, charge)
	if err != nil {
		return err
	}
	if remote.ID != charge || remote.Livemode || !strings.HasPrefix(charge, "chrg_test_") || remote.Amount != total || remote.Metadata["reservation_id"] != id || strings.ToLower(remote.Currency) != "thb" {
		return ErrConflict
	}
	// Persist intent before external I/O. An unknown result is reconciled via GET;
	// it is never retried with a second refund POST.
	if prior != "" {
		if prior != "review" || remote.RefundedAmount < total {
			return ErrConflict
		}
		return p.finishRefund(ctx, actor, id, charge)
	}
	if remote.RefundedAmount != 0 || !remote.Paid || remote.Status != "successful" {
		return ErrConflict
	}
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	rows, err := tx.Query(ctx, `SELECT id FROM cruise_tickets WHERE reservation_id=$1 ORDER BY ordinal FOR UPDATE`, id)
	if err != nil {
		return err
	}
	for rows.Next() {
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	var checked bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM cruise_tickets WHERE reservation_id=$1 AND checked_in_at IS NOT NULL)`, id).Scan(&checked); err != nil {
		return err
	}
	if checked {
		return ErrConflict
	}
	tag, err := tx.Exec(ctx, `INSERT INTO cruise_refunds(reservation_id,actor_id,reason) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, id, actor, reason)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return ErrConflict
	}
	if _, err = tx.Exec(ctx, `INSERT INTO staff_audit(actor_id,action,target_id) VALUES($1,'refund-requested',$2)`, actor, id); err != nil {
		return err
	}
	if err = tx.Commit(ctx); err != nil {
		return err
	}
	client, ok := p.Client.(cruiseRefunder)
	if !ok {
		return ErrConflict
	}
	reference, err := client.Refund(ctx, charge, total, reason)
	if err != nil {
		if errors.Is(err, ErrRefundRejected) {
			_, _ = db.Exec(ctx, `UPDATE cruise_refunds SET status='rejected' WHERE reservation_id=$1 AND status='review'`, id)
		}
		return err
	}
	return p.finishRefund(ctx, actor, id, reference)
}
func (p *CruisePayments) finishRefund(ctx context.Context, actor, id, reference string) error {
	tx, err := p.Bookings.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `UPDATE cruise_refunds SET status='completed',reference=$2 WHERE reservation_id=$1`, id, reference); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `UPDATE cruise_reservations SET status='cancelled' WHERE id=$1 AND status='confirmed'`, id); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO staff_audit(actor_id,action,target_id) VALUES($1,'refund-completed',$2)`, actor, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
