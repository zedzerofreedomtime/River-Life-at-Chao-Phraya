package service

import (
	"bytes"
	"context"
	"crypto/tls"
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"html/template"
	"log/slog"
	"mime"
	"mime/multipart"
	"net/mail"
	"net/textproto"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	qrcode "github.com/skip2/go-qrcode"
)

//go:embed boarding_pass.html
var boardingPassHTML string

var boardingPass = template.Must(template.New("boarding-pass").Parse(boardingPassHTML))

type emailPass struct {
	Number   int
	Location string
	ID       string
}

type BookingProgram struct {
	Title        string  `json:"title"`
	SailingDate  *string `json:"sailing_date"`
	Boarding     string  `json:"boarding"`
	Departure    string  `json:"departure"`
	Pier         string  `json:"pier"`
	PierNumber   int     `json:"pier_number"`
	FullPier     string  `json:"full_pier,omitempty"`
	ExtraDetails string  `json:"extra_details,omitempty"`
}

type BookingMailSender interface {
	SendBookingMail(context.Context, Booking, BookingProgram, string, bool) error
}

func (m SMTPMailer) SendBookingMail(ctx context.Context, b Booking, program BookingProgram, kind string, demo bool) error {
	message, err := bookingMessage(m.From, b, program, kind, demo)
	if err != nil {
		return err
	}
	return m.sendRaw(ctx, b.Email, message, &tls.Config{ServerName: m.Host, MinVersion: tls.VersionTLS12})
}

func bookingMessage(sender string, b Booking, p BookingProgram, kind string, demo bool) ([]byte, error) {
	if kind != "booking" && kind != "tickets" {
		return nil, errors.New("invalid booking email kind")
	}
	from, err := mail.ParseAddress(sender)
	if err != nil || strings.ContainsAny(sender, "\r\n") {
		return nil, errors.New("invalid sender")
	}
	to, err := mail.ParseAddress(b.Email)
	if err != nil || to.Address != b.Email || strings.ContainsAny(b.Email, "\r\n") {
		return nil, errors.New("invalid recipient")
	}
	title := "รายละเอียดการจอง / Booking confirmation"
	if kind == "tickets" {
		title = "ตั๋วเรือ / Cruise tickets"
		if len(b.Tickets) == 0 {
			return nil, errors.New("confirmed booking has no tickets")
		}
	}
	if demo {
		title = "[DEMO] " + title
	}
	sailing := "รอประกาศ / To be announced"
	if p.SailingDate != nil && *p.SailingDate != "" {
		sailing = *p.SailingDate
	}
	seats := strings.Join(b.TableIDs, ", ")
	if seats == "" {
		seats = "Zone " + b.ZoneID
	}
	guests := b.GuestCount
	if guests == 0 {
		guests = b.Quantity
	}
	details := fmt.Sprintf("ผู้จอง / Name: %s\nรหัสการจอง / Booking: %s\nงาน / Event: %s\nวันที่ / Date: %s\nขึ้นเรือ / Boarding: %s · ออกเรือ / Departure: %s (Asia/Bangkok)\nท่าเรือ / Pier: %s %d\nโต๊ะ / Tables: %s\nผู้ร่วมเดินทาง / Guests: %d\nยอดรวม / Total: THB %.2f\n", b.Name, b.ID, p.Title, sailing, p.Boarding, p.Departure, p.Pier, p.PierNumber, seats, guests, float64(b.Total)/100)
	if p.FullPier != "" {
		details = strings.Replace(details, "ท่าเรือ / Pier: "+fmt.Sprintf("%s %d", p.Pier, p.PierNumber), "ท่าเรือ / Pier: "+p.FullPier, 1)
	}
	if p.ExtraDetails != "" {
		details += p.ExtraDetails
	}
	notice := ""
	if demo {
		notice = "รายการทดลอง / DEMO — ไม่ใช่สิทธิ์ขึ้นเรือจริง / Not valid for boarding.\n"
	}
	plain := title + "\n\n" + notice + details
	var body string
	if kind == "booking" {
		body = `<!doctype html><html lang="th"><body style="margin:0;background:#f4f2ee;font-family:Arial,sans-serif;color:#13202e"><div style="max-width:640px;margin:24px auto;background:white;padding:32px"><p style="letter-spacing:4px;color:#806635">RIVER LIFE</p><h1 style="font-size:24px">` + html.EscapeString(title) + `</h1>`
		if notice != "" {
			body += `<p style="background:#fff0cf;padding:12px">` + html.EscapeString(notice) + `</p>`
		}
		body += `<p style="line-height:1.9">` + strings.ReplaceAll(html.EscapeString(details), "\n", "<br>") + `</p>`
		body += `<p>ตั๋วเรือพร้อม QR จะอยู่ในอีเมลอีกฉบับ<br>Your QR tickets arrive in a separate email.</p>`
		plain += "\nตั๋วเรือพร้อม QR จะส่งแยกอีกฉบับ / QR tickets arrive in a separate email.\n"
		body += `<p style="font-size:12px;color:#596573">River Life at Chao Phraya · LINE @480xbltt</p></div></body></html>`
	} else {
		plain += "\nแสดง QR แต่ละใบเมื่อขึ้นเรือ / Present each QR ticket at boarding.\n"
		passes := make([]emailPass, 0, len(b.Tickets))
		for i, t := range b.Tickets {
			location := t.TableID
			if location == "" {
				location = seats
			}
			passes = append(passes, emailPass{i + 1, location, t.ID})
			plain += fmt.Sprintf("ตั๋ว / Ticket %d · %s: %s\n", i+1, location, t.ID)
		}
		pier := p.FullPier
		if pier == "" {
			pier = p.Pier
			if p.PierNumber > 0 {
				pier += fmt.Sprintf(" %d", p.PierNumber)
			}
		}
		var rendered bytes.Buffer
		err := boardingPass.Execute(&rendered, struct {
			Booking            Booking
			Program            BookingProgram
			Date, Pier, Notice string
			Passes             []emailPass
			Total              string
		}{b, p, sailing, pier, notice, passes, fmt.Sprintf("THB %.2f", float64(b.Total)/100)})
		if err != nil {
			return nil, err
		}
		body = rendered.String()
	}
	var out bytes.Buffer
	related := multipart.NewWriter(&out)
	fmt.Fprintf(&out, "From: %s\r\nTo: %s\r\nSubject: %s\r\nDate: %s\r\nMessage-ID: <%s@%s>\r\nMIME-Version: 1.0\r\nContent-Type: multipart/related; boundary=%q\r\n\r\n", from.String(), to.String(), mime.QEncoding.Encode("UTF-8", "River Life — "+title), time.Now().UTC().Format(time.RFC1123Z), Hash(b.ID+":"+kind), strings.SplitN(from.Address, "@", 2)[1], related.Boundary())
	var alternative bytes.Buffer
	alt := multipart.NewWriter(&alternative)
	for _, part := range []struct{ typ, content string }{{"text/plain", plain}, {"text/html", body}} {
		h := textproto.MIMEHeader{"Content-Type": {part.typ + "; charset=UTF-8"}, "Content-Transfer-Encoding": {"base64"}}
		w, e := alt.CreatePart(h)
		if e != nil {
			return nil, e
		}
		_, _ = w.Write(mimeBase64([]byte(part.content)))
	}
	if err = alt.Close(); err != nil {
		return nil, err
	}
	w, err := related.CreatePart(textproto.MIMEHeader{"Content-Type": {"multipart/alternative; boundary=" + alt.Boundary()}})
	if err != nil {
		return nil, err
	}
	_, _ = w.Write(alternative.Bytes())
	if kind == "tickets" {
		for i, t := range b.Tickets {
			png, e := qrcode.Encode(t.ID, qrcode.Medium, 320)
			if e != nil {
				return nil, e
			}
			h := textproto.MIMEHeader{"Content-Type": {"image/png"}, "Content-Transfer-Encoding": {"base64"}, "Content-ID": {fmt.Sprintf("<ticket-%d>", i+1)}, "Content-Disposition": {fmt.Sprintf(`inline; filename="RiverLife-ticket-%03d.png"`, i+1)}}
			w, e := related.CreatePart(h)
			if e != nil {
				return nil, e
			}
			_, _ = w.Write(mimeBase64(png))
		}
	}
	if err = related.Close(); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

func mimeBase64(raw []byte) []byte {
	s := base64.StdEncoding.EncodeToString(raw)
	var b strings.Builder
	for len(s) > 76 {
		b.WriteString(s[:76])
		b.WriteString("\r\n")
		s = s[76:]
	}
	b.WriteString(s)
	b.WriteString("\r\n")
	return []byte(b.String())
}

// A row lock prevents concurrent workers from sending the same job. SMTP delivery
// is at-least-once: a crash after DATA acceptance can cause a retry. Message-ID is stable.
func DeliverNextBookingEmail(ctx context.Context, db *pgxpool.Pool, sender BookingMailSender, demo bool) (bool, error) {
	tx, err := db.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)
	var id, kind string
	var programJSON []byte
	var attempts int
	err = tx.QueryRow(ctx, `SELECT booking_id,kind,program,attempts FROM booking_emails WHERE sent_at IS NULL AND stopped_at IS NULL AND attempts<8 AND next_attempt_at<=now() ORDER BY created_at,kind FOR UPDATE SKIP LOCKED LIMIT 1`).Scan(&id, &kind, &programJSON, &attempts)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	// Serialize dispatch with cancellation through the bounded SMTP attempt.
	b, err := scan(tx.QueryRow(ctx, "SELECT "+columns+" FROM bookings WHERE id=$1 FOR UPDATE", id))
	if err != nil {
		return true, err
	}
	if b.Status != "confirmed" {
		_, err = tx.Exec(ctx, "UPDATE booking_emails SET stopped_at=now() WHERE booking_id=$1 AND kind=$2", id, kind)
		if err != nil {
			return true, err
		}
		return true, tx.Commit(ctx)
	}
	rows, err := tx.Query(ctx, "SELECT id,table_id FROM tickets WHERE booking_id=$1 ORDER BY id", id)
	if err != nil {
		return true, err
	}
	for rows.Next() {
		var t Ticket
		if err = rows.Scan(&t.ID, &t.TableID); err != nil {
			rows.Close()
			return true, err
		}
		b.Tickets = append(b.Tickets, t)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return true, err
	}
	var program BookingProgram
	if err = json.Unmarshal(programJSON, &program); err != nil {
		return true, err
	}
	deliveryCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	sendErr := sender.SendBookingMail(deliveryCtx, b, program, kind, demo)
	cancel()
	if sendErr != nil {
		_, err = tx.Exec(ctx, `UPDATE booking_emails SET attempts=attempts+1,next_attempt_at=now()+($3 * interval '1 minute') WHERE booking_id=$1 AND kind=$2`, id, kind, 1<<attempts)
		slog.Warn("booking email attempt failed", "kind", kind, "attempt", attempts+1)
	} else {
		_, err = tx.Exec(ctx, "UPDATE booking_emails SET sent_at=now(),attempts=attempts+1 WHERE booking_id=$1 AND kind=$2", id, kind)
	}
	if err != nil {
		return true, err
	}
	return true, tx.Commit(ctx)
}

func RunBookingEmails(ctx context.Context, db *pgxpool.Pool, sender BookingMailSender, demo bool) {
	for ctx.Err() == nil {
		worked, err := DeliverNextBookingEmail(ctx, db, sender, demo)
		if err != nil && ctx.Err() == nil {
			slog.Error("booking email queue unavailable")
		}
		if worked && err == nil {
			continue
		}
		timer := time.NewTimer(5 * time.Second)
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
		}
	}
}
