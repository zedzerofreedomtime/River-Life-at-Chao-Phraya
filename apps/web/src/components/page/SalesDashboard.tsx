import { useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import {
  api,
  money,
  newToken,
  zoneLabel,
  type Booking,
  type Zone,
} from "../../data/api";
import type { Language } from "../../data/i18n";
import {
  BookingFilters,
  BookingRows,
  filterBookings,
  StaffMetric,
  useStaffData,
} from "../staff/StaffTools";
import "../../Staff.css";

export default function SalesDashboard({
  language,
  onOpen,
}: {
  language: Language;
  onOpen: (
    booking: Booking,
    token: string,
    destination: "payment" | "tickets",
  ) => void;
}) {
  const en = language === "en";
  const { data, error, setError, loading, reload } = useStaffData<{
    bookings: Booking[];
    zones: Zone[];
    demo: boolean;
  }>("/dashboard/sales");
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [zone, setZone] = useState("A"),
    [quantity, setQuantity] = useState(1);
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<{
    booking: Booking;
    token: string;
    shareable?: boolean;
  } | null>(null);
  const attempt = useRef<{
    fingerprint: string;
    key: string;
    token: string;
  } | null>(null);
  const currentZone = data?.zones.find((z) => z.id === zone);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !currentZone || quantity > currentZone.available) return;
    setBusy(true);
    setError("");
    const body = JSON.stringify({
      name: name.trim(),
      email: email.trim(),
      zone_id: zone,
      quantity,
    });
    const request =
      attempt.current?.fingerprint === body
        ? attempt.current
        : { fingerprint: body, key: crypto.randomUUID(), token: newToken() };
    attempt.current = request;
    try {
      const booking = await api<Booking>(
        "/dashboard/sales/bookings",
        { method: "POST", headers: { "Idempotency-Key": request.key }, body },
        request.token,
      );
      setSelected({ booking, token: request.token, shareable: true });
      attempt.current = null;
      setName("");
      setEmail("");
      setQuantity(1);
      await reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function open(id: string) {
    setBusy(true);
    setError("");
    try {
      setSelected(
        await api<{ booking: Booking; token: string }>(
          `/dashboard/sales/bookings/${encodeURIComponent(id)}/access`,
          { method: "POST" },
        ),
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const bookings = data?.bookings ?? [];
  return (
    <section className="staff-workspace">
      <div className="staff-heading">
        <div>
          <span>RIVER LIFE · SALES</span>
          <h1>{en ? "Sales workspace" : "พื้นที่ทำงานฝ่ายขาย"}</h1>
          <p>
            {en
              ? "Create customer reservations and follow your own sales."
              : "จองแทนลูกค้าและติดตามรายการที่คุณรับผิดชอบ"}
          </p>
        </div>
        <button onClick={() => void reload()} disabled={loading}>
          {en ? "Refresh" : "โหลดข้อมูลล่าสุด"}
        </button>
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      {loading && !data && (
        <p role="status">{en ? "Loading…" : "กำลังโหลด…"}</p>
      )}
      {data?.demo && (
        <Alert severity="info">
          {en
            ? "Demonstration programme. Dates and final prices are pending. No real payment."
            : "โปรแกรมสาธิต วันและราคาจริงรอประกาศ ไม่มีการรับเงินจริง"}
        </Alert>
      )}
      <div className="staff-metrics">
        <StaffMetric
          label={en ? "Your latest bookings" : "รายการล่าสุดของคุณ"}
          value={bookings.length}
        />
        <StaffMetric
          label={en ? "Awaiting payment" : "รอชำระเงิน"}
          value={bookings.filter((b) => b.status === "held").length}
        />
        <StaffMetric
          label={
            en
              ? "Confirmed value (latest 200)"
              : "ยอดยืนยันจาก 200 รายการล่าสุด"
          }
          value={money(
            bookings
              .filter((b) => b.status === "confirmed" || b.status === "no_show")
              .reduce((n, b) => n + b.total, 0),
          )}
        />
      </div>
      <form className="staff-panel" onSubmit={create}>
        <h2>{en ? "Book for a customer" : "สร้างรายการแทนลูกค้า"}</h2>
        <p>
          {en
            ? "An existing customer account with this email can see the booking. Otherwise keep the booking and private code for the customer. Booking reserves a zone, not a specific table."
            : "หากอีเมลมีบัญชีลูกค้าแล้ว รายการจะแสดงในบัญชีนั้น หากยังไม่มีบัญชีให้เก็บรหัสรายการและรหัสส่วนตัวส่งให้ลูกค้า จองแบบโซน ไม่ระบุโต๊ะ"}
        </p>
        <div className="staff-form-grid">
          <label>
            {en ? "Customer name" : "ชื่อลูกค้า"}
            <input
              required
              maxLength={120}
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            {en ? "Customer email" : "อีเมลลูกค้า"}
            <input
              required
              type="email"
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            {en ? "Zone" : "โซน"}
            <select
              aria-label={en ? "Zone" : "โซน"}
              value={zone}
              onChange={(e) => {
                setZone(e.target.value);
                setQuantity(1);
              }}
            >
              {data?.zones.map((z) => (
                <option key={z.id} value={z.id} disabled={z.available < 1}>
                  {zoneLabel(z, language)} · {z.available}{" "}
                  {en ? "available" : "ว่าง"} · {money(z.price)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {en ? "Guests" : "จำนวนผู้ร่วมเดินทาง"}
            <input
              required
              type="number"
              min={1}
              max={Math.min(10, currentZone?.available ?? 10)}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="staff-form-actions">
          <strong>
            {en ? "Demo total" : "ยอดรวมทดสอบ"}:{" "}
            {money((currentZone?.price ?? 0) * quantity)}
          </strong>
          <button
            type="submit"
            disabled={
              busy || !data || !currentZone || currentZone.available < quantity
            }
          >
            {busy
              ? en
                ? "Saving…"
                : "กำลังบันทึก…"
              : en
                ? "Create reservation"
                : "สร้างรายการจอง"}
          </button>
        </div>
      </form>
      {selected && (
        <section
          className="staff-panel"
          aria-label={en ? "Selected booking" : "รายการที่เลือก"}
        >
          <h2>{en ? "Selected booking" : "รายการที่เลือก"}</h2>
          <p>
            #{selected.booking.id} · {selected.booking.name} ·{" "}
            {money(selected.booking.total)}
          </p>
          {selected.shareable ? (
            <details>
              <summary>
                {en
                  ? "Customer private access code"
                  : "รหัสส่วนตัวสำหรับส่งให้ลูกค้า"}
              </summary>
              <code className="staff-private-code">{selected.token}</code>
            </details>
          ) : (
            <p>
              {en
                ? "Use the customer's original private code or customer account to reopen tickets. Your staff access here is separate from customer access."
                : "ลูกค้าเปิดตั๋วด้วยบัญชีของตัวเองหรือรหัสส่วนตัวเดิมได้ สิทธิ์พนักงานในหน้านี้แยกจากรหัสของลูกค้า"}
            </p>
          )}
          <div className="staff-form-actions">
            {selected.booking.status === "held" && (
              <button
                onClick={() =>
                  onOpen(selected.booking, selected.token, "payment")
                }
              >
                {en ? "Continue to payment" : "ไปหน้าชำระเงิน"}
              </button>
            )}
            {selected.booking.status === "confirmed" && (
              <button
                onClick={() =>
                  onOpen(selected.booking, selected.token, "tickets")
                }
              >
                {en ? "Open tickets" : "เปิดบัตรลูกค้า"}
              </button>
            )}
          </div>
        </section>
      )}
      <section className="staff-panel">
        <h2>{en ? "Your bookings" : "รายการขายของคุณ"}</h2>
        <p>
          {en
            ? "Latest 200 bookings assigned to your account."
            : "แสดง 200 รายการล่าสุดที่บัญชีของคุณสร้าง"}
        </p>
        <BookingFilters
          query={query}
          setQuery={setQuery}
          status={status}
          setStatus={setStatus}
          language={language}
        />
        <BookingRows
          items={filterBookings(bookings, query, status)}
          language={language}
          onOpen={(id) => void open(id)}
          busy={busy}
        />
      </section>
    </section>
  );
}
