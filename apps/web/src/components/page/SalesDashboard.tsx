import { useState } from "react";
import Alert from "@mui/material/Alert";
import { api, money, type Booking, type Zone } from "../../data/api";
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
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<{
    booking: Booking;
    token: string;
    shareable?: boolean;
  } | null>(null);
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
          <h1>{en ? "Previous zone reservations" : "รายการจองโซนเดิม"}</h1>
          <p>
            {en
              ? "Access previous bookings. Create new reservations using the seat picker above."
              : "เปิดดูรายการเก่าได้ สร้างรายการใหม่ด้วยผังเก้าอี้ด้านบน"}
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
