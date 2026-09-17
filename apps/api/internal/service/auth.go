package service

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"strings"
)

var ErrMemberAlreadyExists = errors.New("อีเมลนี้สมัครสมาชิกแล้ว")

type User struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

func (s *Service) UpsertUser(ctx context.Context, email, name, provider, subject string) (User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	name = strings.TrimSpace(name)
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return User{}, err
	}
	defer tx.Rollback(ctx)
	var user User
	err = tx.QueryRow(ctx, `INSERT INTO users(id,email,name) VALUES($1,$2,$3)
		ON CONFLICT(email) DO UPDATE SET name=CASE WHEN EXCLUDED.name<>'' THEN EXCLUDED.name ELSE users.name END, updated_at=now()
		RETURNING id,name,email`, Token(), email, name).Scan(&user.ID, &user.Name, &user.Email)
	if err != nil {
		return User{}, err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO auth_identities(provider,provider_subject,user_id) VALUES($1,$2,$3)
		ON CONFLICT(provider,provider_subject) DO UPDATE SET user_id=EXCLUDED.user_id`, provider, subject, user.ID); err != nil {
		return User{}, err
	}
	return user, tx.Commit(ctx)
}

// CreateMember creates a new passwordless membership. It deliberately rejects
// an existing email: email OTP is for registration only, not an alternate login.
func (s *Service) CreateMember(ctx context.Context, email, name string) (User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	name = strings.TrimSpace(name)
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return User{}, err
	}
	defer tx.Rollback(ctx)
	var user User
	err = tx.QueryRow(ctx, `INSERT INTO users(id,email,name) VALUES($1,$2,$3)
		ON CONFLICT(email) DO NOTHING RETURNING id,name,email`, Token(), email, name).Scan(&user.ID, &user.Name, &user.Email)
	if err == pgx.ErrNoRows {
		return User{}, ErrMemberAlreadyExists
	}
	if err != nil {
		return User{}, err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO auth_identities(provider,provider_subject,user_id) VALUES('email',$1,$2)`, email, user.ID); err != nil {
		return User{}, err
	}
	return user, tx.Commit(ctx)
}

func (s *Service) User(ctx context.Context, id string) (User, error) {
	var user User
	err := s.DB.QueryRow(ctx, "SELECT id,name,email FROM users WHERE id=$1", id).Scan(&user.ID, &user.Name, &user.Email)
	if err == pgx.ErrNoRows {
		return User{}, err
	}
	return user, err
}
