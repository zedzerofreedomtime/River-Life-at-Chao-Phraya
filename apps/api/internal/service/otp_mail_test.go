package service

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"math/big"
	"net"
	"net/textproto"
	"strings"
	"testing"
	"time"
)

func TestSMTPConfiguration(t *testing.T) {
	valid := SMTPMailer{Host: "smtp.example.test", Port: "587", TLSMode: "starttls", From: "River Life <no-reply@example.test>", Username: "account", Password: "test-only"}
	if err := valid.Validate(); err != nil {
		t.Fatal(err)
	}
	for _, mutate := range []func(*SMTPMailer){
		func(m *SMTPMailer) { m.Host = "" },
		func(m *SMTPMailer) { m.Password = "" },
		func(m *SMTPMailer) { m.From = "bad\r\nBcc: other@example.test" },
		func(m *SMTPMailer) { m.TLSMode = "none" },
	} {
		m := valid
		mutate(&m)
		if m.Validate() == nil {
			t.Fatal("unsafe SMTP config accepted")
		}
	}
}

func TestSMTPDelivery(t *testing.T) {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	template := &x509.Certificate{SerialNumber: big.NewInt(1), NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().Add(time.Hour), IPAddresses: []net.IP{net.ParseIP("127.0.0.1")}, KeyUsage: x509.KeyUsageDigitalSignature | x509.KeyUsageCertSign, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}, IsCA: true, BasicConstraintsValid: true}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if err != nil {
		t.Fatal(err)
	}
	cert, _ := x509.ParseCertificate(der)
	roots := x509.NewCertPool()
	roots.AddCert(cert)
	serverTLS := &tls.Config{Certificates: []tls.Certificate{{Certificate: [][]byte{der}, PrivateKey: key}}, MinVersion: tls.VersionTLS12}
	for _, mode := range []string{"starttls", "tls"} {
		for _, kind := range []string{"otp", "booking", "tickets"} {
			t.Run(mode+"-"+kind, func(t *testing.T) {
				listener, err := net.Listen("tcp", "127.0.0.1:0")
				if err != nil {
					t.Fatal(err)
				}
				defer listener.Close()
				received := make(chan string, 1)
				go func() {
					conn, err := listener.Accept()
					if err != nil {
						return
					}
					defer conn.Close()
					_ = conn.SetDeadline(time.Now().Add(5 * time.Second))
					if mode == "tls" {
						conn = tls.Server(conn, serverTLS)
					}
					wire := textproto.NewConn(conn)
					defer wire.Close()
					_ = wire.PrintfLine("220 qa ESMTP")
					for {
						line, err := wire.ReadLine()
						if err != nil {
							return
						}
						switch {
						case strings.HasPrefix(line, "EHLO"):
							_ = wire.PrintfLine("250-qa")
							if mode == "starttls" {
								_ = wire.PrintfLine("250-STARTTLS")
							}
							_ = wire.PrintfLine("250 AUTH PLAIN")
						case line == "STARTTLS":
							_ = wire.PrintfLine("220 begin TLS")
							conn = tls.Server(conn, serverTLS)
							wire = textproto.NewConn(conn)
						case strings.HasPrefix(line, "AUTH PLAIN"):
							_ = wire.PrintfLine("235 authenticated")
						case strings.HasPrefix(line, "MAIL FROM:") || strings.HasPrefix(line, "RCPT TO:"):
							_ = wire.PrintfLine("250 accepted")
						case line == "DATA":
							_ = wire.PrintfLine("354 send message")
							data, err := wire.ReadDotBytes()
							if err != nil {
								return
							}
							received <- string(data)
							_ = wire.PrintfLine("250 queued")
						case line == "QUIT":
							_ = wire.PrintfLine("221 goodbye")
							return
						default:
							_ = wire.PrintfLine("500 unsupported")
						}
					}
				}()
				host, port, _ := net.SplitHostPort(listener.Addr().String())
				mailer := SMTPMailer{Host: host, Port: port, TLSMode: mode, Username: "qa", Password: "isolated-qa", From: "River Life <sender@example.test>"}
				trusted := &tls.Config{ServerName: host, RootCAs: roots, MinVersion: tls.VersionTLS12}
				if kind == "otp" {
					err = mailer.sendOTP(context.Background(), "recipient@example.test", "123456", trusted)
				} else {
					var raw []byte
					raw, err = bookingMessage(mailer.From, Booking{ID: "smtp-booking", Email: "recipient@example.test", Tickets: []Ticket{{ID: strings.Repeat("a", 64)}}}, BookingProgram{}, kind, true)
					if err == nil {
						err = mailer.sendRaw(context.Background(), "recipient@example.test", raw, trusted)
					}
				}
				if err != nil {
					t.Fatal(err)
				}
				select {
				case message := <-received:
					if !strings.Contains(message, "To: <recipient@example.test>") || (kind == "otp" && (!strings.Contains(message, "123456") || !strings.Contains(message, "รหัสยืนยันอีเมล"))) || (kind != "otp" && !strings.Contains(message, "multipart/related")) {
						t.Fatal("incorrect OTP email content")
					}
				case <-time.After(time.Second):
					t.Fatal("SMTP message missing")
				}
			})
		}
	}
}
