import { useEffect, useRef, useState } from "react";
import { api, money, statusLabel } from "../../data/api";
import {
  sailingDate,
  type CruiseReservationDetail,
  type Sailing,
} from "../../data/cruises";
import type { Language } from "../../data/i18n";
import TicketScanner from "../staff/TicketScanner";
export function CruisePayments({ language }: { language: Language }) {
  const en = language === "en",
    t = (th: string, english: string) => (en ? english : th);
  const [orders, setOrders] = useState<CruiseReservationDetail[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [id, setId] = useState(""),
    [reference, setReference] = useState(""),
    [amount, setAmount] = useState(""),
    [verified, setVerified] = useState(false);
  const [gatewayID, setGatewayID] = useState("");
  const [chargeID, setChargeID] = useState("");
  const [gatewayMessage, setGatewayMessage] = useState("");
  const [cursor, setCursor] = useState("");
  const [nextCursor, setNextCursor] = useState("");
  const [previous, setPrevious] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const requestVersion = useRef(0);
  async function load(target = cursor, history = previous) {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const page = await api<{
        items: CruiseReservationDetail[];
        next_cursor: string;
      }>(
        "/dashboard/admin/cruises/reservations?limit=25&cursor=" +
          encodeURIComponent(target),
      );
      if (version !== requestVersion.current) return;
      setOrders(page.items);
      setCursor(target);
      setPrevious(history);
      setNextCursor(page.next_cursor);
      setError("");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load().catch(() =>
      setError(t("โหลดรายการไม่ได้", "Unable to load reservations")),
    );
  }, [en]);
  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!verified || busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`/dashboard/admin/cruises/reservations/${id}/confirm-payment`, {
        method: "POST",
        body: JSON.stringify({
          reference: reference.trim(),
          amount: Math.round(Number(amount) * 100),
          verified,
        }),
      });
      setId("");
      setReference("");
      setAmount("");
      setVerified(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to confirm");
    } finally {
      setBusy(false);
    }
  }
  async function reconcile(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setGatewayMessage("");
    try {
      const result = await api<{ status: string }>(
        `/dashboard/admin/cruises/reservations/${encodeURIComponent(gatewayID)}/reconcile-payment`,
        {
          method: "POST",
          body: JSON.stringify({ charge_id: chargeID.trim() }),
        },
      );
      setGatewayMessage(
        result.status === "review_required"
          ? t(
              "ต้องตรวจสอบกับลูกค้าและ Omise ต่อ ห้ามออกตั๋วหรือรับเงินซ้ำ",
              "Further review required. Do not issue tickets or collect payment again.",
            )
          : t("ตรวจสถานะจาก Omise แล้ว: ", "Verified Omise status: ") +
              result.status,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to reconcile");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rx-admin">
      <h2>
        {t("ตรวจสอบการชำระเงินและออกตั๋ว", "Payment verification & tickets")}
      </h2>
      <p>
        {t(
          "Omise ใช้ Sandbox เท่านั้น รายการผ่าน Gateway ต้องตรวจจาก Omise ห้ามยืนยันยอดเอง ส่วนรายการโอนธนาคารต้องตรวจยอดเงินจริงก่อนออกตั๋ว",
          "Omise is sandbox-only. Reconcile gateway orders against Omise; never manually confirm them. Verify actual funds before confirming a separate bank-transfer order.",
        )}
      </p>
      {error && <p role="alert">{error}</p>}
      <button
        onClick={() =>
          void load().catch(() =>
            setError(t("โหลดรายการไม่ได้", "Unable to load")),
          )
        }
      >
        {t("รีเฟรชรายการ", "Refresh")}
      </button>
      {orders.length === 0 && (
        <p>{t("ยังไม่มีรายการจอง", "No reservations yet")}</p>
      )}
      <nav
        aria-label={t("หน้ารายการจอง", "Reservation pages")}
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBlock: 16,
        }}
      >
        <button
          className="btn"
          disabled={loading || busy || previous.length === 0}
          onClick={() =>
            void load(
              previous[previous.length - 1],
              previous.slice(0, -1),
            ).catch(() =>
              setError(t("โหลดรายการไม่ได้", "Unable to load reservations")),
            )
          }
        >
          {t("ก่อนหน้า", "Previous")}
        </button>
        <span aria-live="polite">
          {loading
            ? t("กำลังโหลด…", "Loading…")
            : t("หน้า ", "Page ") + (previous.length + 1)}
        </span>
        <button
          className="btn"
          disabled={loading || busy || !nextCursor}
          onClick={() =>
            void load(nextCursor, [...previous, cursor]).catch(() =>
              setError(t("โหลดรายการไม่ได้", "Unable to load reservations")),
            )
          }
        >
          {t("ถัดไป", "Next")}
        </button>
      </nav>
      {orders.map((order) => (
        <article key={order.id} className="rx-info">
          <h3>{order.title}</h3>
          <p>
            {order.id} · {order.customer_name} · {order.email}
          </p>
          <p>
            {sailingDate(order.departure_at, en)} ·{" "}
            {(order.seat_ids?.length ? order.seat_ids : order.table_ids).join(
              ", ",
            )}{" "}
            · {order.guest_count} {t("คน", "guests")}
          </p>
          <p>
            {t("ค่าที่นั่ง", "Seating")}: {money(order.table_total ?? 0)} +{" "}
            {t("บริการเสริม", "Extras")}: {money(order.extras_total ?? 0)} ={" "}
            <b>{money(order.total)}</b>
          </p>
          {order.items?.map((item) => (
            <p key={item.id}>
              {item.name} × {item.quantity} ·{" "}
              {money(item.quantity * item.unit_price)}
            </p>
          ))}
          {order.notes && <p>{order.notes}</p>}
          {!!order.requests?.length && (
            <p>
              {t("คำขอรอยืนยัน", "Pending enquiries")}:{" "}
              {order.requests.join(", ")}
            </p>
          )}
          <p>{statusLabel(order.status, language)}</p>
          {order.emails.map((email) => (
            <p key={email.kind}>
              {email.kind === "booking"
                ? t("รายละเอียดการจอง", "Booking details")
                : t("ตั๋วเรือ", "Tickets")}
              :{" "}
              {email.sent_at
                ? t("ส่งแล้ว", "Sent")
                : email.stopped_at
                  ? t(
                      "ส่งไม่สำเร็จ ต้องตรวจ SMTP",
                      "Delivery stopped — check SMTP",
                    )
                  : t("รอส่ง / กำลังลองใหม่", "Queued / retrying")}
            </p>
          ))}
          {order.payment && (
            <div>
              <p>
                Omise: {order.payment.status || "unknown"} ·{" "}
                {order.payment.charge_id ||
                  t("ยังไม่ทราบ Charge ID", "Charge ID unknown")}
              </p>
              {order.payment.review_reason && (
                <p role="alert">
                  {t("ต้องตรวจสอบ: ", "Review required: ")}
                  {order.payment.review_reason}
                </p>
              )}
              <button
                disabled={busy}
                onClick={() => {
                  setGatewayID(order.id);
                  setChargeID(order.payment?.charge_id || "");
                  setGatewayMessage("");
                }}
              >
                {t("ตรวจรายการกับ Omise", "Reconcile with Omise")}
              </button>
            </div>
          )}
          {order.status === "held" && !order.payment && (
            <button
              onClick={() => {
                setId(order.id);
                setReference("");
                setAmount("");
                setVerified(false);
              }}
            >
              {t("ตรวจยอดรายการนี้", "Verify this payment")}
            </button>
          )}
        </article>
      ))}
      {gatewayID && (
        <form className="rx-info" onSubmit={reconcile}>
          <h3>{t("ตรวจรายการ Omise Sandbox", "Reconcile Omise Sandbox")}</h3>
          <p>{gatewayID}</p>
          <p>
            {t(
              "ค้นหารายการใน Omise ด้วย metadata.reservation_id ก่อนกรอก Charge ID ระบบจะตรวจเจ้าของ ยอดเงิน และสถานะจริง ไม่สร้างการจ่ายใหม่ และไม่ออกตั๋วให้รายการหมดเวลา",
              "Find the charge by metadata.reservation_id before entering its ID. The server verifies ownership, amount and status; it never creates a new charge or tickets for an expired hold.",
            )}
          </p>
          <label>
            Omise Charge ID
            <input
              value={chargeID}
              maxLength={100}
              onChange={(e) => setChargeID(e.target.value)}
              placeholder="chrg_test_…"
            />
          </label>
          <button className="rx-primary" disabled={busy}>
            {t("ตรวจและซิงก์สถานะ", "Verify and sync")}
          </button>
          <button type="button" onClick={() => setGatewayID("")}>
            {t("ปิด", "Close")}
          </button>
          {gatewayMessage && <p role="status">{gatewayMessage}</p>}
        </form>
      )}
      {id && (
        <form onSubmit={confirm} className="rx-info">
          <h3>{t("ยืนยันยอดเงินจริง", "Confirm verified funds")}</h3>
          <p>{id}</p>
          <label>
            {t(
              "เลขอ้างอิงธนาคาร (ห้ามซ้ำ)",
              "Unique bank transaction reference",
            )}
            <input
              required
              minLength={8}
              maxLength={100}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
          <label>
            {t("ยอดที่ได้รับจริง (บาท)", "Actual amount received (THB)")}
            <input
              required
              type="number"
              min={0.01}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="rx-check">
            <input
              type="checkbox"
              required
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
            />
            {t(
              "ตรวจสอบยอดเงินจริงเข้าบัญชีแล้ว และตรงกับรายการนี้",
              "I verified actual funds received for this reservation",
            )}
          </label>
          <button disabled={busy || !verified} className="rx-primary">
            {busy
              ? t("กำลังบันทึก…", "Saving…")
              : t("ยืนยันและออกตั๋ว", "Confirm & issue tickets")}
          </button>
          <button type="button" onClick={() => setId("")}>
            {t("ยกเลิก", "Cancel")}
          </button>
        </form>
      )}
    </section>
  );
}
export function CruiseCheckIn({ language }: { language: Language }) {
  const en = language === "en",
    t = (th: string, english: string) => (en ? english : th);
  const [sailings, setSailings] = useState<Sailing[]>([]),
    [sailing, setSailing] = useState(""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    void api<Sailing[]>("/dashboard/operator/cruises/sailings")
      .then(setSailings)
      .catch(() => setError(t("โหลดรอบเรือไม่ได้", "Unable to load sailings")));
  }, [en]);
  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api<{ table_id: string; ordinal: number }>(
        "/dashboard/operator/cruises/check-in",
        {
          method: "POST",
          body: JSON.stringify({ sailing_id: sailing, code: code.trim() }),
        },
      );
      setMessage(
        `${t("เช็กอินสำเร็จ โต๊ะ", "Checked in, table")} ${result.table_id} · ${result.ordinal}`,
      );
      setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check-in failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rx-admin">
      <h2>
        {t("เช็กอินตั๋ว Unicorn Cruise", "Unicorn Cruise ticket check-in")}
      </h2>
      <p>
        {t(
          "เลือกรอบให้ตรงกับตั๋ว ใช้เครื่องอ่าน QR หรือวางรหัสตั๋ว RLC1. เช็กอินได้ตั้งแต่เวลาขึ้นเรือจนถึงเวลาออกเรือ",
          "Choose the ticket's sailing. Scan with a QR reader or paste the RLC1. code. Check-in is available from boarding until departure.",
        )}
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <form onSubmit={check}>
        <label>
          {t("รอบเรือ", "Sailing")}
          <select
            aria-label={t("รอบเรือ", "Sailing")}
            required
            value={sailing}
            onChange={(e) => {
              setSailing(e.target.value);
              setMessage("");
            }}
          >
            <option value="">{t("เลือกรอบ", "Select a sailing")}</option>
            {sailings.map((s) => (
              <option value={s.id} key={s.id}>
                {s.title} · {sailingDate(s.departure_at, en)}
              </option>
            ))}
          </select>
        </label>
        {sailing && (
          <TicketScanner language={language} busy={busy} onScan={setCode} />
        )}
        <label>
          {t("รหัสจาก QR ตั๋ว", "Ticket QR code")}
          <input
            required
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={100}
          />
        </label>
        <button
          className="rx-primary"
          disabled={busy || !sailing || !code.trim()}
        >
          {busy
            ? t("กำลังตรวจ…", "Checking…")
            : t("ตรวจตั๋วและเช็กอิน", "Check ticket & admit")}
        </button>
      </form>
    </section>
  );
}
