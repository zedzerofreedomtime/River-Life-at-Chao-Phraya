package server

import (
	"bytes"
	"context"
	"image"
	"image/jpeg"
	"image/png"
	"mime/multipart"
	"net/http/httptest"
	"riverlife/api/internal/service"
	"testing"
)

func TestSecurityReceiptImageValidation(t *testing.T) {
	img := image.NewRGBA(image.Rect(0, 0, 2, 2))
	var pngData, jpgData bytes.Buffer
	if err := png.Encode(&pngData, img); err != nil {
		t.Fatal(err)
	}
	if err := jpeg.Encode(&jpgData, img, nil); err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name, ext string
		data      []byte
		want      bool
	}{
		{"valid PNG", ".png", pngData.Bytes(), true},
		{"valid JPEG", ".jpg", jpgData.Bytes(), true},
		{"mismatched extension", ".png", jpgData.Bytes(), false},
		{"truncated image", ".png", pngData.Bytes()[:40], false},
		{"HTML", ".png", []byte("<html>bad</html>"), false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			reader := bytes.NewReader(tc.data)
			if got := validReceiptImage(reader, tc.ext); got != tc.want {
				t.Fatalf("got %v want %v", got, tc.want)
			}
			if tc.want {
				pos, _ := reader.Seek(0, 1)
				if pos != 0 {
					t.Fatal("valid input not rewound for saving")
				}
			}
		})
	}
}

func TestSecurityAttachmentRejectsDisguisedHTML(t *testing.T) {
	cache := securityCache(t)
	const ip = "203.0.113.217"
	t.Cleanup(func() {
		cache.Del(context.Background(), "riverlife:rate:/api/v1/bookings/:id/attachment:"+service.Hash(ip))
	})
	var body bytes.Buffer
	form := multipart.NewWriter(&body)
	form.WriteField("booking_terms_accepted", "true")
	form.WriteField("booking_terms_version", service.BookingTermsVersion)
	part, err := form.CreateFormFile("attachment", "receipt.png")
	if err != nil {
		t.Fatal(err)
	}
	part.Write([]byte("<html><script>alert(1)</script></html>"))
	form.Close()
	req := httptest.NewRequest("POST", "/api/v1/bookings/test/attachment", &body)
	req.RemoteAddr = ip + ":1234"
	req.Header.Set("Content-Type", form.FormDataContentType())
	w := httptest.NewRecorder()
	(&Server{Redis: cache, Demo: true, UploadDir: t.TempDir()}).Router().ServeHTTP(w, req)
	if w.Code != 400 {
		t.Fatalf("disguised HTML reached file persistence/service: status %d", w.Code)
	}
}
