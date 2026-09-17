import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { BarChart3, Clock3, TicketCheck, Users } from "lucide-react";
import { api, labels, money, type AdminDashboardData } from "./api";

const number = (value: number) => new Intl.NumberFormat("th-TH").format(value);

export default function AdminDashboard() {
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
          <h1 id="admin-dashboard-title">ภาพรวมผู้ดูแลระบบ</h1>
          <p>ข้อมูลคำสั่งซื้อ สมาชิก และโควตาเรือทั้งหมดในระบบ</p>
        </div>
        <Button
          variant="outlined"
          onClick={() => void load()}
          disabled={loading}
        >
          โหลดข้อมูลล่าสุด
        </Button>
      </div>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {loading && !data ? (
        <p role="status">กำลังโหลดข้อมูลผู้ดูแลระบบ…</p>
      ) : null}
      {data ? (
        <>
          <div className="admin-stat-grid">
            <Metric
              icon={BarChart3}
              label="คำสั่งซื้อทั้งหมด"
              value={number(data.booking_count)}
            />
            <Metric
              icon={TicketCheck}
              label="บัตรที่ออกแล้ว"
              value={`${number(data.confirmed_tickets)} ใบ`}
            />
            <Metric
              icon={Users}
              label="สมาชิกทั้งหมด"
              value={number(data.member_count)}
            />
            <Metric
              icon={Clock3}
              label="ยอดขายที่ยืนยัน"
              value={money(data.confirmed_revenue)}
            />
          </div>
          <section
            className="admin-zone-panel"
            aria-labelledby="admin-zone-title"
          >
            <div>
              <h2 id="admin-zone-title">สถานะโควตาเรือ</h2>
              <p>
                รายการพักชำระเงินที่ยังไม่หมดเวลา {number(data.active_holds)}{" "}
                รายการ
              </p>
            </div>
            <div className="admin-zone-grid">
              {data.zones.map((zone) => (
                <article key={zone.id}>
                  <strong>{zone.name}</strong>
                  <span>
                    {number(zone.available)} / {number(zone.capacity)} ที่ว่าง
                  </span>
                  <small>{money(zone.price)} / ใบ</small>
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
                <h2 id="admin-bookings-title">คำสั่งซื้อทั้งหมด</h2>
                <p>แสดง 200 รายการล่าสุด พร้อมข้อมูลการจองและสถานะ</p>
              </div>
              <strong>{number(data.bookings.length)} รายการ</strong>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>รหัสคำสั่งซื้อ</th>
                    <th>ผู้จอง</th>
                    <th>โซน</th>
                    <th>จำนวน</th>
                    <th>ยอดรวม</th>
                    <th>สถานะ</th>
                    <th>จัดการ</th>
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
                      <td>{number(booking.quantity)} ใบ</td>
                      <td>{money(booking.total)}</td>
                      <td>
                        <span
                          className={`admin-status status-${booking.status}`}
                        >
                          {labels[booking.status] ?? booking.status}
                        </span>
                      </td>
                      <td>
                        {booking.status === "held" ||
                        booking.status === "confirmed" ? (
                          <Button
                            color="error"
                            size="small"
                            onClick={() => setCancelTarget(booking)}
                          >
                            ยกเลิกการจอง
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
                <p className="admin-empty">ยังไม่มีคำสั่งซื้อในระบบ</p>
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
          ยืนยันการยกเลิกการจอง
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            ยกเลิกคำสั่งซื้อของ {cancelTarget?.name} แล้วโควตา{" "}
            {cancelTarget?.quantity ?? 0} ใบจะกลับเข้าสู่ระบบทันที
            การดำเนินการนี้ไม่คืนเงินอัตโนมัติ
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)} disabled={cancelling}>
            กลับ
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void cancelBooking()}
            disabled={cancelling}
          >
            ยืนยันการยกเลิก
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
