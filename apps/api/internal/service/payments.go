package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	stripe "github.com/stripe/stripe-go/v85"
)

// CheckoutClient keeps Stripe network calls separate from booking transactions.
type CheckoutClient interface {
	Create(context.Context, *stripe.CheckoutSessionCreateParams) (*stripe.CheckoutSession, error)
	Retrieve(context.Context, string, *stripe.CheckoutSessionRetrieveParams) (*stripe.CheckoutSession, error)
}

type Payments struct {
	Bookings  *Service
	Client    CheckoutClient
	WebOrigin string
}

type CheckoutResult struct {
	URL       string    `json:"url"`
	ExpiresAt time.Time `json:"expires_at"`
}

func (p *Payments) Checkout(ctx context.Context, id, token string, consent bool, language string) (CheckoutResult, error) {
	tx, err := p.Bookings.DB.Begin(ctx)
	if err != nil {
		return CheckoutResult{}, err
	}
	defer tx.Rollback(ctx)
	b, err := scan(tx.QueryRow(ctx, "SELECT "+columns+" FROM bookings WHERE id=$1 AND token_hash=$2 FOR UPDATE", id, Hash(token)))
	if err != nil {
		return CheckoutResult{}, err
	}
	if b.Status != "held" || b.Total <= 0 {
		return CheckoutResult{}, ErrConflict
	}
	var capacity, used int
	if err = tx.QueryRow(ctx, "SELECT capacity FROM zones WHERE id=$1 FOR UPDATE", b.ZoneID).Scan(&capacity); err != nil {
		return CheckoutResult{}, err
	}
	if err = tx.QueryRow(ctx, `SELECT COALESCE(SUM(quantity),0) FROM bookings WHERE zone_id=$1 AND id<>$2
		AND (status IN ('review','confirmed','no_show') OR (status='held' AND expires_at>now()))`, b.ZoneID, id).Scan(&used); err != nil {
		return CheckoutResult{}, err
	}
	if capacity-used < b.Quantity {
		return CheckoutResult{}, ErrConflict
	}
	var sessionID string
	err = tx.QueryRow(ctx, "SELECT session_id FROM stripe_checkouts WHERE booking_id=$1", id).Scan(&sessionID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return CheckoutResult{}, err
	}
	var checkout *stripe.CheckoutSession
	if sessionID != "" {
		checkout, err = p.Client.Retrieve(ctx, sessionID, nil)
	} else {
		// Stripe requires at least 30 minutes. Keep quota for five additional
		// minutes so a payment made just before expiry can be delivered safely.
		// Derive expiry from the persisted hold so retries send identical Stripe parameters.
		expiry := b.ExpiresAt.Add(31 * time.Minute).Truncate(time.Second)
		params := &stripe.CheckoutSessionCreateParams{
			Mode:              stripe.String("payment"),
			ClientReferenceID: stripe.String(id),
			CustomerEmail:     stripe.String(b.Email),
			Locale:            stripe.String(language),
			SuccessURL:        stripe.String(strings.TrimRight(p.WebOrigin, "/") + "/payment?stripe_return=1"),
			CancelURL:         stripe.String(strings.TrimRight(p.WebOrigin, "/") + "/payment?stripe_cancelled=1"),
			ExpiresAt:         stripe.Int64(expiry.Unix()),
			Metadata:          map[string]string{"booking_id": id},
			LineItems: []*stripe.CheckoutSessionCreateLineItemParams{{
				Quantity: stripe.Int64(int64(b.Quantity)),
				PriceData: &stripe.CheckoutSessionCreateLineItemPriceDataParams{
					Currency:   stripe.String("thb"),
					UnitAmount: stripe.Int64(int64(b.Total / b.Quantity)),
					ProductData: &stripe.CheckoutSessionCreateLineItemPriceDataProductDataParams{
						Name: stripe.String("Concert on the River · Zone " + b.ZoneID),
					},
				},
			}},
		}
		params.SetIdempotencyKey("riverlife-checkout-" + id)
		checkout, err = p.Client.Create(ctx, params)
	}
	if err != nil {
		return CheckoutResult{}, errors.New("Stripe checkout is temporarily unavailable")
	}
	if checkout.Livemode || checkout.Status != stripe.CheckoutSessionStatusOpen || checkout.URL == "" {
		return CheckoutResult{}, ErrConflict
	}
	if _, err = tx.Exec(ctx, "INSERT INTO stripe_checkouts(booking_id,session_id) VALUES($1,$2) ON CONFLICT DO NOTHING", id, checkout.ID); err != nil {
		return CheckoutResult{}, err
	}
	_, err = tx.Exec(ctx, `UPDATE bookings SET expires_at=to_timestamp($2)+interval '5 minutes',
		marketing_consent_at=CASE WHEN $3 THEN COALESCE(marketing_consent_at,now()) ELSE NULL END,
		marketing_consent_version=CASE WHEN $3 THEN $4 ELSE '' END,
		marketing_consent_language=CASE WHEN $3 THEN $5 ELSE '' END WHERE id=$1`, id, checkout.ExpiresAt, consent, MarketingConsentVersion, language)
	if err != nil {
		return CheckoutResult{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return CheckoutResult{}, err
	}
	return CheckoutResult{URL: checkout.URL, ExpiresAt: time.Unix(checkout.ExpiresAt, 0)}, nil
}

// Sync fetches the session using the server's key, rather than trusting the
// browser redirect or an unverified webhook payload to issue tickets.
func (p *Payments) Sync(ctx context.Context, id, token string) (Booking, error) {
	b, err := p.Bookings.Get(ctx, id, token, false)
	if err != nil {
		return b, err
	}
	var sessionID string
	err = p.Bookings.DB.QueryRow(ctx, "SELECT session_id FROM stripe_checkouts WHERE booking_id=$1", id).Scan(&sessionID)
	if errors.Is(err, pgx.ErrNoRows) {
		return b, nil
	}
	if err != nil {
		return b, err
	}
	if err = p.SyncSession(ctx, sessionID); err != nil {
		return b, err
	}
	return p.Bookings.Get(ctx, id, token, false)
}

func (p *Payments) SyncSession(ctx context.Context, sessionID string) error {
	var id string
	err := p.Bookings.DB.QueryRow(ctx, "SELECT booking_id FROM stripe_checkouts WHERE session_id=$1", sessionID).Scan(&id)
	// Events for unrelated test products do not belong to this application.
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	session, err := p.Client.Retrieve(ctx, sessionID, nil)
	if err != nil {
		return errors.New("Stripe payment status is temporarily unavailable")
	}
	if session.ID != sessionID || session.Livemode || session.ClientReferenceID != id || session.Metadata["booking_id"] != id {
		return errors.New("Stripe session does not match booking")
	}
	if session.PaymentStatus != stripe.CheckoutSessionPaymentStatusPaid {
		return nil
	}
	return p.confirm(ctx, id, session)
}

func (p *Payments) confirm(ctx context.Context, id string, session *stripe.CheckoutSession) error {
	tx, err := p.Bookings.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	b, err := scan(tx.QueryRow(ctx, "SELECT "+columns+" FROM bookings WHERE id=$1 FOR UPDATE", id))
	if err != nil {
		return err
	}
	if session.Currency != stripe.CurrencyTHB || session.AmountTotal != int64(b.Total) {
		return errors.New("Stripe payment amount does not match booking")
	}
	if b.Status == "confirmed" || b.Status == "no_show" {
		return nil
	}
	if b.Status != "held" && b.Status != "expired" {
		return ErrConflict
	}
	var capacity, used int
	if err = tx.QueryRow(ctx, "SELECT capacity FROM zones WHERE id=$1 FOR UPDATE", b.ZoneID).Scan(&capacity); err != nil {
		return err
	}
	if err = tx.QueryRow(ctx, `SELECT COALESCE(SUM(quantity),0) FROM bookings WHERE zone_id=$1 AND id<>$2
		AND (status IN ('review','confirmed','no_show') OR (status='held' AND expires_at>now()))`, b.ZoneID, id).Scan(&used); err != nil {
		return err
	}
	if capacity-used < b.Quantity {
		// Never oversell if a webhook arrives after the reservation was released.
		return fmt.Errorf("%w: paid booking requires staff reconciliation", ErrConflict)
	}
	if _, err = tx.Exec(ctx, "UPDATE bookings SET status='confirmed' WHERE id=$1", id); err != nil {
		return err
	}
	for i := 0; i < b.Quantity; i++ {
		if _, err = tx.Exec(ctx, "INSERT INTO tickets(id,booking_id) VALUES($1,$2)", Token(), id); err != nil {
			return err
		}
	}
	if _, err = tx.Exec(ctx, "INSERT INTO audit_log(booking_id,action) VALUES($1,'stripe_test_payment_confirmed')", id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
