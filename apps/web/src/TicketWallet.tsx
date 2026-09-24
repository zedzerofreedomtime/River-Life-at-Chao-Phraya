import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import { QRCodeSVG } from "qrcode.react";
import {
  ChevronRight,
  CircleHelp,
  Copy,
  MapPin,
  ShieldAlert,
  Ticket,
  X,
} from "lucide-react";
import { api, statusLabel, type Booking } from "./api";
import type { Language } from "./i18n";

type Props = { initial: Booking | null; initialToken: string; language: Language };
const zoneName = (zone: string, language: Language) =>
  (language === "en"
    ? { A: "Bow", B: "Stern", C: "Lower deck" }
    : { A: "โซนหัวเรือ", B: "โซนท้ายเรือ", C: "โซนชั้นล่าง" }
  )[zone as "A" | "B" | "C"] || `${language === "en" ? "Zone" : "โซน"} ${zone}`;
const translate = (language: Language, th: string, en: string) => language === "en" ? en : th;

export default function TicketWallet({ initial, initialToken, language }: Props) {
  const tr = (th: string, en: string) => translate(language, th, en);
  const [booking, setBooking] = useState<Booking | null>(initial);
  const [id, setId] = useState(
    initial?.id ?? sessionStorage.getItem("riverlife.booking.id") ?? "",
  );
  const [token, setToken] = useState(
    initialToken || sessionStorage.getItem("riverlife.booking.token") || "",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(0);
  const [qrOpen, setQrOpen] = useState(false);
  const load = async () => {
    if (!id || !token) return;
    setBusy(true);
    setError("");
    try {
      setBooking(
        await api<Booking>(`/bookings/${encodeURIComponent(id)}`, {}, token),
      );
      setSelected(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!initial && id && token) void load();
  }, []);

  if (!booking) {
    return (
      <section className="wallet-access-shell">
        <div className="wallet-heading">
          <h1>{tr("บัตรของฉัน", "My tickets")}</h1>
          <p>{tr("กรอกรหัสคำสั่งซื้อและรหัสเข้าถึงส่วนตัวเพื่อเปิดบัตรของคุณ", "Enter your order ID and private access code to open your tickets.")}</p>
        </div>
        <div className="access-panel">
          <TextField
            label={tr("รหัสคำสั่งซื้อ", "Order ID")}
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <TextField
            label={tr("รหัสเข้าถึงส่วนตัว", "Private access code")}
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={load}
            disabled={busy || !id || !token}
          >
            {tr("เปิดบัตรของฉัน", "Open my tickets")}
          </Button>
        </div>
        {error && <Alert severity="error">{error}</Alert>}
      </section>
    );
  }

  const tickets = booking.tickets ?? [];
  const active = tickets[selected];
  const confirmed = booking.status === "confirmed";
  return (
    <section className="wallet-dashboard">
      <aside className="wallet-orders">
        <div className="wallet-orders-head">
          <h2>{tr("คำสั่งซื้อของฉัน", "My bookings")}</h2>
          <span>
            {tr("ดูทั้งหมด", "View all")} <ChevronRight size={17} />
          </span>
        </div>
        <button
          className="wallet-order-card selected"
          onClick={() => setSelected(0)}
        >
          <img
            src="/images/boat/unicorn-upper-deck.jpg"
            alt={tr("เรือ UNICRON CRUISE", "UNICRON CRUISE boat")}
          />
          <span>
            <strong>Concert on the River</strong>
            <small>{tr("คำสั่งซื้อ", "Order")} #{shortId(booking.id)}</small>
            <em>{tickets.length} {language === "en" ? (tickets.length === 1 ? "ticket" : "tickets") : "บัตร"}</em>
            <b className={confirmed ? "confirmed" : "review"}>
              {statusLabel(booking.status, language)}
            </b>
          </span>
          <ChevronRight aria-hidden="true" size={23} />
        </button>
      </aside>
      <main className="wallet-main">
        <div className="wallet-title">
          <h1>{tr("บัตรของฉัน", "My tickets")}</h1>
          <p>
            {tr("ตรวจสอบบัตร เข้างาน และเพลิดเพลินกับประสบการณ์คอนเสิร์ตบนแม่น้ำเจ้าพระยา", "Check your tickets, board the boat, and enjoy a concert on the Chao Phraya River.")}
          </p>
        </div>
        <div className="wallet-tabs">
          <span className={confirmed ? "active" : ""}>
            {tr("บัตรที่ใช้งานได้", "Available tickets")} (
            {confirmed
              ? tickets.filter((ticket) => !ticket.checked_in_at).length
              : 0}
            )
          </span>
          <span className={!confirmed ? "active" : ""}>
            {tr("กำลังดำเนินการ", "In progress")} ({confirmed ? 0 : 1})
          </span>
          <span>
            {tr("ใช้แล้ว", "Used")} ({tickets.filter((ticket) => ticket.checked_in_at).length})
          </span>
        </div>
        {!confirmed ? (
          <div className="wallet-pending-state">
            <Alert severity="info" className="wallet-status-alert">
              {tr("คำสั่งซื้อ", "Order")} #{shortId(booking.id)} {tr("อยู่ในสถานะ:", "status:")}{" "}
              {statusLabel(booking.status, language)}
            </Alert>
          </div>
        ) : (
          <>
            <TicketJourney ticketCount={tickets.length} language={language} />
            <div className="wallet-ticket-workspace">
              <section className="wallet-ticket-stack">
                <div className="wallet-order-summary">
                  <span>
                    <strong>Concert on the River</strong>
                    <small>ICONSIAM · 19:00</small>
                  </span>
                  <span>
                    {tr("คำสั่งซื้อ", "Order")} #{shortId(booking.id)}
                    <b>{tr("ยืนยันแล้ว", "Confirmed")}</b>
                    <small>{tickets.length} {language === "en" ? (tickets.length === 1 ? "ticket" : "tickets") : "บัตร"}</small>
                  </span>
                </div>
                {tickets.map((ticket, index) => (
                  <button
                    key={ticket.id}
                    className={`wallet-ticket ${selected === index ? "selected" : ""}`}
                    onClick={() => {
                      setSelected(index);
                      setQrOpen(true);
                    }}
                  >
                    <img src="/images/boat/unicorn-night-exterior.jpg" alt="" />
                    <span>
                      <small>
                        {tr("บัตรที่", "Ticket")} {index + 1} {tr("จาก", "of")} {tickets.length}
                      </small>
                      <strong>
                        {zoneName(booking.zone_id, language)}
                      </strong>
                      <em>
                        Concert on the River
                        <br />
                        ICONSIAM · 19:00
                      </em>
                    </span>
                    <span className="ticket-quantity">
                      <small>{tr("จำนวน", "Quantity")}</small>
                      <b>1</b>
                      <em>{tr("ใบ", "ticket")}</em>
                    </span>
                    <span className="show-qr">{tr("แสดง QR", "Show QR")}</span>
                  </button>
                ))}
                <div className="wallet-help">
                  <Ticket aria-hidden="true" />
                  <span>
                    <strong>
                      {tr(`ทั้ง ${tickets.length} บัตรอยู่ในคำสั่งซื้อเดียวกัน`, `All ${tickets.length} tickets are in one order`)}
                    </strong>
                    <small>{tr("กรุณาแสดงบัตรแต่ละใบเมื่อเข้างาน", "Show each ticket when boarding.")}</small>
                  </span>
                  <span>
                    <CircleHelp aria-hidden="true" />
                    <strong>{tr("มีคำถามเกี่ยวกับบัตร?", "Questions about your tickets?")}</strong>
                    <small>{tr("ดูคำแนะนำการใช้งาน →", "View ticket guidance →")}</small>
                  </span>
                </div>
              </section>
              {active && (
                <TicketPreview
                  booking={booking}
                  ticketId={active.id}
                  index={selected}
                  count={tickets.length}
                  language={language}
                />
              )}
            </div>
            {active && (
              <QrDialog
                open={qrOpen}
                onClose={() => setQrOpen(false)}
                booking={booking}
                ticketId={active.id}
                index={selected}
                count={tickets.length}
                language={language}
              />
            )}
          </>
        )}
      </main>
    </section>
  );
}

function QrDialog({
  open,
  onClose,
  booking,
  ticketId,
  index,
  count,
  language,
}: {
  open: boolean;
  onClose: () => void;
  booking: Booking;
  ticketId: string;
  index: number;
  count: number;
  language: Language;
}) {
  const tr = (th: string, en: string) => translate(language, th, en);
  const checkedIn = booking.tickets[index]?.checked_in_at;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent className="qr-dialog-content">
        <IconButton
          aria-label={tr("ปิด QR", "Close QR code")}
          className="qr-dialog-close"
          onClick={onClose}
        >
          <X />
        </IconButton>
        <span>
          {tr("บัตรที่", "Ticket")} {index + 1} {tr("จาก", "of")} {count}
        </span>
        <h2>{zoneName(booking.zone_id, language)}</h2>
        <p>Concert on the River · ICONSIAM · 19:00</p>
        <QRCodeSVG value={ticketId} size={250} />
        <strong className={checkedIn ? "used" : "available"}>
          ● {checkedIn ? tr("เช็กอินแล้ว", "Checked in") : tr("พร้อมใช้เข้างาน", "Ready for boarding")}
        </strong>
        <small>{tr("แสดง QR นี้ให้เจ้าหน้าที่สแกนที่จุด Check-in", "Show this QR code for scanning at check-in.")}</small>
      </DialogContent>
    </Dialog>
  );
}

function TicketJourney({ ticketCount, language }: { ticketCount: number; language: Language }) {
  const tr = (th: string, en: string) => translate(language, th, en);
  return (
    <section className="booking-journey confirmed">
      <div className="booking-journey-head">
        <div>
          <small>{tr("สถานะการจอง", "Booking status")}</small>
          <strong>{tr("บัตรของคุณพร้อมใช้งานแล้ว", "Your tickets are ready")}</strong>
        </div>
        <span>{tr(`มี ${ticketCount} QR — แสดงทีละใบเมื่อเข้างาน`, `${ticketCount} QR ${ticketCount === 1 ? "code" : "codes"} — show each ticket when boarding`)}</span>
      </div>
      <ol className="booking-steps">
        <li className="done">{tr("ยืนยันการจอง", "Booking confirmed")}</li>
        <li className="done">{tr("แนบรูปประกอบ", "Receipt uploaded")}</li>
        <li className="current">{tr("รับ QR Ticket", "QR ticket issued")}</li>
        <li>{tr("สแกนเข้างาน", "Scan at boarding")}</li>
      </ol>
      <div className="boarding-details">
        <span>
          <MapPin aria-hidden="true" /> ICONSIAM · {tr("จุดขึ้นเรือ", "Boarding pier")}
        </span>
        <span>{tr("ขึ้นเรือก่อน 18:45 · ออกเรือ 19:00", "Board by 18:45 · Departure at 19:00")}</span>
        <span>
          <ShieldAlert aria-hidden="true" /> {tr("มาสายจนไม่ทันเรือถือเป็น No-show", "Missing departure is considered a no-show")}
        </span>
      </div>
    </section>
  );
}

function TicketPreview({
  booking,
  ticketId,
  index,
  count,
  language,
}: {
  booking: Booking;
  ticketId: string;
  index: number;
  count: number;
  language: Language;
}) {
  const tr = (th: string, en: string) => translate(language, th, en);
  const checkedIn = booking.tickets[index]?.checked_in_at;
  return (
    <aside className="qr-ticket">
      <span className="qr-ticket-count">
        {tr("บัตรที่", "Ticket")} {index + 1} {tr("จาก", "of")} {count}
      </span>
      <span className="ticket-state">
        ● {checkedIn ? tr("เช็กอินแล้ว", "Checked in") : tr("ใช้งานได้", "Available")}
      </span>
      <h2>{zoneName(booking.zone_id, language)}</h2>
      <p>
        Concert on the River
        <br />
        ICONSIAM · 19:00
      </p>
      <QRCodeSVG value={ticketId} size={188} />
      <p className="qr-note">
        <CircleHelp aria-hidden="true" size={20} /> {tr("แสดง QR Code นี้ที่จุด Check-in", "Show this QR code at check-in")}
        <br />
        <small>{tr("เพื่อสแกนเข้างาน", "for boarding")}</small>
      </p>
      <dl>
        <div>
          <dt>{tr("หมายเลขบัตร", "Ticket number")}</dt>
          <dd>
            {ticketId.slice(0, 14).toUpperCase()} <Copy size={16} />
          </dd>
        </div>
        <div>
          <dt>{tr("หมายเลขคำสั่งซื้อ", "Order number")}</dt>
          <dd>#{shortId(booking.id)}</dd>
        </div>
        <div>
          <dt>{tr("จำนวน", "Quantity")}</dt>
          <dd>1 {tr("ใบ", "ticket")}</dd>
        </div>
        <div>
          <dt>{tr("สถานะ", "Status")}</dt>
          <dd className="available">
            ● {checkedIn ? tr("เช็กอินแล้ว", "Checked in") : tr("ใช้งานได้", "Available")}
          </dd>
        </div>
      </dl>
      <div className="ticket-rules">
        <strong>{tr("เงื่อนไขการใช้งาน", "Ticket terms")}</strong>
        <ul>
          <li>{tr("บัตรนี้ใช้เข้าร่วมงาน Concert on the River เท่านั้น", "This ticket is valid for Concert on the River only.")}</li>
          <li>{tr("กรุณาแสดง QR Code จากหน้าจอนี้ ไม่อนุญาตให้ใช้ภาพถ่าย", "Show the QR code on this screen; screenshots are not accepted.")}</li>
          <li>{tr("1 บัตร ต่อ 1 ท่าน", "One ticket per person.")}</li>
        </ul>
      </div>
    </aside>
  );
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}
