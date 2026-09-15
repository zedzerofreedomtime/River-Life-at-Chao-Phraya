package service

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSlipAIVerifyRejectsMismatchedAmount(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer test-key" {
			t.Fatal("missing API auth")
		}
		body, _ := io.ReadAll(r.Body)
		if !strings.Contains(string(body), "input_image") {
			t.Fatal("missing image input")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"output":[{"content":[{"type":"output_text","text":"{\"status\":\"pass\",\"score\":2,\"reason\":\"อ่านได้ชัด\",\"amount_satang\":120000,\"reference\":\"ABC\"}"}]}]}`))
	}))
	defer server.Close()
	ai := &SlipAI{APIKey: "test-key", Endpoint: server.URL, Model: "test"}
	result, err := ai.Verify(context.Background(), []byte("image"), "image/png", 150000)
	if err != nil {
		t.Fatal(err)
	}
	if result.Status != "reject" || result.Score != 100 {
		t.Fatalf("expected mismatch rejection, got %#v", result)
	}
}

func TestSlipAIRequiresServerKey(t *testing.T) {
	_, err := (&SlipAI{}).Verify(context.Background(), []byte("image"), "image/png", 1)
	if err != ErrVerificationUnavailable {
		t.Fatalf("expected unavailable error, got %v", err)
	}
}
