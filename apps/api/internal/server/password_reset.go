package server

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	"log/slog"
	"net/http"
	"riverlife/api/internal/service"
	"strings"
	"time"
)

type resetChallenge struct {
	UserID      string `json:"user_id"`
	CodeHash    string `json:"code_hash"`
	AuthVersion int    `json:"auth_version"`
}
type resetGrant struct {
	UserID      string `json:"user_id"`
	TokenHash   string `json:"token_hash"`
	AuthVersion int    `json:"auth_version"`
}

const resetMessage = "หากอีเมลนี้มีบัญชีที่ใช้รหัสผ่าน ระบบจะส่ง OTP ให้ กรุณาตรวจสอบกล่องจดหมายและจดหมายขยะ"
const resetInvalid = "รหัส OTP หมดอายุหรือไม่ถูกต้อง"

func resetKey(email string) string { return "riverlife:password-reset:" + service.Hash(email) }

func (s *Server) passwordResetRoutes(api *gin.RouterGroup) {
	api.POST("/auth/password-reset/request", s.limiter(5), func(c *gin.Context) {
		var in struct {
			Email string `json:"email"`
		}
		if c.ShouldBindJSON(&in) != nil {
			bad(c)
			return
		}
		email, ok := validEmail(in.Email)
		if !ok {
			bad(c)
			return
		}
		if s.OTPMailer == nil {
			c.JSON(503, gin.H{"error": "ระบบส่งอีเมล OTP ยังไม่ได้ตั้งค่า"})
			return
		}
		ctx := c.Request.Context()
		key := resetKey(email)
		locked, err := s.Redis.SetNX(ctx, key+":cooldown", "1", time.Minute).Result()
		if err != nil {
			fail(c, err)
			return
		}
		if !locked {
			c.Header("Retry-After", "60")
			c.JSON(429, gin.H{"error": "กรุณารอ 60 วินาทีก่อนขอ OTP อีกครั้ง"})
			return
		}
		var challenge resetChallenge
		err = s.Service.DB.QueryRow(ctx, `SELECT id,auth_version FROM users WHERE email=$1 AND password_hash<>'' AND EXISTS(SELECT 1 FROM auth_identities WHERE provider='email' AND user_id=users.id)`, email).Scan(&challenge.UserID, &challenge.AuthVersion)
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(202, gin.H{"message": resetMessage})
			return
		}
		if err != nil {
			fail(c, err)
			return
		}
		code, err := otpCode()
		if err != nil {
			fail(c, err)
			return
		}
		challenge.CodeHash = service.Hash(code)
		raw, _ := json.Marshal(challenge)
		// Starting a new challenge invalidates every previous reset grant for this email.
		_, err = s.Redis.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
			pipe.Set(ctx, key, raw, 10*time.Minute)
			pipe.Del(ctx, key+":grant", key+":attempts")
			return nil
		})
		if err != nil {
			fail(c, err)
			return
		}
		if sender, ok := s.OTPMailer.(interface {
			SendPasswordResetOTP(context.Context, string, string) error
		}); ok {
			err = sender.SendPasswordResetOTP(ctx, email, code)
		} else {
			err = s.OTPMailer.SendOTP(ctx, email, code)
		}
		if err != nil {
			cleanup, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			_ = s.Redis.Eval(cleanup, `if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1],KEYS[2]) end return 0`, []string{key, key + ":cooldown"}, string(raw)).Err()
			// Keep the response identical for registered and unknown addresses.
			slog.Error("password reset email delivery failed")
		}
		c.JSON(202, gin.H{"message": resetMessage})
	})
	api.POST("/auth/password-reset/verify", s.limiter(10), func(c *gin.Context) {
		var in struct {
			Email string `json:"email"`
			Code  string `json:"code"`
		}
		if c.ShouldBindJSON(&in) != nil || len(in.Code) != 6 || strings.Trim(in.Code, "0123456789") != "" {
			bad(c)
			return
		}
		email, ok := validEmail(in.Email)
		if !ok {
			bad(c)
			return
		}
		key := resetKey(email)
		ctx := c.Request.Context()
		raw, err := s.Redis.Get(ctx, key).Bytes()
		if err != nil {
			c.JSON(401, gin.H{"error": resetInvalid})
			return
		}
		var challenge resetChallenge
		if json.Unmarshal(raw, &challenge) != nil {
			c.JSON(401, gin.H{"error": resetInvalid})
			return
		}
		grantToken := service.Token()
		grant, _ := json.Marshal(resetGrant{UserID: challenge.UserID, AuthVersion: challenge.AuthVersion, TokenHash: service.Hash(grantToken)})
		// Compare, limit guesses, consume OTP and create short-lived grant atomically.
		accepted, err := s.Redis.Eval(ctx, `if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end
    local n=redis.call('INCR',KEYS[2]);redis.call('EXPIRE',KEYS[2],600)
    if ARGV[2]~=ARGV[3] then if n>=5 then redis.call('DEL',KEYS[1]) end return 0 end
    redis.call('DEL',KEYS[1],KEYS[2]);redis.call('SET',KEYS[3],ARGV[4],'EX',300);return 1`, []string{key, key + ":attempts", key + ":grant"}, string(raw), challenge.CodeHash, service.Hash(in.Code), string(grant)).Int()
		if err != nil {
			fail(c, err)
			return
		}
		if accepted != 1 {
			c.JSON(401, gin.H{"error": resetInvalid})
			return
		}
		c.JSON(200, gin.H{"reset_token": grantToken})
	})
	api.POST("/auth/password-reset/complete", s.limiter(10), func(c *gin.Context) {
		var in struct {
			Email    string `json:"email"`
			Token    string `json:"reset_token"`
			Password string `json:"password"`
		}
		if c.ShouldBindJSON(&in) != nil || len(in.Token) != 64 || len(in.Password) < 8 || len(in.Password) > 72 {
			bad(c)
			return
		}
		email, ok := validEmail(in.Email)
		if !ok {
			bad(c)
			return
		}
		key := resetKey(email) + ":grant"
		ctx := c.Request.Context()
		raw, err := s.Redis.Get(ctx, key).Bytes()
		var grant resetGrant
		if err != nil || json.Unmarshal(raw, &grant) != nil || subtle.ConstantTimeCompare([]byte(grant.TokenHash), []byte(service.Hash(in.Token))) != 1 {
			c.JSON(401, gin.H{"error": "สิทธิ์ตั้งรหัสผ่านหมดอายุ กรุณาขอ OTP ใหม่"})
			return
		}
		hash, err := service.PasswordHash(in.Password)
		if err != nil {
			fail(c, err)
			return
		}
		consumed, err := s.Redis.Eval(ctx, `if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0`, []string{key}, string(raw)).Int()
		if err != nil {
			fail(c, err)
			return
		}
		if consumed != 1 {
			c.JSON(401, gin.H{"error": "สิทธิ์ตั้งรหัสผ่านหมดอายุ กรุณาขอ OTP ใหม่"})
			return
		}
		tag, err := s.Service.DB.Exec(ctx, `UPDATE users SET password_hash=$2,auth_version=auth_version+1,updated_at=now() WHERE id=$1 AND auth_version=$3`, grant.UserID, hash, grant.AuthVersion)
		if err != nil {
			fail(c, err)
			return
		}
		if tag.RowsAffected() != 1 {
			c.JSON(401, gin.H{"error": "สิทธิ์ตั้งรหัสผ่านหมดอายุ กรุณาขอ OTP ใหม่"})
			return
		}
		// No automatic login after account recovery. Old sessions fail their version check.
		c.SetSameSite(http.SameSiteLaxMode)
		c.SetCookie(userCookie, "", -1, "/api/v1", "", s.CookieSecure, true)
		c.JSON(200, gin.H{"message": "ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสใหม่"})
	})
}
