import { useEffect, useState } from "react";
import { api, money } from "../../data/api";
import type { Language } from "../../data/i18n";
import "../../Staff.css";
type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  suspended: boolean;
};
type Audit = {
  id: number;
  actor: string;
  action: string;
  target: string;
  at: string;
};
type Sale = {
  sailing: string;
  departure: string;
  seller: string;
  method: string;
  bookings: number;
  seats: number;
  total: number;
};
export default function AdminManagement({
  language,
  role,
  currentEmail,
}: {
  language: Language;
  role: string;
  currentEmail: string;
}) {
  const en = language === "en",
    t = (th: string, english: string) => (en ? english : th);
  const [reason, setReason] = useState(""),
    [seatText, setSeatText] = useState(""),
    [refunds, setRefunds] = useState<
      { id: string; status: string; reason: string; reference: string }[]
    >([]);
  const [tab, setTab] = useState("users"),
    [q, setQ] = useState(""),
    [offset, setOffset] = useState(0),
    [users, setUsers] = useState<Member[]>([]),
    [audit, setAudit] = useState<Audit[]>([]),
    [sales, setSales] = useState<Sale[]>([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [reservation, setReservation] = useState(""),
    [kind, setKind] = useState("tickets"),
    [from, setFrom] = useState(new Date().toISOString().slice(0, 8) + "01"),
    [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  async function load() {
    setBusy(true);
    setError("");
    try {
      if (tab === "changes")
        setRefunds(await api("/dashboard/admin/management/refunds"));
      if (tab === "users")
        setUsers(
          await api(
            `/dashboard/admin/management/users?q=${encodeURIComponent(q)}&offset=${offset}`,
          ),
        );
      if (tab === "audit")
        setAudit(
          await api(`/dashboard/admin/management/audit?offset=${offset}`),
        );
      if (tab === "sales")
        setSales(
          await api(
            `/dashboard/admin/management/sales-report?from=${from}&to=${to}`,
          ),
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, [tab, offset]);
  async function action(path: string, body: unknown) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
      setMessage(t("บันทึกแล้ว", "Saved"));
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function changeRole(u: Member, value: string) {
    setBusy(true);
    setError("");
    try {
      await api(`/dashboard/admin/users/${encodeURIComponent(u.id)}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: value }),
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function csv() {
    const rows = [
      ["Sailing", "Departure", "Seller", "Method", "Bookings", "Seats", "THB"],
      ...sales.map((s) => [
        s.sailing,
        s.departure,
        s.seller,
        s.method,
        s.bookings,
        s.seats,
        s.total / 100,
      ]),
    ];
    const safe = (v: unknown) =>
      '"' +
      String(v)
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((r) => r.map(safe).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "riverlife-sales.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="staff-workspace">
      <h1>{t("จัดการระบบและผู้ใช้", "System and user management")}</h1>
      <nav
        className="staff-form-actions"
        aria-label={t("เมนูจัดการ", "Management tabs")}
      >
        {[
          ["users", "ผู้ใช้", "Users"],
          ["changes", "ย้ายที่นั่ง / คืนเงิน", "Seat changes / refunds"],
          ["emails", "ส่งอีเมลใหม่", "Resend emails"],
          ["audit", "ประวัติการทำงาน", "Audit history"],
          ["sales", "รายงานยอดขาย", "Sales report"],
        ].map(([id, th, english]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id);
              setOffset(0);
              setError("");
              setMessage("");
            }}
          >
            {t(th, english)}
          </button>
        ))}
      </nav>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {tab === "users" && (
        <>
          <form
            className="staff-form-actions"
            onSubmit={(e) => {
              e.preventDefault();
              if (offset) setOffset(0);
              else void load();
            }}
          >
            <label>
              {t("ค้นหาชื่อหรืออีเมล", "Search name or email")}
              <input
                value={q}
                maxLength={200}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <button disabled={busy}>{t("ค้นหา", "Search")}</button>
          </form>
          {users.map((u) => {
            const locked =
              u.email === currentEmail ||
              u.role === "owner" ||
              (role !== "owner" && u.role === "admin");
            return (
              <article key={u.id} className="staff-panel">
                <h3>{u.name}</h3>
                <p>
                  {u.email} ·{" "}
                  {u.suspended
                    ? t("ระงับแล้ว", "Suspended")
                    : t("ใช้งานได้", "Active")}
                </p>
                <div className="staff-form-actions">
                  <label>
                    {t("บทบาท", "Role")}
                    <select
                      aria-label={`${t("สิทธิ์", "Role")} ${u.email}`}
                      disabled={busy || locked}
                      value={u.role}
                      onChange={(e) => void changeRole(u, e.target.value)}
                    >
                      {[
                        "user",
                        "sales",
                        "operator",
                        ...(role === "owner"
                          ? ["admin", "owner"]
                          : u.role === "admin"
                            ? ["admin"]
                            : []),
                        ...(u.role === "owner" && role !== "owner"
                          ? ["owner"]
                          : []),
                      ].map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    disabled={busy || locked}
                    onClick={() => {
                      if (
                        window.confirm(
                          t(
                            "ยืนยันเปลี่ยนสถานะบัญชี? เซสชันเดิมจะถูกยกเลิก",
                            "Change account status and revoke existing sessions?",
                          ),
                        )
                      )
                        void action(
                          `/dashboard/admin/management/users/${u.id}/action`,
                          { action: u.suspended ? "restore" : "suspend" },
                        );
                    }}
                  >
                    {u.suspended
                      ? t("เปิดบัญชีคืน", "Restore")
                      : t("ระงับบัญชี", "Suspend")}
                  </button>
                  <button
                    disabled={busy || locked}
                    onClick={() =>
                      void action(
                        `/dashboard/admin/management/users/${u.id}/action`,
                        { action: "logout" },
                      )
                    }
                  >
                    {t("ออกจากระบบทุกอุปกรณ์", "Sign out all devices")}
                  </button>
                  <button
                    disabled={busy || locked}
                    onClick={() =>
                      void action("/auth/password-reset/request", {
                        email: u.email,
                      })
                    }
                  >
                    {t("ส่ง OTP ตั้งรหัสผ่านใหม่", "Send password reset OTP")}
                  </button>
                </div>
              </article>
            );
          })}
        </>
      )}

      {tab === "changes" && (
        <section className="staff-panel">
          <h2>{t("ย้ายที่นั่ง / คืนเงิน", "Seat changes / refunds")}</h2>
          <label>
            {t("รหัสรายการจอง", "Reservation ID")}
            <input
              value={reservation}
              maxLength={24}
              onChange={(e) => setReservation(e.target.value)}
            />
          </label>
          <label>
            {t("เหตุผล", "Reason")}
            <input
              value={reason}
              maxLength={255}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <label>
            {t(
              "เก้าอี้ใหม่ คั่นด้วยจุลภาค เช่น U01:1,U01:2",
              "New seats separated by commas, e.g. U01:1,U01:2",
            )}
            <input
              value={seatText}
              onChange={(e) => setSeatText(e.target.value)}
            />
          </label>
          <p>
            {t(
              "ย้ายได้ในรอบเดิม ราคาเท่าเดิม และยังไม่เช็กอิน QR เก่าจะใช้ไม่ได้ ระบบส่งอีเมลชุดใหม่อัตโนมัติ",
              "Moves require the same sailing, same seat total and no check-in. Old QR codes are invalidated and updated emails are queued.",
            )}
          </p>
          <button
            disabled={
              busy || !reservation || reason.trim().length < 3 || !seatText
            }
            onClick={() => {
              if (
                confirm(
                  t(
                    "ยืนยันย้ายเก้าอี้และยกเลิก QR เดิม?",
                    "Move seats and invalidate old QR codes?",
                  ),
                )
              )
                void action(
                  "/dashboard/admin/management/reservations/" +
                    encodeURIComponent(reservation) +
                    "/move-seats",
                  {
                    reason,
                    seat_ids: seatText
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                );
            }}
          >
            {t("ย้ายเก้าอี้", "Move seats")}
          </button>
          {role !== "owner" && (
            <p>
              {t(
                "การคืนเงินต้องให้ Owner ดำเนินการ แอดมินดูประวัติคืนเงินด้านล่างได้ กรุณาส่งรหัสรายการและเหตุผลให้ Owner",
                "Only the Owner can issue refunds. Admins can review refund history below; send the reservation ID and reason to the Owner.",
              )}
            </p>
          )}
          {role === "owner" && (
            <>
              <p>
                {t(
                  "คืนเต็มจำนวนผ่าน Omise Sandbox เท่านั้น ยกเลิกสิทธิ์ขึ้นเรือหลังยืนยันคืนสำเร็จ หากผลไม่แน่นอนให้ตรวจสถานะจากรายการนี้ ระบบจะไม่สั่งคืนเงินซ้ำ",
                  "Full refunds through Omise Sandbox only. Tickets are invalidated after refund confirmation. Unknown outcomes are reconciled without a second refund request.",
                )}
              </p>
              <button
                disabled={busy || !reservation || reason.trim().length < 3}
                onClick={() => {
                  if (
                    confirm(
                      t(
                        "ยืนยันคืนเต็มจำนวนและยกเลิกการจองผ่าน Sandbox?",
                        "Refund the full amount and cancel this Sandbox reservation?",
                      ),
                    )
                  )
                    void action(
                      "/dashboard/owner/cruises/reservations/" +
                        encodeURIComponent(reservation) +
                        "/refund",
                      { reason },
                    );
                }}
              >
                {t("คืนเงิน / ตรวจผลคืนเงิน", "Refund / reconcile refund")}
              </button>
            </>
          )}
          {refunds.map((r) => (
            <p key={r.id}>
              {r.id} · {r.status} · {r.reason} · {r.reference}
            </p>
          ))}
        </section>
      )}
      {tab === "emails" && (
        <form
          className="staff-panel"
          onSubmit={(e) => {
            e.preventDefault();
            void action(
              `/dashboard/admin/management/reservations/${encodeURIComponent(reservation)}/resend`,
              { kind },
            );
          }}
        >
          <h2>{t("ส่งอีเมลเดิมอีกครั้ง", "Resend original email")}</h2>
          <p>
            {t(
              "ส่งไปผู้รับเดิม ใช้ตั๋วรหัสเดิม ไม่ออกตั๋วใหม่ ส่งซ้ำหลังส่งสำเร็จได้เมื่อพ้น 1 นาที",
              "Uses the original recipient and ticket IDs. Wait one minute after delivery before resending.",
            )}
          </p>
          <label>
            {t("รหัสรายการจอง", "Reservation ID")}
            <input
              required
              maxLength={24}
              value={reservation}
              onChange={(e) => setReservation(e.target.value)}
            />
          </label>
          <label>
            {t("ชนิดอีเมล", "Email type")}
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="tickets">{t("ตั๋วเรือ", "Tickets")}</option>
              <option value="booking">
                {t("รายละเอียดการจอง", "Booking details")}
              </option>
            </select>
          </label>
          <button disabled={busy}>{t("เข้าคิวส่งใหม่", "Queue resend")}</button>
        </form>
      )}
      {tab === "audit" && (
        <>
          <h2>{t("ประวัติการทำงาน", "Audit history")}</h2>
          {audit.map((a) => (
            <article className="staff-panel" key={a.id}>
              <p>
                {new Date(a.at).toLocaleString(en ? "en-GB" : "th-TH")} ·{" "}
                {a.actor}
              </p>
              <p>
                {a.action} · {a.target}
              </p>
            </article>
          ))}
        </>
      )}
      {tab === "sales" && (
        <>
          <form
            className="staff-form-actions"
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
          >
            <label>
              {t("ตั้งแต่วันที่สร้างรายการ", "Created from")}
              <input
                type="date"
                required
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              {t("ถึงวันที่", "Through")}
              <input
                type="date"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button disabled={busy}>{t("ดูยอดขาย", "View sales")}</button>
            <button type="button" disabled={!sales.length} onClick={csv}>
              {t("ส่งออก CSV", "Export CSV")}
            </button>
          </form>
          <p>
            {t(
              "ยอดยืนยันตามวันที่สร้างรายการ เวลาไทย ไม่ใช่ยอดรับเงินสุทธิหลังค่าธรรมเนียม จำกัด 1,000 กลุ่มต่อครั้ง",
              "Confirmed bookings by creation date in Bangkok time; not net settlement after fees. Up to 1,000 groups per query.",
            )}
          </p>
          {sales.map((s, i) => (
            <article className="staff-panel" key={i}>
              <h3>{s.sailing}</h3>
              <p>
                {new Date(s.departure).toLocaleString()} · {s.seller} ·{" "}
                {s.method}
              </p>
              <p>
                {s.bookings} {t("รายการ", "bookings")} · {s.seats}{" "}
                {t("คน", "guests")} · {money(s.total)}
              </p>
            </article>
          ))}
        </>
      )}
      {["users", "audit"].includes(tab) && (
        <div className="staff-form-actions">
          <button
            disabled={busy || offset === 0}
            onClick={() => setOffset(Math.max(0, offset - 50))}
          >
            {t("ก่อนหน้า", "Previous")}
          </button>
          <span>
            {offset + 1}–
            {offset + (tab === "users" ? users.length : audit.length)}
          </span>
          <button
            disabled={
              busy || (tab === "users" ? users.length : audit.length) < 50
            }
            onClick={() => setOffset(offset + 50)}
          >
            {t("ถัดไป", "Next")}
          </button>
        </div>
      )}
    </section>
  );
}
