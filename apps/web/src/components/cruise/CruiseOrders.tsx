import OmisePayment from "./OmisePayment";
import { useEffect, useState } from "react";
import { api, money, statusLabel } from "../../data/api";
import { QRCodeSVG } from "qrcode.react";
import {
  sailingDate,
  cruiseDisplayText,
  type CruiseReservation,
  type CruiseReservationDetail,
} from "../../data/cruises";
import type { Language } from "../../data/i18n";
export default function CruiseOrders({ language }: { language: Language }) {
  const en = language === "en";
  const [detail, setDetail] = useState<CruiseReservationDetail | null>(null);
  async function open(id: string) {
    setBusy(id);
    setError("");
    try {
      setDetail(
        await api<CruiseReservationDetail>(`/me/cruise-reservations/${id}`),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load");
    } finally {
      setBusy("");
    }
  }
  const [items, setItems] = useState<CruiseReservation[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const load = () =>
    api<CruiseReservation[]>("/me/cruise-reservations").then(setItems);
  useEffect(() => {
    let stopped = false;
    const refresh = () =>
      api<CruiseReservation[]>("/me/cruise-reservations")
        .then((v) => {
          if (!stopped) setItems(v);
        })
        .catch(() => {
          if (!stopped)
            setError(
              en ? "Unable to load reservations." : "โหลดรายการสำรองโต๊ะไม่ได้",
            );
        });
    void refresh();
    const timer = setInterval(refresh, 15000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [en]);
  async function cancel(id: string) {
    setBusy(id);
    setError("");
    try {
      await api(`/me/cruise-reservations/${id}/cancel`, { method: "POST" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="rx-orders">
      <h2>{en ? "Cruise reservations & tickets" : "รายการจองและตั๋วเรือ"}</h2>
      {error && <p role="alert">{error}</p>}
      {!items.length && !error && (
        <p>{en ? "No reservations yet" : "ยังไม่มีรายการสำรองโต๊ะ"}</p>
      )}
      {items.map((r) => (
        <article className="rx-info" key={r.id}>
          <h3>
            {r.vessel} · {cruiseDisplayText(r.title)}
          </h3>
          <p>
            {sailingDate(r.departure_at, en)} · {cruiseDisplayText(r.pier)}
          </p>
          <p>
            {(r.seat_ids?.length ? r.seat_ids : r.table_ids).join(", ")} ·{" "}
            {r.guest_count} {en ? "guests" : "คน"} · {money(r.total)}
          </p>
          <p>
            {r.status === "confirmed"
              ? statusLabel(r.status, language)
              : r.status === "held"
                ? en
                  ? "Temporarily held · not paid"
                  : "สำรองชั่วคราว · ยังไม่ชำระเงิน"
                : r.status === "expired"
                  ? en
                    ? "Expired"
                    : "หมดเวลาสำรอง"
                  : en
                    ? "Cancelled"
                    : "ยกเลิกแล้ว"}
          </p>
          {r.status === "held" && (
            <p>
              {en ? "Hold expires" : "หมดเวลาสำรอง"}:{" "}
              {sailingDate(r.expires_at, en)}
            </p>
          )}
          <small>{r.id}</small>
          {r.status === "held" && (
            <OmisePayment
              key={r.id}
              id={r.id}
              language={language}
              amount={r.total}
              onPaid={() => {
                void load();
                void open(r.id);
              }}
            />
          )}
          <button disabled={!!busy} onClick={() => void open(r.id)}>
            {en ? "Details / tickets" : "รายละเอียด / ตั๋ว"}
          </button>
          {detail?.id === r.id && (
            <div className="rx-order-detail">
              <h4>{en ? "Booking details" : "รายละเอียดการจอง"}</h4>
              <p>
                {detail.customer_name} · {detail.email}
              </p>
              <p>
                {en ? "Seating" : "ค่าที่นั่ง"}:{" "}
                {money(detail.table_total ?? 0)} +{" "}
                {en ? "Extras" : "บริการเสริม"}:{" "}
                {money(detail.extras_total ?? 0)} = <b>{money(detail.total)}</b>
              </p>
              {detail.items?.map((item) => (
                <p key={item.id}>
                  {cruiseDisplayText(item.name)} × {item.quantity} ·{" "}
                  {money(item.quantity * item.unit_price)}
                </p>
              ))}
              {detail.notes && <p>{detail.notes}</p>}
              {!!detail.requests?.length && (
                <p>
                  {en
                    ? "Enquiries pending confirmation (not priced)"
                    : "คำขอรอยืนยัน (ยังไม่รวมราคา)"}
                  : {detail.requests.join(", ")}
                </p>
              )}
              {detail.status !== "confirmed" ? (
                <p>
                  {en
                    ? "Tickets and emails follow verified payment"
                    : "จะออกตั๋วและส่งอีเมลหลังตรวจสอบการชำระเงินจริงแล้ว"}
                </p>
              ) : (
                <>
                  <p>
                    {en ? "Two emails addressed to" : "จัดส่งอีเมล 2 ฉบับไปยัง"}
                    : {detail.email}
                  </p>
                  {detail.emails.map((email) => (
                    <p key={email.kind}>
                      {email.kind === "booking"
                        ? en
                          ? "Booking details"
                          : "รายละเอียดการจอง"
                        : en
                          ? "Tickets"
                          : "ตั๋วเรือ"}
                      :{" "}
                      {email.sent_at
                        ? en
                          ? "Sent"
                          : "ส่งแล้ว"
                        : email.stopped_at
                          ? en
                            ? "Delivery stopped — contact the team"
                            : "ส่งไม่สำเร็จ กรุณาติดต่อทีมงาน"
                          : en
                            ? "Queued"
                            : "อยู่ในคิวส่ง"}
                    </p>
                  ))}
                  <div className="cruise-ticket-grid">
                    {detail.tickets.map((ticket) => (
                      <article
                        className="cruise-boarding-ticket"
                        key={ticket.id}
                      >
                        <h4>UNICORN CRUISE</h4>
                        <p>{sailingDate(detail.departure_at, en)}</p>
                        <p>{cruiseDisplayText(detail.pier)}</p>
                        <strong>
                          {detail.seat_ids?.length
                            ? en
                              ? "Seat"
                              : "ที่นั่ง"
                            : en
                              ? "Table"
                              : "โต๊ะ"}{" "}
                          {ticket.table_id} · {ticket.ordinal}/
                          {detail.guest_count}
                        </strong>
                        <div className="cruise-ticket-qr">
                          <QRCodeSVG
                            value={ticket.id}
                            size={180}
                            marginSize={4}
                          />
                        </div>
                        <small>{ticket.id}</small>
                        <p>
                          {ticket.checked_in_at
                            ? en
                              ? "Checked in"
                              : "เช็กอินแล้ว"
                            : en
                              ? "Present this QR at boarding"
                              : "แสดง QR นี้ที่จุดขึ้นเรือ"}
                        </p>
                      </article>
                    ))}
                  </div>
                </>
              )}
              <button onClick={() => setDetail(null)}>
                {en ? "Close details" : "ปิดรายละเอียด"}
              </button>
            </div>
          )}
          {r.status === "held" && (
            <button disabled={busy !== ""} onClick={() => cancel(r.id)}>
              {en ? "Cancel hold" : "ยกเลิกการสำรอง"}
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
