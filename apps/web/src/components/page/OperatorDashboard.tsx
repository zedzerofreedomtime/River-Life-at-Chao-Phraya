import { useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import { api } from "../../data/api";
import type { Language } from "../../data/i18n";
import { StaffMetric, useStaffData } from "../staff/StaffTools";
import TicketScanner from "../staff/TicketScanner";
import "../../Staff.css";
type Passenger = {
  id: string;
  name: string;
  zone_id: string;
  quantity: number;
  checked_in: number;
};
export default function OperatorDashboard({
  language,
}: {
  language: Language;
}) {
  const en = language === "en";
  const { data, error, setError, loading, reload } = useStaffData<{
    passengers: Passenger[];
    demo: boolean;
  }>("/dashboard/operator");
  const [ticket, setTicket] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState("");
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("");
  const checking = useRef(false);
  async function check(code: string) {
    if (checking.current) return;
    setSuccess("");
    setError("");
    const value = code.trim();
    setTicket(value);
    if (!/^[a-f0-9]{64}$/i.test(value)) {
      setError(
        en
          ? "Invalid ticket QR. Scan a River Life ticket or enter its 64-character code."
          : "QR ไม่ถูกต้อง กรุณาสแกนบัตร River Life หรือกรอกรหัสบัตร 64 ตัวอักษร",
      );
      return;
    }
    checking.current = true;
    setBusy(true);
    try {
      await api("/dashboard/operator/check-in", {
        method: "POST",
        body: JSON.stringify({ ticket: value }),
      });
      setSuccess(
        en
          ? "Check-in recorded. This ticket cannot be used again."
          : "เช็กอินสำเร็จ บัตรนี้ไม่สามารถใช้ซ้ำได้",
      );
      setTicket("");
      await reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
      checking.current = false;
    }
  }
  const roster = data?.passengers ?? [],
    total = roster.reduce((n, p) => n + p.quantity, 0),
    checked = roster.reduce((n, p) => n + p.checked_in, 0);
  const q = query.toLocaleLowerCase().trim();
  const rows = roster.filter(
    (p) =>
      `${p.id} ${p.name} ${p.zone_id}`.toLocaleLowerCase().includes(q) &&
      (!filter ||
        (filter === "waiting"
          ? p.checked_in < p.quantity
          : p.checked_in === p.quantity)),
  );
  return (
    <section className="staff-workspace">
      <div className="staff-heading">
        <div>
          <span>RIVER LIFE · OPERATOR</span>
          <h1>{en ? "Boarding & check-in" : "ดูแลผู้โดยสารและเช็กอิน"}</h1>
          <p>
            {en
              ? "Confirmed passengers for the current programme. Scan one ticket per guest."
              : "ผู้โดยสารที่ยืนยันแล้วของโปรแกรมปัจจุบัน สแกนบัตรแยกแต่ละคน"}
          </p>
        </div>
        <button disabled={loading} onClick={() => void reload()}>
          {en ? "Refresh" : "โหลดข้อมูลล่าสุด"}
        </button>
      </div>
      {data?.demo && (
        <Alert severity="info">
          {en
            ? "Demo check-in only. Sample tickets are not valid for a real sailing."
            : "เช็กอินสำหรับสาธิตเท่านั้น บัตรตัวอย่างใช้ขึ้นเรือจริงไม่ได้"}
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      {loading && !data && (
        <p role="status">{en ? "Loading…" : "กำลังโหลด…"}</p>
      )}
      <div className="staff-metrics">
        <StaffMetric
          label={en ? "Confirmed guests" : "ผู้โดยสารยืนยัน"}
          value={total}
        />
        <StaffMetric
          label={en ? "Checked in" : "ขึ้นเรือแล้ว"}
          value={checked}
        />
        <StaffMetric
          label={en ? "Not yet checked in" : "ยังไม่เช็กอิน"}
          value={total - checked}
        />
      </div>
      <div className="operator-workbench">
      <section className="staff-panel operator-scanner">
        <h2>{en ? "Scan a ticket" : "สแกนบัตรผู้โดยสาร"}</h2>
        <TicketScanner
          language={language}
          busy={busy}
          onScan={(code) => void check(code)}
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void check(ticket);
          }}
        >
          <label>
            {en ? "Ticket QR code" : "รหัส QR บัตร"}
            <input
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              maxLength={200}
              placeholder={
                en
                  ? "Paste or scan the ticket code"
                  : "กรอก วาง หรือใช้เครื่องสแกนรหัสบัตร"
              }
            />
          </label>
          <button type="submit" disabled={busy || !ticket.trim()}>
            {busy
              ? en
                ? "Checking…"
                : "กำลังตรวจสอบ…"
              : en
                ? "Confirm check-in"
                : "ยืนยันเช็กอิน"}
          </button>
        </form>
      </section>
      <section className="staff-panel operator-passengers">
        <h2>{en ? "Passenger list" : "รายชื่อผู้โดยสาร"}</h2>
        <div className="staff-filter-row">
          <label>
            {en ? "Search passengers" : "ค้นหาผู้โดยสาร"}
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                en ? "Name, booking ID or zone" : "ชื่อ รหัสการจอง หรือโซน"
              }
            />
          </label>
          <label>
            {en ? "Boarding status" : "สถานะขึ้นเรือ"}
            <select aria-label={en ? "Boarding status" : "สถานะขึ้นเรือ"} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">{en ? "All" : "ทั้งหมด"}</option>
              <option value="waiting">{en ? "Waiting" : "ยังไม่ครบ"}</option>
              <option value="complete">
                {en ? "All checked in" : "เช็กอินครบ"}
              </option>
            </select>
          </label>
        </div>
        <p role="status">
          {rows.length} {en ? "matching bookings" : "รายการที่ตรงกัน"}
        </p>
        <div className="staff-passenger-list">
          {rows.map((p) => (
            <article className="staff-booking-row" key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <code>#{p.id}</code>
              </div>
              <span>
                {en ? "Zone" : "โซน"} {p.zone_id}
              </span>
              <strong>
                {p.checked_in} / {p.quantity} {en ? "checked in" : "เช็กอิน"}
              </strong>
            </article>
          ))}
        </div>
      </section>
      </div>
    </section>
  );
}
