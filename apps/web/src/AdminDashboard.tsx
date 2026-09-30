import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { BarChart3, Clock3, TicketCheck, Users } from "lucide-react";
import { api, money, statusLabel, zoneLabel, type AdminDashboardData } from "./api";
import type { Language } from "./i18n";

const number = (value: number) => new Intl.NumberFormat("th-TH").format(value);

export default function AdminDashboard({ language }: { language: Language }) {
  const en = language === "en";
  const tr = (th: string, english: string) => en ? english : th;
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<
    AdminDashboardData["bookings"][number] | null
  >(null);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api<AdminDashboardData>("/dashboard/admin"));
    } catch (cause) {
      setData(null);
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);
  const cancelBooking = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setError("");
    try {
      await api<void>(`/dashboard/admin/bookings/${cancelTarget.id}/cancel`, {
        method: "POST",
      });
      setCancelTarget(null);
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <section
      className="admin-dashboard"
      aria-labelledby="admin-dashboard-title"
    >
      <div className="admin-dashboard-heading">
        <div>
          <span>RIVER LIFE · ADMIN</span>
          <h1 id="admin-dashboard-title">{tr("ภาพรวมผู้ดูแลระบบ", "Admin overview")}</h1>
          <p>{tr("ข้อมูลคำสั่งซื้อ สมาชิก และโควตาเรือทั้งหมดในระบบ", "Bookings, members, and ticket availability")}</p>
        </div>
        <Button
          variant="outlined"
          onClick={() => void load()}
          disabled={loading}
        >
          {tr("โหลดข้อมูลล่าสุด", "Refresh")}
        </Button>
      </div>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {loading && !data ? (
        <p role="status">{tr("กำลังโหลดข้อมูลผู้ดูแลระบบ…", "Loading dashboard…")}</p>
      ) : null}
      {data ? (
        <>
          <div className="admin-stat-grid">
            <Metric
              icon={BarChart3}
              label={tr("คำสั่งซื้อทั้งหมด", "Total bookings")}
              value={number(data.booking_count)}
            />
            <Metric
              icon={TicketCheck}
              label={tr("บัตรที่ออกแล้ว", "Tickets issued")}
              value={`${number(data.confirmed_tickets)} ${tr("ใบ", "tickets")}`}
            />
            <Metric
              icon={Users}
              label={tr("สมาชิกทั้งหมด", "Members")}
              value={number(data.member_count)}
            />
            <Metric
              icon={Clock3}
              label={tr("ยอดขายที่ยืนยัน", "Confirmed sales")}
              value={money(data.confirmed_revenue)}
            />
          </div>
          <section
            className="admin-zone-panel"
            aria-labelledby="admin-zone-title"
          >
            <div>
              <h2 id="admin-zone-title">{tr("สถานะโควตาเรือ", "Ticket availability")}</h2>
              <p>
                {tr("รายการพักชำระเงินที่ยังไม่หมดเวลา", "Active payment holds")}: {number(data.active_holds)}
              </p>
            </div>
            <div className="admin-zone-grid">
              {data.zones.map((zone) => (
                <article key={zone.id}>
                  <strong>{zoneLabel(zone, language)}</strong>
                  <span>
                    {number(zone.available)} / {number(zone.capacity)} {tr("ที่ว่าง", "available")}
                  </span>
                  <small>{money(zone.price)} / {tr("ใบ", "ticket")}</small>
                </article>
              ))}
            </div>
          </section>
          <section
            className="admin-bookings-panel"
            aria-labelledby="admin-bookings-title"
          >
            <div className="admin-panel-heading">
              <div>
                <h2 id="admin-bookings-title">{tr("คำสั่งซื้อทั้งหมด", "Bookings")}</h2>
                <p>{tr("แสดง 200 รายการล่าสุด พร้อมข้อมูลการจองและสถานะ", "Latest 200 bookings, with customer and status details")}</p>
              </div>
              <strong>{number(data.bookings.length)} {tr("รายการ", "bookings")}</strong>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{tr("รหัสคำสั่งซื้อ", "Order ID")}</th>
                    <th>{tr("ผู้จอง", "Customer")}</th>
                    <th>{tr("โซน", "Zone")}</th>
                    <th>{tr("จำนวน", "Quantity")}</th>
                    <th>{tr("ยอดรวม", "Total")}</th>
                    <th>{tr("สถานะ", "Status")}</th>
                    <th>{tr("ยินยอมการตลาด", "Marketing consent")}</th>
                    <th>{tr("จัดการ", "Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        <code>{booking.id}</code>
                      </td>
                      <td>
                        <strong>{booking.name}</strong>
                        <small>{booking.email}</small>
                      </td>
                      <td>{booking.zone_id}</td>
                      <td>{number(booking.quantity)} {tr("ใบ", "tickets")}</td>
                      <td>{money(booking.total)}</td>
                      <td>
                        <span
                          className={`admin-status status-${booking.status}`}
                        >
                          {statusLabel(booking.status, language)}
                        </span>
                      </td>
                      <td>{booking.marketing_consent_at ? <><span>{new Date(booking.marketing_consent_at).toLocaleString(en ? "en-GB" : "th-TH")}</span><small>{booking.marketing_consent_version} · {booking.marketing_consent_language.toUpperCase()}</small></> : tr("ไม่มีหลักฐานการยินยอม", "No consent recorded")}</td>
                      <td>
                        {booking.status === "held" ||
                        booking.status === "confirmed" ? (
                          <Button
                            color="error"
                            size="small"
                            onClick={() => setCancelTarget(booking)}
                          >
                            {tr("ยกเลิกการจอง", "Cancel booking")}
                          </Button>
                        ) : (
                          <span className="admin-action-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.bookings.length === 0 ? (
                <p className="admin-empty">{tr("ยังไม่มีคำสั่งซื้อในระบบ", "No bookings yet")}</p>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
      <Dialog
        open={cancelTarget !== null}
        onClose={() => !cancelling && setCancelTarget(null)}
        aria-labelledby="cancel-booking-title"
      >
        <DialogTitle id="cancel-booking-title">
          {tr("ยืนยันการยกเลิกการจอง", "Cancel this booking?")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {en
              ? `Cancel ${cancelTarget?.name}'s booking? ${cancelTarget?.quantity ?? 0} tickets will become available immediately. This does not automatically issue a refund.`
              : `ยกเลิกคำสั่งซื้อของ ${cancelTarget?.name} แล้วโควตา ${cancelTarget?.quantity ?? 0} ใบจะกลับเข้าสู่ระบบทันที การดำเนินการนี้ไม่คืนเงินอัตโนมัติ`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)} disabled={cancelling}>
            {tr("กลับ", "Back")}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void cancelBooking()}
            disabled={cancelling}
          >
            {tr("ยืนยันการยกเลิก", "Confirm cancellation")}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <article className="admin-stat">
      <span>
        <Icon aria-hidden="true" size={23} />
      </span>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
