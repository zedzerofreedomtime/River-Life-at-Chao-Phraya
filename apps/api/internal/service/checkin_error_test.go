package service

import (
	"context"
	"errors"
	"testing"
)

func TestMalformedCruiseTicketHasActionableError(t *testing.T) {
	s := &Service{}
	_, err := s.CheckInCruiseTicket(context.Background(), "invalid", "sailing", "operator")
	var detail *CheckInError
	if !errors.As(err, &detail) || !errors.Is(err, ErrConflict) || detail.Message != "รหัสตั๋วไม่ถูกต้อง" {
		t.Fatalf("unexpected check-in error: %v", err)
	}
}
