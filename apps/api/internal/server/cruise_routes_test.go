package server

import (
	"net/http/httptest"
	"testing"
)

func TestCruiseAdminRequiresLogin(t *testing.T) {
	for _, method := range []string{"GET", "POST"} {
		r := (&Server{}).Router()
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(method, "/api/v1/dashboard/admin/cruises/sailings", nil))
		if w.Code != 401 {
			t.Fatalf("%s: got %d", method, w.Code)
		}
	}
}

func TestCruiseOperationsRequireStaffLogin(t *testing.T) {
	for _, route := range []struct{ method, path string }{
		{"GET", "/api/v1/dashboard/admin/cruises/reservations"},
		{"POST", "/api/v1/dashboard/admin/cruises/reservations/test/confirm-payment"},
		{"POST", "/api/v1/dashboard/admin/cruises/images"},
		{"GET", "/api/v1/dashboard/operator/cruises/sailings"},
		{"POST", "/api/v1/dashboard/operator/cruises/check-in"},
	} {
		w := httptest.NewRecorder()
		(&Server{}).Router().ServeHTTP(w, httptest.NewRequest(route.method, route.path, nil))
		if w.Code != 401 {
			t.Fatalf("%s %s got %d", route.method, route.path, w.Code)
		}
	}
}

func TestCruiseCheckoutDoesNotAdvertiseGateway(t *testing.T) {
	w := httptest.NewRecorder()
	(&Server{}).Router().ServeHTTP(w, httptest.NewRequest("GET", "/api/v1/cruise-checkout/config", nil))
	if w.Code != 200 || w.Body.String() != "{\"email_delivery_enabled\":false,\"payment_gateway_enabled\":false}" {
		t.Fatalf("unexpected checkout config %d %s", w.Code, w.Body.String())
	}
}

func TestCruiseImageDoesNotServeArbitraryFile(t *testing.T) {
	w := httptest.NewRecorder()
	(&Server{UploadDir: t.TempDir()}).Router().ServeHTTP(w, httptest.NewRequest("GET", "/api/v1/cruise-images/private.env", nil))
	if w.Code != 404 {
		t.Fatalf("unexpected image status %d", w.Code)
	}
}
