import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { BarChart3, Clock3, TicketCheck, Users } from "lucide-react";
import { api, labels, money, type AdminDashboardData } from "./api";

const number = (value: number) => new Intl.NumberFormat("th-TH").format(value);

export default function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
