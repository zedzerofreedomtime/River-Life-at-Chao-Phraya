package service

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"time"
)

type CruiseGateway interface {
	Create(context.Context, string, int, time.Time) (OmiseCharge, error)
	Retrieve(context.Context, string) (OmiseCharge, error)
}
type CruisePayments struct {
	Bookings *Service
	Client   CruiseGateway
}
type CruiseCheckout struct {
	QR      string    `json:"qr_url"`
	Status  string    `json:"status"`
	Expires time.Time `json:"expires_at"`
	Sandbox bool      `json:"sandbox"`
}

func (p *CruisePayments) Checkout(ctx context.Context, id, user string) (CruiseCheckout, error) {
	var out CruiseCheckout
	tx, err := p.Bookings.DB.Begin(ctx)
	if err != nil {
		return out, err
	}
	defer tx.Rollback(ctx)
	var amount int
	var expiry time.Time
	var status string
	err = tx.QueryRow(ctx, `SELECT total,expires_at,status FROM cruise_reservations WHERE id=$1 AND user_id=$2 FOR UPDATE`, id, user).Scan(&amount, &expiry, &status)
	if err != nil {
		return out, err
	}
	var charge string
	err = tx.QueryRow(ctx, `SELECT COALESCE(charge_id,'') FROM omise_checkouts WHERE reservation_id=$1`, id).Scan(&charge)
	if err == nil {
		_ = tx.Rollback(ctx)
		if charge == "" {
			return out, errors.New("Payment creation pending reconciliation; contact staff")
		}
		return p.Status(ctx, id, user)
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return out, err
	}
	if status != "held" || !expiry.After(time.Now().Add(time.Minute)) || amount < 2000 || amount > 15000000 {
		return out, ErrConflict
	}
	// Persist the attempt BEFORE the external request. An ambiguous network failure
	// must never create a second payable QR. Staff can reconcile by metadata.
	if _, err = tx.Exec(ctx, `INSERT INTO omise_checkouts(reservation_id) VALUES($1)`, id); err != nil {
		return out, err
	}
	if err = tx.Commit(ctx); err != nil {
		return out, err
	}
	c, err := p.Client.Create(ctx, id, amount, expiry.Add(-30*time.Second))
	if err != nil {
		return out, err
	}
	if err = validateOmiseCharge(c, id, amount); err != nil {
		return out, err
	}
	if _, err = p.Bookings.DB.Exec(ctx, `UPDATE omise_checkouts SET charge_id=$2 WHERE reservation_id=$1 AND charge_id IS NULL`, id, c.ID); err != nil {
		return out, err
	}
	return p.Status(ctx, id, user)
}
func (p *CruisePayments) Status(ctx context.Context, id, user string) (CruiseCheckout, error) {
	var out CruiseCheckout
	b, err := p.Bookings.CruiseReservation(ctx, id, user)
	if err != nil {
		return out, err
	}
	var charge string
	if err = p.Bookings.DB.QueryRow(ctx, `SELECT COALESCE(charge_id,'') FROM omise_checkouts WHERE reservation_id=$1`, id).Scan(&charge); err != nil {
		return out, err
	}
	if charge == "" {
		return out, errors.New("Payment creation pending reconciliation; contact staff")
	}
	c, err := p.Client.Retrieve(ctx, charge)
	if err != nil {
		return out, err
	}
	if c.ID != charge {
		return out, ErrConflict
	}
	if err = validateOmiseCharge(c, id, b.Total); err != nil {
		return out, err
	}
	if c.Status == "successful" && !c.Paid {
		return out, errors.New("Omise charge is not paid")
	}
	if c.Status == "successful" && c.Paid {
		if _, err = p.Bookings.confirmCruisePayment(ctx, id, "", c.ID, c.Amount, "omise"); err != nil {
			return out, err
		}
	}
	out = CruiseCheckout{QR: omiseQR(c), Status: c.Status, Expires: b.Expires.Add(-30 * time.Second), Sandbox: true}
	return out, nil
}

// Webhook bodies are hints only. Retrieve the known charge using the secret key.
func (p *CruisePayments) SyncCharge(ctx context.Context, charge string) error {
	var id, user string
	err := p.Bookings.DB.QueryRow(ctx, `SELECT o.reservation_id,r.user_id FROM omise_checkouts o JOIN cruise_reservations r ON r.id=o.reservation_id WHERE o.charge_id=$1`, charge).Scan(&id, &user)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	_, err = p.Status(ctx, id, user)
	return err
}
