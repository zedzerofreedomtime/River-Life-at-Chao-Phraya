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
	QR           string    `json:"qr_url"`
	Status       string    `json:"status"`
	Expires      time.Time `json:"expires_at"`
	Sandbox      bool      `json:"sandbox"`
	ReviewReason string    `json:"review_reason,omitempty"`
	AuthorizeURL string    `json:"authorize_url,omitempty"`
}

func (p *CruisePayments) Checkout(ctx context.Context, id, user string, selection ...OmisePaymentInput) (CruiseCheckout, error) {
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
			return p.Status(ctx, id, user)
		}
		return p.Status(ctx, id, user)
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return out, err
	}
	if status != "held" || !expiry.After(time.Now().Add(time.Minute)) || amount < 2000 || amount > 15000000 {
		return out, ErrConflict
	}
	var input OmisePaymentInput
	if len(selection) > 0 {
		input = selection[0]
	}
	extended, multi := p.Client.(omiseMultiGateway)
	if multi {
		input, err = extended.PreparePayment(ctx, input, amount)
		if err != nil {
			return out, err
		}
	} else if input.Token != "" || input.Source != "" {
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
	var c OmiseCharge
	if multi {
		c, err = extended.CreatePayment(ctx, id, amount, expiry.Add(-30*time.Second), input)
	} else {
		c, err = p.Client.Create(ctx, id, amount, expiry.Add(-30*time.Second))
	}
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
		return CruiseCheckout{Status: "review_required", ReviewReason: "creation_unknown", Expires: b.Expires, Sandbox: true}, nil
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
			if !errors.Is(err, ErrConflict) {
				return out, err
			}
			// Never reclaim released inventory or acknowledge late money as a ticket.
			if _, err = p.Bookings.DB.Exec(ctx, `UPDATE omise_checkouts SET provider_status=$2,review_reason='paid_after_hold',checked_at=now() WHERE reservation_id=$1`, id, c.Status); err != nil {
				return out, err
			}
			return CruiseCheckout{Status: "review_required", ReviewReason: "paid_after_hold", Expires: b.Expires, Sandbox: true}, nil
		}
	}
	if _, err = p.Bookings.DB.Exec(ctx, `UPDATE omise_checkouts SET provider_status=$2,review_reason='',checked_at=now() WHERE reservation_id=$1`, id, c.Status); err != nil {
		return out, err
	}
	out = CruiseCheckout{QR: omiseQR(c), Status: c.Status, Expires: b.Expires.Add(-30 * time.Second), Sandbox: true, AuthorizeURL: omiseAuthorizeURL(c)}
	return out, nil
}

func (p *CruisePayments) Methods(ctx context.Context) (OmiseMethods, error) {
	if client, ok := p.Client.(omiseMultiGateway); ok {
		return client.PaymentMethods(ctx)
	}
	return OmiseMethods{Methods: []string{"promptpay"}}, nil
}

// Reconcile only links an existing attempt to a provider-verified charge. It
// never creates a charge, changes prices or overrides reservation expiry.
func (p *CruisePayments) Reconcile(ctx context.Context, id, charge, actor string) (CruiseCheckout, error) {
	var role, user string
	if err := p.Bookings.DB.QueryRow(ctx, `SELECT role FROM users WHERE id=$1`, actor).Scan(&role); err != nil || role != RoleAdmin && role != RoleOwner {
		return CruiseCheckout{}, ErrConflict
	}
	var total int
	if err := p.Bookings.DB.QueryRow(ctx, `SELECT user_id,total FROM cruise_reservations WHERE id=$1`, id).Scan(&user, &total); err != nil {
		return CruiseCheckout{}, err
	}
	if charge == "" {
		return p.Status(ctx, id, user)
	}
	c, err := p.Client.Retrieve(ctx, charge)
	if err != nil {
		return CruiseCheckout{}, err
	}
	if c.ID != charge {
		return CruiseCheckout{}, ErrConflict
	}
	if err = validateOmiseCharge(c, id, total); err != nil {
		return CruiseCheckout{}, err
	}
	tx, err := p.Bookings.DB.Begin(ctx)
	if err != nil {
		return CruiseCheckout{}, err
	}
	defer tx.Rollback(ctx)
	var existing string
	if err = tx.QueryRow(ctx, `SELECT COALESCE(charge_id,'') FROM omise_checkouts WHERE reservation_id=$1 FOR UPDATE`, id).Scan(&existing); err != nil {
		return CruiseCheckout{}, err
	}
	if existing != "" && existing != charge {
		return CruiseCheckout{}, ErrConflict
	}
	if existing == "" {
		if _, err = tx.Exec(ctx, `UPDATE omise_checkouts SET charge_id=$2 WHERE reservation_id=$1`, id, charge); err != nil {
			return CruiseCheckout{}, err
		}
		if _, err = tx.Exec(ctx, `INSERT INTO cruise_admin_audit(actor_id,sailing_id,action) SELECT $2,sailing_id,$3 FROM cruise_reservations WHERE id=$1`, id, actor, "omise:link-charge:"+id+":"+charge); err != nil {
			return CruiseCheckout{}, err
		}
	}
	if err = tx.Commit(ctx); err != nil {
		return CruiseCheckout{}, err
	}
	return p.Status(ctx, id, user)
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
