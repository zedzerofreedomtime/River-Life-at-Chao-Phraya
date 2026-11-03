package server

import (
	"net/http/httptest"
	"testing"
)

func TestGoogleReturnPaths(t *testing.T) {
	for _, value := range []string{"https://evil.test", "//evil.test", "/\\evil.test", "/auth", "/booking?next=https://evil.test", ""} {
		if googleReturnPath(value) != "/orders" {
			t.Fatal("unsafe return accepted", value)
		}
	}
	for _, value := range []string{"/booking", "/orders", "/tickets", "/payment"} {
		if googleReturnPath(value) != value {
			t.Fatal("valid return rejected")
		}
	}
}
func TestUnconfiguredGoogleDoesNotRedirectToProvider(t *testing.T) {
	w := httptest.NewRecorder()
	(&Server{}).Router().ServeHTTP(w, httptest.NewRequest("GET", "/api/v1/auth/google/start", nil))
	if w.Code != 503 {
		t.Fatal(w.Code)
	}
}
