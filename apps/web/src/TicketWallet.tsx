import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Ticket } from "lucide-react";
import { api, labels, type Booking } from "./api";

type Props = { initial: Booking | null; initialToken: string };

export default function TicketWallet({ initial, initialToken }: Props) {
  const [booking, setBooking] = useState<Booking | null>(initial);
  const [id, setId] = useState(
    initial?.id ?? sessionStorage.getItem("riverlife.booking.id") ?? "",
  );
  const [token, setToken] = useState(
    initialToken || sessionStorage.getItem("riverlife.booking.token") || "",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(0);
  const load = async () => {
    if (!id || !token) return;
    setBusy(true);
    setError("");
    try {
      setBooking(
        await api<Booking>(`/bookings/${encodeURIComponent(id)}`, {}, token),
      );
      setSelected(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!initial && id && token) void load();
  }, []);
  const tickets = booking?.tickets ?? [];
  const active = tickets[selected];
  return (
    <section className="wallet-shell">
      <div className="wallet-heading">
        <div>
          <h1>บัตรของฉัน</h1>
          <p>ตรวจสอบบัตรและแสดง QR ที่จุดเช็กอิน</p>
        </div>
      </div>
      <div className="access-panel">
        <TextField
          label="รหัสคำสั่งซื้อ"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
        <TextField
          label="รหัสเข้าถึงส่วนตัว"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <Button
          variant="outlined"
          onClick={load}
          disabled={busy || !id || !token}
        >
          เปิดบัตรของฉัน
        </Button>
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      {booking && (
        <>
          <div className="wallet-tabs">
            <span className={booking.status === "confirmed" ? "active" : ""}>
              บัตรที่ใช้งานได้ ({tickets.filter((t) => !t.checked_in_at).length}
              )
            </span>
            <span>รอตรวจสอบ ({booking.status === "review" ? 1 : 0})</span>
            <span>
              ใช้แล้ว ({tickets.filter((t) => t.checked_in_at).length})
            </span>
          </div>
          {booking.status !== "confirmed" ? (
            <Alert severity="info">
              คำสั่งซื้อ {booking.id} อยู่ในสถานะ: {labels[booking.status]}. QR
              จะปรากฏหลังยืนยันการชำระเงิน
            </Alert>
          ) : (
            <div className="wallet-layout">
              <div className="ticket-list">
                <div className="wallet-order-head">
                  <div>
                    <strong>Concert on the River</strong>
                    <span>ICONSIAM · 19:00</span>
                  </div>
                  <span>คำสั่งซื้อ #{booking.id}</span>
                </div>
                {tickets.map((ticket, index) => (
                  <button
                    key={ticket.id}
                    className={`wallet-ticket ${selected === index ? "selected" : ""}`}
                    onClick={() => setSelected(index)}
                  >
                    <Ticket size={24} />
                    <span>
                      <small>
                        บัตร {index + 1} จาก {tickets.length}
                      </small>
                      <strong>โซน {booking.zone_id}</strong>
                      <em>Concert on the River · ICONSIAM 19:00</em>
                    </span>
                    <b>{ticket.checked_in_at ? "ใช้แล้ว" : "แสดง QR"}</b>
                  </button>
                ))}
              </div>
              {active && (
                <aside className="qr-ticket">
                  <span className="ticket-state">
                    <CheckCircle2 size={16} />
                    {active.checked_in_at ? "เช็กอินแล้ว" : "ใช้งานได้"}
                  </span>
                  <h2>โซน {booking.zone_id}</h2>
                  <p>
                    Concert on the River
                    <br />
                    ICONSIAM · 19:00
                  </p>
                  <QRCodeSVG value={active.id} size={204} />
                  <p className="qr-note">
                    แสดง QR Code นี้ที่จุด Check-in
                    <br />
                    หนึ่ง QR ใช้เข้าเรือได้หนึ่งครั้ง
                  </p>
                  <dl>
                    <div>
                      <dt>หมายเลขบัตร</dt>
                      <dd>{active.id.slice(0, 14).toUpperCase()}</dd>
                    </div>
                    <div>
                      <dt>หมายเลขคำสั่งซื้อ</dt>
                      <dd>#{booking.id}</dd>
                    </div>
                    <div>
                      <dt>สถานะ</dt>
                      <dd>
                        {active.checked_in_at ? "เช็กอินแล้ว" : "ใช้งานได้"}
                      </dd>
                    </div>
                  </dl>
                </aside>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
