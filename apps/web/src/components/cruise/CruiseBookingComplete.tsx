import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api, money } from "../../data/api";
import { sailingDate, type CruiseReservationDetail } from "../../data/cruises";
import type { Language } from "../../data/i18n";

export default function CruiseBookingComplete({
  id,
  language,
  onOrders,
}: {
  id: string;
  language: Language;
  onOrders: () => void;
}) {
  const en = language === "en";
  const [detail, setDetail] = useState<CruiseReservationDetail | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let stopped = false;
    window.scrollTo({ top: 0, behavior: "instant" });
    setError("");
    void api<CruiseReservationDetail>(
      `/me/cruise-reservations/${encodeURIComponent(id)}`,
    )
      .then((next) => {
        if (!stopped) setDetail(next);
      })
      .catch(() => {
        if (!stopped)
          setError(
            en
              ? "Unable to load tickets. Your payment will not be repeated."
              : "โหลดตั๋วไม่ได้ ลองโหลดอีกครั้งได้โดยไม่ชำระซ้ำ",
          );
      });
    return () => {
      stopped = true;
    };
  }, [id, en, retry]);
  // Boarding QR codes only come from the authenticated server's confirmed record.
  const confirmed = detail?.status === "confirmed";
  return (
    <section className="booking-preview bp-success bp-checkout">
      <h1>
        {confirmed
          ? en
            ? "Booking complete"
            : "จองสำเร็จเรียบร้อย"
          : en
            ? "Verifying your tickets"
            : "กำลังตรวจสอบตั๋วของคุณ"}
      </h1>
      {error ? (
        <>
          <p role="alert">{error}</p>
          <button
            className="bp-secondary"
            onClick={() => setRetry((n) => n + 1)}
          >
            {en ? "Reload tickets" : "โหลดตั๋วอีกครั้ง"}
          </button>
        </>
      ) : !detail ? (
        <p role="status">{en ? "Loading…" : "กำลังโหลด…"}</p>
      ) : confirmed ? (
        <>
          <p>
            {detail.customer_name} · {sailingDate(detail.departure_at, en)}
          </p>
          <p>
            {en ? "Payment confirmed" : "ยืนยันแล้ว"} · {money(detail.total)}
          </p>
          <div className="cruise-ticket-grid">
            {detail.tickets.map((ticket) => (
              <article className="cruise-boarding-ticket" key={ticket.id}>
                <h2>UNICORN CRUISE</h2>
                {detail.payment?.charge_id.startsWith("chrg_test_") && (
                  <strong>
                    {en
                      ? "TEST TICKET · Not valid for travel"
                      : "ตั๋วทดสอบ · ใช้เดินทางจริงไม่ได้"}
                  </strong>
                )}
                <p>{detail.pier}</p>
                <strong>
                  {en ? "Seat" : "ที่นั่ง"} {ticket.table_id} · {ticket.ordinal}
                  /{detail.guest_count}
                </strong>
                <div className="cruise-ticket-qr">
                  <QRCodeSVG value={ticket.id} size={180} marginSize={4} />
                </div>
                <small>{ticket.id}</small>
                <p>
                  {en
                    ? "Present this QR at boarding"
                    : "แสดง QR นี้ที่จุดขึ้นเรือ"}
                </p>
              </article>
            ))}
          </div>
          <p>
            {en
              ? "Booking details and tickets are also available in My reservations."
              : "ดูรายละเอียดและตั๋วย้อนหลังได้ในรายการจองของฉัน"}
          </p>
        </>
      ) : (
        <>
          <p>
            {en
              ? "The reservation is awaiting server confirmation. Do not pay again."
              : "รายการยังรอยืนยันจากระบบ กรุณาอย่าชำระซ้ำ"}
          </p>
          <button
            className="bp-secondary"
            onClick={() => setRetry((n) => n + 1)}
          >
            {en ? "Check again" : "ตรวจสอบอีกครั้ง"}
          </button>
        </>
      )}
      <button className="bp-primary" onClick={onOrders}>
        {en ? "My reservations" : "รายการจองของฉัน"}
      </button>
    </section>
  );
}
