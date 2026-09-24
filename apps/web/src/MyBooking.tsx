import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { api, statusLabel, money, type Booking } from "./api";
import type { Language } from "./i18n";

export default function MyBooking({
  initial,
  initialToken,
  onPay,
  onOpenTickets,
  language,
}: {
  initial: Booking | null;
  initialToken: string;
  onPay?: (booking: Booking) => void;
  onOpenTickets?: (booking: Booking) => void;
  language: Language;
}) {
  const en = language === "en";
  const tr = (th: string, english: string) => en ? english : th;
  const [booking, setBooking] = useState(initial);
  const [id, setID] = useState(
    initial?.id ?? sessionStorage.getItem("riverlife.booking.id") ?? "",
  );
  const [token, setToken] = useState(
    initialToken || sessionStorage.getItem("riverlife.booking.token") || "",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const latest = await api<Booking>(
        `/bookings/${encodeURIComponent(id)}`,
        {},
        token,
      );
      setBooking(latest);
      sessionStorage.setItem("riverlife.booking.id", latest.id);
      sessionStorage.setItem("riverlife.booking.token", token);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const savedID =
      initial?.id || sessionStorage.getItem("riverlife.booking.id");
    const savedToken =
      initialToken || sessionStorage.getItem("riverlife.booking.token");
    if (!savedID || !savedToken) return;
    void api<Booking>(
      `/bookings/${encodeURIComponent(savedID)}`,
      {},
      savedToken,
    )
      .then(setBooking)
      .catch((cause: Error) => setError(cause.message));
  }, [initial?.id, initialToken]);

  return (
    <section className="content-panel">
      <div className="orders-heading">
        <h1>{tr("คำสั่งซื้อของฉัน", "My bookings")}</h1>
        <p>{tr("แนบรูปประกอบการจอง แล้วรับ QR Ticket", "Upload your payment receipt and track your QR ticket.")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          label={tr("รหัสการจอง", "Booking ID")}
          value={id}
          onChange={(event) => {
            setID(event.target.value);
            setBooking(null);
          }}
        />
        <TextField
          label={tr("รหัสเข้าถึงส่วนตัว", "Private access code")}
          type="password"
          value={token}
          onChange={(event) => {
            setToken(event.target.value);
            setBooking(null);
          }}
        />
        <Button
          variant="outlined"
          onClick={() => void load()}
          disabled={busy || !id || !token}
        >
          {tr("เปิดคำสั่งซื้อ", "Open booking")}
        </Button>
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      {booking && (
        <div className="booking-detail">
          <div className="order-status-bar">
            <h3>
              {tr("โซน", "Zone")} {booking.zone_id} · {booking.quantity} {en ? (booking.quantity === 1 ? "ticket" : "tickets") : "ใบ"} ·{" "}
              {money(booking.total)}
            </h3>
            <strong>{statusLabel(booking.status, language)}</strong>
          </div>
          <p className="order-person">
            {tr("ผู้สั่งซื้อ", "Customer")}: {booking.name} · {booking.email}
          </p>
          <Alert severity="info">
            {tr("เก็บรหัสการจองและรหัสเข้าถึงนี้ไว้เพื่อเปิดบัตรจากเครื่องอื่น", "Keep your booking ID and access code to open tickets on another device.")}
          </Alert>
          <details className="access-code">
            <summary>{tr("แสดงรหัสเข้าถึงสำหรับเก็บรักษา", "Show access code to save")}</summary>
            <code className="break-all">{token}</code>
          </details>
          {booking.status === "held" && (
            <section className="order-action" aria-label={tr("ชำระเงิน", "Payment")}>
              <h3>{tr("รอชำระเงิน", "Awaiting payment")}</h3>
              <p>
                {tr("รายการถูกสำรองไว้ กรุณาไปหน้าชำระเงินเพื่อสแกน QR และแนบหลักฐาน", "Your tickets are reserved. Go to payment to scan the QR code and upload your receipt.")}
              </p>
              <Button variant="contained" onClick={() => onPay?.(booking)}>
                {tr("ไปหน้าชำระเงิน", "Continue to payment")}
              </Button>
            </section>
          )}
          {booking.status === "confirmed" && (
            <div className="order-success">
              <div>
                <strong>{tr("ชำระเงินเรียบร้อยแล้ว", "Payment confirmed")}</strong>
                <span>
                  {booking.tickets.length} {en ? (booking.tickets.length === 1 ? "QR ticket ready" : "QR tickets ready") : "QR Ticket พร้อมใช้งาน"}
                </span>
              </div>
              <Button
                variant="contained"
                onClick={() => onOpenTickets?.(booking)}
              >
                {tr("เปิดบัตรของฉัน", "Open my tickets")}
              </Button>
            </div>
          )}
          {booking.status !== "held" && booking.status !== "confirmed" && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {tr("คำสั่งซื้อนี้อยู่ในสถานะ", "Booking status:")} {statusLabel(booking.status, language)}
            </Alert>
          )}
        </div>
      )}
    </section>
  );
}
