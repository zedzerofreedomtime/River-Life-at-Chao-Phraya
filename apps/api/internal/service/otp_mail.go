package service

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/mail"
	"net/smtp"
	"strings"
	"time"
)

// OTPMailer never logs the recipient, OTP or SMTP credentials.
type OTPMailer interface {
	SendOTP(context.Context, string, string) error
}

type SMTPMailer struct {
	Host, Port, Username, Password, From, TLSMode string
}

func (m SMTPMailer) Validate() error {
	if m.Host == "" || m.Port == "" || strings.ContainsAny(m.Host+m.Port, "\r\n") {
		return errors.New("SMTP host and port are required")
	}
	from, err := mail.ParseAddress(m.From)
	if err != nil || from.Address == "" || strings.ContainsAny(m.From, "\r\n") {
		return errors.New("SMTP_FROM must be a valid sender")
	}
	if m.TLSMode != "starttls" && m.TLSMode != "tls" {
		return errors.New("SMTP_TLS_MODE must be starttls or tls")
	}
	if m.Username == "" || m.Password == "" {
		return errors.New("SMTP credentials are required")
	}
	return nil
}

func (m SMTPMailer) SendOTP(ctx context.Context, recipient, code string) error {
	return m.sendOTP(ctx, recipient, code, &tls.Config{ServerName: m.Host, MinVersion: tls.VersionTLS12})
}

func (m SMTPMailer) sendOTP(ctx context.Context, recipient, code string, tlsConfig *tls.Config) error {
	return m.sendCode(ctx, recipient, code, tlsConfig, false)
}

func (m SMTPMailer) SendPasswordResetOTP(ctx context.Context, recipient, code string) error {
	return m.sendCode(ctx, recipient, code, &tls.Config{ServerName: m.Host, MinVersion: tls.VersionTLS12}, true)
}

func (m SMTPMailer) sendCode(ctx context.Context, recipient, code string, tlsConfig *tls.Config, reset bool) error {
	if err := m.Validate(); err != nil {
		return err
	}
	if len(code) != 6 || strings.Trim(code, "0123456789") != "" {
		return errors.New("invalid OTP")
	}
	from, _ := mail.ParseAddress(m.From)
	to, err := mail.ParseAddress(recipient)
	if err != nil {
		return err
	}
	message := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: River Life - Email verification code\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\nรหัสยืนยันอีเมล River Life ของคุณคือ: %s\r\n\r\nรหัสนี้มีอายุ 10 นาที ใช้ได้ครั้งเดียว กรุณาอย่าเปิดเผยให้ผู้อื่น\r\nหากคุณไม่ได้สมัครสมาชิก สามารถละเว้นอีเมลนี้ได้\r\n\r\nYour River Life verification code is: %s\r\nExpires in 10 minutes. Do not share this code.\r\n", from.String(), to.String(), code, code)
	if reset {
		message = fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: River Life - Password reset code\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\nรหัส OTP สำหรับตั้งรหัสผ่านใหม่ River Life: %s\r\n\r\nใช้ได้ครั้งเดียวภายใน 10 นาที อย่าส่งรหัสนี้ให้ผู้อื่น\r\nหากคุณไม่ได้ขอตั้งรหัสใหม่ ให้ละเว้นอีเมลนี้ รหัสผ่านเดิมยังไม่ถูกเปลี่ยน\r\n\r\nYour password reset code is: %s\r\nExpires in 10 minutes. If you did not request this, ignore this message. Your password has not changed.\r\n", from.String(), to.String(), code, code)
	}

	return m.sendRaw(ctx, recipient, []byte(message), tlsConfig)
}

func (m SMTPMailer) sendRaw(ctx context.Context, recipient string, message []byte, tlsConfig *tls.Config) error {
	if err := m.Validate(); err != nil {
		return err
	}
	to, err := mail.ParseAddress(recipient)
	if err != nil || to.Address != recipient || strings.ContainsAny(recipient, "\r\n") {
		return errors.New("invalid recipient")
	}
	from, _ := mail.ParseAddress(m.From)
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	dialer := &net.Dialer{}
	conn, err := dialer.DialContext(ctx, "tcp", net.JoinHostPort(m.Host, m.Port))
	if err != nil {
		return err
	}
	defer conn.Close()
	deadline, _ := ctx.Deadline()
	_ = conn.SetDeadline(deadline)
	stop := context.AfterFunc(ctx, func() { _ = conn.Close() })
	defer stop()
	if m.TLSMode == "tls" {
		secured := tls.Client(conn, tlsConfig)
		if err = secured.HandshakeContext(ctx); err != nil {
			return err
		}
		conn = secured
	}
	client, err := smtp.NewClient(conn, m.Host)
	if err != nil {
		return err
	}
	defer client.Close()
	if m.TLSMode == "starttls" {
		if ok, _ := client.Extension("STARTTLS"); !ok {
			return errors.New("SMTP requires STARTTLS")
		}
		if err = client.StartTLS(tlsConfig); err != nil {
			return err
		}
	}
	if err = client.Auth(smtp.PlainAuth("", m.Username, m.Password, m.Host)); err != nil {
		return err
	}
	if err = client.Mail(from.Address); err != nil {
		return err
	}
	if err = client.Rcpt(to.Address); err != nil {
		return err
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, err = w.Write(message); err != nil {
		_ = w.Close()
		return err
	}
	if err = w.Close(); err != nil {
		return err
	}
	// DATA acceptance is success; a lost QUIT reply must not invalidate delivered mail.
	_ = client.Quit()
	return nil
}
