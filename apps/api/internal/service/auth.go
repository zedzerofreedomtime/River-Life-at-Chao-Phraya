package service

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
	"strings"
)

var ErrMemberAlreadyExists = errors.New("อีเมลนี้สมัครสมาชิกแล้ว")
var ErrInvalidCredentials = errors.New("อีเมลหรือรหัสผ่านไม่ถูกต้อง")

const (
	RoleUser     = "user"
	RoleSales    = "sales"
	RoleOperator = "operator"
	RoleAdmin    = "admin"
)

type User struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
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
		RETURNING id,name,email,role`, Token(), email, name).Scan(&user.ID, &user.Name, &user.Email, &user.Role)
	if err != nil {
		return User{}, err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO auth_identities(provider,provider_subject,user_id) VALUES($1,$2,$3)
		ON CONFLICT(provider,provider_subject) DO UPDATE SET user_id=EXCLUDED.user_id`, provider, subject, user.ID); err != nil {
		return User{}, err
	}
	return user, tx.Commit(ctx)
}

func PasswordHash(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hash), err
}

// CreateMember creates a new member and rejects an existing email.
func (s *Service) CreateMember(ctx context.Context, email, name, passwordHash string) (User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	name = strings.TrimSpace(name)
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return User{}, err
	}
	defer tx.Rollback(ctx)
	var user User
	err = tx.QueryRow(ctx, `INSERT INTO users(id,email,name,password_hash,role) VALUES($1,$2,$3,$4,$5)
		ON CONFLICT(email) DO NOTHING RETURNING id,name,email,role`, Token(), email, name, passwordHash, RoleUser).Scan(&user.ID, &user.Name, &user.Email, &user.Role)
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

func (s *Service) AuthenticateEmailPassword(ctx context.Context, email, password string) (User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	var user User
	var passwordHash string
	err := s.DB.QueryRow(ctx, "SELECT id,name,email,role,password_hash FROM users WHERE email=$1", email).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &passwordHash)
	if err != nil || passwordHash == "" || bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)) != nil {
		return User{}, ErrInvalidCredentials
	}
	return user, nil
}

func (s *Service) User(ctx context.Context, id string) (User, error) {
	var user User
	err := s.DB.QueryRow(ctx, "SELECT id,name,email,role FROM users WHERE id=$1", id).Scan(&user.ID, &user.Name, &user.Email, &user.Role)
	if err == pgx.ErrNoRows {
		return User{}, err
	}
	return user, err
}

func (s *Service) UserByEmail(ctx context.Context, email string) (User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	var user User
	err := s.DB.QueryRow(ctx, "SELECT id,name,email,role FROM users WHERE email=$1", email).Scan(&user.ID, &user.Name, &user.Email, &user.Role)
	return user, err
}
