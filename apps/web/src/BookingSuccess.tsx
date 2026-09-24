import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { CircleCheckBig, Ticket } from "lucide-react";
import { api, money, type Booking } from "./api";
import { FlowSteps } from "./Payment";
import type { Language } from "./i18n";

export default function BookingSuccess({
  initial,
  initialToken,
  onOpenTickets,
  onOpenOrders,
  language,
}: {
  initial: Booking | null;
  initialToken: string;
  onOpenTickets: (booking: Booking) => void;
  onOpenOrders: () => void;
  language: Language;
}) {
  const en = language === "en";
  const tr = (th: string, english: string) => en ? english : th;
  const [booking, setBooking] = useState(initial);
  const [error, setError] = useState("");
  const token =
    initialToken || sessionStorage.getItem("riverlife.booking.token") || "";
  const bookingId = initial?.id || sessionStorage.getItem("riverlife.booking.id");

  useEffect(() => {
    if (!bookingId || !token) return;
    void api<Booking>(`/bookings/${encodeURIComponent(bookingId)}`, {}, token)
      .then(setBooking)
      .catch((cause: Error) => setError(cause.message));
  }, [bookingId, token]);

  if (!booking && (!bookingId || !token)) {
    return (
      <section className="flow-page flow-empty">
        <h1>{tr("ไม่พบรายการที่สำเร็จ", "No booking found")}</h1>
        <p>{tr("ยังไม่มีรายการจองให้แสดงในหน้านี้", "There is no booking to show here yet.")}</p>
        <Button variant="contained" onClick={onOpenOrders}>
          {tr("ดูคำสั่งซื้อของฉัน", "View my bookings")}
        </Button>
      </section>
    );
  }

  return (
    <section className="flow-page success-page">
      <FlowSteps activeStep={3} language={language} />
      <div className="success-card">
        <CircleCheckBig aria-hidden="true" />
        <h1>{tr("ทำรายการสำเร็จ", "Submission complete")}</h1>
        {error && <Alert severity="error">{error}</Alert>}
        {!booking && !error && <p>{tr("กำลังเปิดรายการของคุณ…", "Loading your booking…")}</p>}
        {booking && (
          <>
            <p>
              {booking.status === "confirmed"
                ? tr("คำสั่งซื้อของคุณได้รับการยืนยันแล้ว และออก QR Ticket ให้เรียบร้อย", "Your booking is confirmed and your QR ticket is ready.")
                : tr("ได้รับหลักฐานการชำระเงินแล้ว กำลังรอตรวจสอบก่อนออก QR Ticket", "Your payment receipt was submitted. Your QR ticket will be issued after review.")}
            </p>
            <dl>
              <div>
                <dt>{tr("รหัสคำสั่งซื้อ", "Order ID")}</dt>
                <dd>#{booking.id.toUpperCase()}</dd>
              </div>
              <div>
                <dt>{tr("รายการ", "Tickets")}</dt>
                <dd>
                  {tr("โซน", "Zone")} {booking.zone_id} · {booking.quantity} {en ? (booking.quantity === 1 ? "ticket" : "tickets") : "ใบ"}
                </dd>
              </div>
              <div>
                <dt>{tr("ยอดชำระ", "Amount")}</dt>
                <dd>{money(booking.total)}</dd>
              </div>
            </dl>
            <div className="success-actions">
              {booking.status === "confirmed" && <Button
                variant="contained"
                size="large"
                startIcon={<Ticket size={19} />}
                onClick={() => onOpenTickets(booking)}
              >
                {tr("เปิด QR Ticket", "Open QR ticket")}
              </Button>}
              <Button variant="outlined" onClick={onOpenOrders}>
                {tr("ดูคำสั่งซื้อของฉัน", "View my bookings")}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
