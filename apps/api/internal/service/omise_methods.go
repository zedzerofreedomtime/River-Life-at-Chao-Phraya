package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

type OmisePaymentInput struct {
	Token  string `json:"token"`
	Source string `json:"source"`
	Method string `json:"-"`
}
type OmiseMethods struct {
	PublicKey string   `json:"public_key,omitempty"`
	Methods   []string `json:"payment_methods"`
}
type omiseMultiGateway interface {
	PreparePayment(context.Context, OmisePaymentInput, int) (OmisePaymentInput, error)
	CreatePayment(context.Context, string, int, time.Time, OmisePaymentInput) (OmiseCharge, error)
	PaymentMethods(context.Context) (OmiseMethods, error)
}

func supportedOmiseMethod(method string) bool {
	switch method {
	case "card", "promptpay", "alipay", "alipay_cn", "grabpay", "rabbit_linepay", "shopeepay", "shopeepay_jumpapp", "truemoney_jumpapp", "mobile_banking_bay", "mobile_banking_bbl", "mobile_banking_kbank", "mobile_banking_ktb", "mobile_banking_scb":
		return true
	}
	// Explicit names avoid accidentally allowing offline or arbitrary new source types.
	switch method {
	case "installment_bay", "installment_bbl", "installment_first_choice", "installment_kbank", "installment_ktc", "installment_scb", "installment_ttb", "installment_uob":
		return true
	}
	return false
}

func (o *OmiseClient) readPaymentObject(ctx context.Context, path, key string, out any) error {
	if !strings.HasPrefix(o.Secret, "skey_test_") {
		return errors.New("Omise test key required")
	}
	base := o.BaseURL
	if base == "" {
		base = "https://api.omise.co"
	}
	req, err := http.NewRequestWithContext(ctx, "GET", base+path, nil)
	if err != nil {
		return err
	}
	req.SetBasicAuth(key, "")
	req.Header.Set("Omise-Version", "2019-05-29")
	client := o.HTTP
	if client == nil {
		client = &http.Client{Timeout: 12 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	}
	res, err := client.Do(req)
	if err != nil {
		return errors.New("Unable to load Omise payment methods")
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return fmt.Errorf("Omise payment lookup failed (HTTP %d)", res.StatusCode)
	}
	return json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(out)
}

func (o *OmiseClient) PaymentMethods(ctx context.Context) (OmiseMethods, error) {
	o.methodsMu.Lock()
	defer o.methodsMu.Unlock()
	if time.Now().Before(o.methodsUntil) {
		return o.methodsCache, o.methodsError
	}
	out := OmiseMethods{Methods: []string{"promptpay"}}
	if !strings.HasPrefix(o.PublicKey, "pkey_test_") {
		return out, nil
	}
	var capability struct {
		Country        string `json:"country"`
		PaymentMethods []struct {
			Name       string   `json:"name"`
			Currencies []string `json:"currencies"`
		} `json:"payment_methods"`
		TokenizationMethods []string `json:"tokenization_methods"`
	}
	if err := o.readPaymentObject(ctx, "/capability", o.PublicKey, &capability); err != nil {
		o.methodsCache = out
		o.methodsError = err
		o.methodsUntil = time.Now().Add(10 * time.Second)
		return out, err
	}
	out.PublicKey = o.PublicKey
	out.Methods = []string{}
	for _, method := range capability.PaymentMethods {
		thb := false
		for _, currency := range method.Currencies {
			if strings.EqualFold(currency, "thb") {
				thb = true
			}
		}
		if thb && supportedOmiseMethod(method.Name) {
			out.Methods = append(out.Methods, method.Name)
		}
	}
	if capability.Country == "TH" {
		for _, method := range capability.TokenizationMethods {
			if method == "googlepay" {
				out.Methods = append(out.Methods, "googlepay")
			}
		}
	}
	o.methodsCache = out
	o.methodsError = nil
	o.methodsUntil = time.Now().Add(time.Minute)
	return out, nil
}

var omiseNonce = regexp.MustCompile(`^(tokn|src)_test_[A-Za-z0-9]+$`)

func (o *OmiseClient) PreparePayment(ctx context.Context, in OmisePaymentInput, amount int) (OmisePaymentInput, error) {
	if in.Token == "" && in.Source == "" {
		in.Method = "promptpay"
		return in, nil
	}
	if (in.Token != "" && in.Source != "") || !strings.HasPrefix(o.PublicKey, "pkey_test_") {
		return in, ErrConflict
	}
	if in.Token != "" {
		if !omiseNonce.MatchString(in.Token) || !strings.HasPrefix(in.Token, "tokn_test_") {
			return in, ErrConflict
		}
		in.Method = "card"
	} else {
		if !omiseNonce.MatchString(in.Source) || !strings.HasPrefix(in.Source, "src_test_") {
			return in, ErrConflict
		}
		var source struct {
			ID       string `json:"id"`
			Type     string `json:"type"`
			Amount   int    `json:"amount"`
			Currency string `json:"currency"`
			Livemode bool   `json:"livemode"`
		}
		if err := o.readPaymentObject(ctx, "/sources/"+url.PathEscape(in.Source), o.Secret, &source); err != nil {
			return in, err
		}
		if source.ID != in.Source || source.Livemode || source.Amount != amount || !strings.EqualFold(source.Currency, "thb") {
			return in, ErrConflict
		}
		in.Method = source.Type
	}
	if !supportedOmiseMethod(in.Method) {
		return in, ErrConflict
	}
	methods, err := o.PaymentMethods(ctx)
	if err != nil {
		return in, err
	}
	for _, method := range methods.Methods {
		if method == in.Method {
			return in, nil
		}
	}
	return in, ErrConflict
}

func (o *OmiseClient) CreatePayment(ctx context.Context, id string, amount int, expiry time.Time, in OmisePaymentInput) (OmiseCharge, error) {
	if in.Method == "promptpay" && in.Token == "" && in.Source == "" {
		return o.Create(ctx, id, amount, expiry)
	}
	if !supportedOmiseMethod(in.Method) || (in.Token == "" && in.Source == "") {
		return OmiseCharge{}, ErrConflict
	}
	origin, err := url.Parse(o.ReturnOrigin)
	if err != nil || origin.Host == "" || origin.User != nil || (origin.Scheme != "https" && !(origin.Scheme == "http" && (origin.Hostname() == "localhost" || origin.Hostname() == "127.0.0.1"))) {
		return OmiseCharge{}, errors.New("Payment return origin is not configured")
	}
	origin.Path = "/booking"
	origin.RawQuery = url.Values{"payment": {id}}.Encode()
	origin.Fragment = ""
	form := url.Values{"amount": {fmt.Sprint(amount)}, "currency": {"thb"}, "return_uri": {origin.String()}, "metadata[reservation_id]": {id}, "metadata[payment_method]": {in.Method}, "description": {"River Life reservation " + id}}
	if in.Token != "" {
		form.Set("card", in.Token)
	} else {
		form.Set("source", in.Source)
		if in.Method == "promptpay" {
			form.Set("expires_at", expiry.UTC().Format(time.RFC3339))
		}
	}
	if o.WebhookURL != "" {
		u, e := url.Parse(o.WebhookURL)
		if e != nil || u.Scheme != "https" || u.Hostname() == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
			return OmiseCharge{}, errors.New("invalid Omise webhook URL")
		}
		form.Set("webhook_endpoints[]", o.WebhookURL)
	}
	return o.request(ctx, "POST", "/charges", form)
}

func omiseAuthorizeURL(c OmiseCharge) string {
	u, err := url.Parse(c.AuthorizeURI)
	if err != nil || u.Scheme != "https" || u.User != nil || u.Port() != "" {
		return ""
	}
	if (u.Hostname() == "api.omise.co" && strings.HasPrefix(u.Path, "/payments/")) || u.Hostname() == "pay.omise.co" || u.Hostname() == "3ds.omise.co" {
		return u.String()
	}
	return ""
}
