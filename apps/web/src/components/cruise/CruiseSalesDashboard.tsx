import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import { money } from "../../data/api";
import { sailingDate, type CruiseReservation } from "../../data/cruises";
import type { Language } from "../../data/i18n";
import { useStaffData } from "../staff/StaffTools";
import LiveCruiseBooking from "./LiveCruiseBooking";
import "../../Staff.css";

export default function CruiseSalesDashboard({
  language,
}: {
  language: Language;
}) {
  const en = language === "en";
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const { data, error, loading, reload } = useStaffData<CruiseReservation[]>(
    "/dashboard/sales/cruises/reservations",
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [customer, setCustomer] = useState<{
    email: string;
    name: string;
  } | null>(null);
  const [saved, setSaved] = useState<CruiseReservation | null>(null);
  return (
    <section className="staff-workspace">
      <header className="staff-heading">
        <div>
          <span>RIVER LIFE · SALES</span>
          <h1>{en ? "Sales workspace" : "พื้นที่ทำงานฝ่ายขาย"}</h1>
          <p>
            {en
              ? "Reserve individual seats and extras for a customer."
              : "จองรายเก้าอี้และบริการเสริมแทนลูกค้า"}
          </p>
        </div>
        <button disabled={loading} onClick={() => void reload()}>
          {en ? "Refresh" : "โหลดข้อมูลล่าสุด"}
        </button>
      </header>
      {error && <Alert severity="error">{error}</Alert>}
      {!customer && (
        <form
          className="staff-panel"
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(null);
            setCustomer({
              email: email.trim().toLowerCase(),
              name: name.trim(),
            });
          }}
        >
          <h2>{en ? "Book for a customer" : "สร้างรายการแทนลูกค้า"}</h2>
          <p>
            {en
              ? "Use the email of an existing customer account. The customer pays and receives tickets in that account. Ask new customers to register first."
              : "ใช้อีเมลบัญชีลูกค้าที่สมัครแล้ว ลูกค้าชำระเงินและรับตั๋วผ่านบัญชีนั้น หากยังไม่มีบัญชีให้ลูกค้าสมัครก่อน"}
          </p>
          <div className="staff-form-grid">
            <label>
              {en ? "Customer name" : "ชื่อลูกค้า"}
              <input
                required
                maxLength={60}
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
          </div>
          <button type="submit">
            {en ? "Choose seats and extras" : "เลือกเก้าอี้และบริการเสริม"}
          </button>
        </form>
      )}
      {customer && (
        <>
          <p>
            {en ? "Customer" : "ลูกค้า"}: {customer.name} · {customer.email}
          </p>
          <LiveCruiseBooking
            key={customer.email}
            language={language}
            authenticated
            accountName={customer.name}
            salesCustomer={customer}
            onSalesReserved={(r) => {
              setSaved(r);
              setCustomer(null);
              void reload();
              window.scrollTo({ top: 0, behavior: "instant" });
            }}
            onBack={() => setCustomer(null)}
            onOrders={() => setCustomer(null)}
            onLogin={() => {}}
            onContact={() => window.location.assign("/help/contact")}
          />
        </>
      )}
      {saved && Date.parse(saved.expires_at) > now && (
        <section className="staff-panel" role="status">
          <h2>
            {en ? "Seats held for customer" : "สำรองเก้าอี้ให้ลูกค้าแล้ว"}
          </h2>
          <p>
            {(saved.seat_ids ?? []).join(", ")} · {money(saved.total)}
          </p>
          <p>
            {en
              ? "Ask the customer to sign in and open this payment link before the hold expires. This is not a paid ticket yet."
              : "ให้ลูกค้าเข้าสู่ระบบแล้วเปิดลิงก์ชำระเงินนี้ก่อนหมดเวลาสำรอง ยังไม่ใช่ตั๋วที่ชำระแล้ว"}
          </p>
          <input
            aria-label={en ? "Customer payment link" : "ลิงก์ชำระเงินของลูกค้า"}
            readOnly
            value={`${window.location.origin}/booking?payment=${encodeURIComponent(saved.id)}`}
          />
        </section>
      )}
      <section className="staff-panel">
        <h2>
          {en
            ? "Your latest 100 reservations"
            : "รายการขายของคุณ 100 รายการล่าสุด"}
        </h2>
        {!data?.length && <p>{en ? "No reservations" : "ยังไม่มีรายการจอง"}</p>}
        {data?.map((r) => (
          <article key={r.id} className="staff-panel">
            <strong>
              {r.customer_name} · {sailingDate(r.departure_at, en)}
            </strong>
            <p>
              {(r.seat_ids ?? []).join(", ")} · {money(r.total)} · {r.status}
            </p>
            {r.items?.map((item) => (
              <p key={item.id}>
                {item.name} × {item.quantity}
              </p>
            ))}
            <small>{r.id}</small>
            {r.status === "held" && Date.parse(r.expires_at) <= now && (
              <p role="status">
                {en
                  ? "Hold expired. Start a new booking."
                  : "หมดเวลาสำรองแล้ว กรุณาเริ่มจองใหม่"}
              </p>
            )}
            {r.status === "held" && Date.parse(r.expires_at) > now && (
              <p>
                {en ? "Customer payment link" : "ลิงก์ให้ลูกค้าชำระ"}:{" "}
                <input
                  aria-label={`${en ? "Payment link" : "ลิงก์ชำระ"} ${r.id}`}
                  readOnly
                  value={`${window.location.origin}/booking?payment=${encodeURIComponent(r.id)}`}
                />
              </p>
            )}
          </article>
        ))}
      </section>
    </section>
  );
}
