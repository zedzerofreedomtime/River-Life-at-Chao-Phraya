package service

import (
	"context"
	"testing"
)

func TestGoogleSubjectKeepsOriginalAccount(t *testing.T) {
	s := isolatedTableService(t)
	ctx := context.Background()
	original, err := s.UpsertUser(ctx, "original@example.test", "Original", "google", "stable-subject")
	if err != nil {
		t.Fatal(err)
	}
	other, err := s.CreateMember(ctx, "changed@example.test", "Other", "unused-hash")
	if err != nil {
		t.Fatal(err)
	}
	changed, err := s.UpsertUser(ctx, other.Email, "Changed", "google", "stable-subject")
	if err != nil {
		t.Fatal(err)
	}
	if changed.ID != original.ID || changed.ID == other.ID {
		t.Fatal("Google subject moved to another account")
	}
	linked, err := s.UpsertUser(ctx, other.Email, "Other", "google", "new-subject")
	if err != nil || linked.ID != other.ID {
		t.Fatal("verified email linking failed", err)
	}
}
