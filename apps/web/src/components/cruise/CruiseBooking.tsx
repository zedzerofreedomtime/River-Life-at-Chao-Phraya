import { useEffect, useRef, useState } from "react";
import { api, money } from "../../data/api";
import {
  sailingDate,
  type Sailing,
  type CruiseReservation,
} from "../../data/cruises";
import type { Language } from "../../data/i18n";
export default function CruiseBooking({
  vessel,
  language,
  authenticated,
  onLogin,
  onContact,
  onOrders,
}: {
  vessel: string;
  language: Language;
  authenticated: boolean;
  onLogin: () => void;
  onContact: () => void;
  onOrders: () => void;
}) {
  const en = language === "en";
  const [items, setItems] = useState<Sailing[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(""),
    [tables, setTables] = useState<string[]>([]),
    [guests, setGuests] = useState(2),
    [review, setReview] = useState(false),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<CruiseReservation | null>(null);
  const attempt = useRef<{ body: string; key: string } | null>(null);
  useEffect(() => {
    let stopped = false;
    const load = () =>
      api<Sailing[]>(`/sailings?vessel=${encodeURIComponent(vessel)}`)
        .then((v) => {
          if (!stopped) {
            setItems(v);
            setError("");
          }
        })
        .catch(() => {
          if (!stopped) {
            setError(
              en
                ? "Unable to load sailings. Please retry."
                : "โหลดรอบเรือไม่ได้ กรุณาลองใหม่",
            );
            setItems([]);
          }
        })
        .finally(() => {
          if (!stopped) setLoading(false);
        });
    void load();
    const timer = setInterval(load, 15000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [vessel, en]);
  const sailing = items.find((s) => s.id === selected);
  const chosen = sailing?.tables.filter((t) => tables.includes(t.id)) ?? [];
  const total = chosen.reduce((n, t) => n + t.price, 0);
  const seats = chosen.reduce((n, t) => n + t.seats, 0);
  const valid =
    tables.length <= 30 &&
    chosen.length > 0 &&
    chosen.length === tables.length &&
    chosen.every((t) => t.available) &&
    seats >= guests &&
    guests >= 1 &&
    guests <= 200;
  async function submit() {
    if (!authenticated) {
      onLogin();
      return;
    }
    if (!valid || busy) return;
    const body = JSON.stringify({
      sailing_id: selected,
      table_ids: [...tables].sort(),
      guest_count: guests,
      expected_total: total,
    });
    if (attempt.current?.body !== body)
      attempt.current = { body, key: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      setResult(
        await api<CruiseReservation>("/cruise-reservations", {
          method: "POST",
          headers: { "Idempotency-Key": attempt.current.key },
          body,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to reserve");
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <div className="rx-info">
        <h2>
          {result.status === "held"
            ? en
              ? "Tables held"
              : "สำรองโต๊ะชั่วคราวแล้ว"
            : en
              ? "Reservation no longer active"
              : "รายการสำรองนี้หมดเวลาหรือยกเลิกแล้ว"}
        </h2>
        <p>{result.id}</p>
        <p>
          {sailingDate(result.departure_at, en)} · {result.pier}
        </p>
        <p>
          {result.table_ids.join(", ")} · {result.guest_count}{" "}
          {en ? "guests" : "คน"} · {money(result.total)}
        </p>
        <p>
          {en ? "Expires" : "หมดเวลาสำรอง"}:{" "}
          {sailingDate(result.expires_at, en)}
        </p>
        <p>
          {en
            ? "Not paid. This is not a boarding ticket. Online payments are not available yet."
            : "ยังไม่ได้ชำระเงิน รายการนี้ไม่ใช่บัตรขึ้นเรือ ระบบยังไม่เปิดรับชำระเงินออนไลน์"}
        </p>
        <button className="rx-primary" onClick={onOrders}>
          {en ? "My reservations" : "ดูรายการสำรองโต๊ะ"}
        </button>
      </div>
    );
  return (
    <div className="rx-live-booking">
      {loading && (
        <p role="status">{en ? "Loading sailings…" : "กำลังโหลดรอบเรือ…"}</p>
      )}
      {error && <p role="alert">{error}</p>}
      {!loading && items.length === 0 && (
        <div className="rx-info">
          <h2>{en ? "Sailings coming soon" : "ยังไม่มีรอบที่เปิดรับจอง"}</h2>
          <p>
            {en
              ? "Dates, prices and table plans are being prepared. Contact River Life for more information."
              : "กำลังเตรียมวันเดินทาง ราคา และผังโต๊ะ สอบถามข้อมูลเพิ่มเติมกับ River Life ได้เลย"}
          </p>
          <button className="rx-primary" onClick={onContact}>
            {en ? "Contact River Life" : "สอบถามรอบเรือ"}
          </button>
        </div>
      )}
      {items.length > 0 && (
        <>
          <label htmlFor="live-sailing">
            {en ? "Sailing (Bangkok time)" : "เลือกรอบเรือ (เวลาไทย)"}
          </label>
          <select
            id="live-sailing"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setTables([]);
              setReview(false);
              attempt.current = null;
            }}
          >
            <option value="">
              {en ? "Choose a sailing" : "เลือกรอบเดินทาง"}
            </option>
            {items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} · {sailingDate(s.departure_at, en)}
              </option>
            ))}
          </select>
        </>
      )}
      {sailing && (
        <>
          <p>
            {sailing.pier} · {en ? "Boarding" : "ขึ้นเรือ"}{" "}
            {sailingDate(sailing.boarding_at, en)}
          </p>
          <label htmlFor="live-guests">
            {en ? "Guests" : "จำนวนผู้ร่วมเดินทาง"}
          </label>
          <input
            id="live-guests"
            type="number"
            min={1}
            max={200}
            value={guests}
            onChange={(e) => {
              setGuests(Number(e.target.value));
              setReview(false);
            }}
          />
          {(["upper", "lower"] as const).map((deck) => (
            <div className="rx-info" key={deck}>
              <h2>
                {deck === "upper"
                  ? en
                    ? "Upper deck"
                    : "ชั้นบน"
                  : en
                    ? "Lower deck"
                    : "ชั้นล่าง"}
              </h2>
              <div className="rx-table-grid">
                {sailing.tables
                  .filter((t) => t.deck === deck)
                  .map((t) => (
                    <button
                      key={t.id}
                      disabled={!t.available || busy}
                      aria-pressed={tables.includes(t.id)}
                      onClick={() => {
                        setReview(false);
                        setTables((prev) =>
                          prev.includes(t.id)
                            ? prev.filter((id) => id !== t.id)
                            : [...prev, t.id],
                        );
                      }}
                    >
                      <strong>{t.id}</strong>
                      <span>
                        {t.seats} {en ? "seats" : "ที่นั่ง"}
                      </span>
                      <span>{money(t.price)}</span>
                      <small>
                        {!t.available
                          ? en
                            ? "Unavailable"
                            : "ไม่ว่าง"
                          : tables.includes(t.id)
                            ? en
                              ? "Selected"
                              : "เลือกแล้ว"
                            : en
                              ? "Available"
                              : "ว่าง"}
                      </small>
                    </button>
                  ))}
              </div>
            </div>
          ))}
          <p>
            {en ? "Reserved seats" : "ที่นั่งรวม"}: {seats} ·{" "}
            {en ? "Whole-table total" : "ราคารวมทั้งโต๊ะ"}: {money(total)}
          </p>
          <p>
            {en
              ? "A reservation holds your tables for 15 minutes. Payment and boarding tickets are not available yet."
              : "สำรองโต๊ะได้ 15 นาที ยังไม่เปิดรับชำระเงินและยังไม่ออกบัตรขึ้นเรือ"}
          </p>
          {seats > 0 && seats < guests && (
            <p role="alert">
              {en
                ? "Please choose enough seats."
                : "กรุณาเลือกโต๊ะให้เพียงพอกับจำนวนคน"}
            </p>
          )}
          {!review ? (
            <button
              className="rx-primary"
              disabled={!valid}
              onClick={() => setReview(true)}
            >
              {en ? "Review reservation" : "ตรวจสอบรายการ"}
            </button>
          ) : (
            <div className="rx-info">
              <h2>{en ? "Review your reservation" : "ตรวจสอบก่อนสำรองโต๊ะ"}</h2>
              <p>
                {sailing.title} · {tables.join(", ")} · {guests}{" "}
                {en ? "guests" : "คน"} · {money(total)}
              </p>
              <button
                className="rx-primary"
                disabled={!valid || busy}
                onClick={submit}
              >
                {busy
                  ? en
                    ? "Saving…"
                    : "กำลังบันทึก…"
                  : authenticated
                    ? en
                      ? "Hold tables"
                      : "ยืนยันสำรองโต๊ะ"
                    : en
                      ? "Sign in to reserve"
                      : "เข้าสู่ระบบเพื่อสำรองโต๊ะ"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
