package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestOmiseRefundValidatesProviderResponse(t *testing.T) {
	for _, tc := range []struct {
		body string
		code int
		ok   bool
	}{{`{"id":"rfnd_test_qa","charge":"chrg_test_qa","amount":120000,"currency":"THB","livemode":false,"status":"closed"}`, 200, true}, {`{"id":"rfnd_live_qa","charge":"chrg_test_qa","amount":120000,"currency":"THB","livemode":true,"status":"closed"}`, 200, false}, {`{"id":"rfnd_test_qa","charge":"chrg_test_other","amount":120000,"currency":"THB","status":"closed"}`, 200, false}, {`{}`, 500, false}, {`{}`, 400, false}} {
		t.Run(tc.body, func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Method != "POST" || r.URL.Path != "/charges/chrg_test_qa/refunds" {
					t.Error("wrong request")
				}
				r.ParseForm()
				if r.Form.Get("amount") != "120000" {
					t.Error("wrong refund amount")
				}
				w.WriteHeader(tc.code)
				w.Write([]byte(tc.body))
			}))
			defer srv.Close()
			o := &OmiseClient{Secret: "skey_test_qa", BaseURL: srv.URL}
			_, err := o.Refund(context.Background(), "chrg_test_qa", 120000, "QA reason")
			if (err == nil) != tc.ok {
				t.Fatal("unsafe refund accepted", err)
			}
		})
	}
}
