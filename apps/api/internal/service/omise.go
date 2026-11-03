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

// OmiseClient is deliberately sandbox-only. Card details never reach this API.
type OmiseClient struct {
	Secret  string
	HTTP    *http.Client
	BaseURL string
}
type OmiseCharge struct {
	ID             string            `json:"id"`
	Livemode       bool              `json:"livemode"`
	Status         string            `json:"status"`
	Paid           bool              `json:"paid"`
	Amount         int               `json:"amount"`
	Currency       string            `json:"currency"`
	RefundedAmount int               `json:"refunded_amount"`
	Metadata       map[string]string `json:"metadata"`
	Source         struct {
		Type          string `json:"type"`
		ScannableCode struct {
			Image struct {
				DownloadURI string `json:"download_uri"`
			} `json:"image"`
		} `json:"scannable_code"`
	} `json:"source"`
}

func (o *OmiseClient) request(ctx context.Context, method, path string, form url.Values) (OmiseCharge, error) {
	var out OmiseCharge
	if !strings.HasPrefix(o.Secret, "skey_test_") {
		return out, errors.New("Omise test secret key required")
	}
	base := o.BaseURL
	if base == "" {
		base = "https://api.omise.co"
	}
	req, err := http.NewRequestWithContext(ctx, method, base+path, strings.NewReader(form.Encode()))
	if err != nil {
		return out, err
	}
	req.SetBasicAuth(o.Secret, "")
	req.Header.Set("Omise-Version", "2019-05-29")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	client := o.HTTP
	if client == nil {
		client = &http.Client{Timeout: 12 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	}
	res, err := client.Do(req)
	if err != nil {
		return out, errors.New("Omise request outcome unknown; contact staff before retrying")
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return out, fmt.Errorf("Omise request failed (HTTP %d)", res.StatusCode)
	}
	if err = json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&out); err != nil {
		return out, errors.New("Invalid Omise response")
	}
	if out.Livemode || !strings.HasPrefix(out.ID, "chrg_test_") {
		return out, errors.New("Omise sandbox charge required")
	}
	return out, nil
}
func (o *OmiseClient) Create(ctx context.Context, id string, amount int, expiry time.Time) (OmiseCharge, error) {
	return o.request(ctx, "POST", "/charges", url.Values{"amount": {fmt.Sprint(amount)}, "currency": {"thb"}, "source[type]": {"promptpay"}, "metadata[reservation_id]": {id}, "description": {"River Life reservation " + id}, "expires_at": {expiry.UTC().Format(time.RFC3339)}})
}
func (o *OmiseClient) Retrieve(ctx context.Context, id string) (OmiseCharge, error) {
	if !strings.HasPrefix(id, "chrg_test_") || strings.ContainsAny(id, "/?#\\") {
		return OmiseCharge{}, ErrConflict
	}
	return o.request(ctx, "GET", "/charges/"+url.PathEscape(id), nil)
}
func validateOmiseCharge(c OmiseCharge, id string, amount int) error {
	if c.Livemode || !strings.HasPrefix(c.ID, "chrg_test_") || c.Metadata["reservation_id"] != id || c.Amount != amount || !strings.EqualFold(c.Currency, "thb") || c.Source.Type != "promptpay" || c.RefundedAmount != 0 {
		return errors.New("Omise charge does not match reservation")
	}
	return nil
}
func omiseQR(c OmiseCharge) string {
	u, err := url.Parse(c.Source.ScannableCode.Image.DownloadURI)
	if err != nil || u.Scheme != "https" || u.Host != "api.omise.co" || u.User != nil || !strings.HasPrefix(u.Path, "/charges/"+c.ID+"/documents/") {
		return ""
	}
	return u.String()
}
