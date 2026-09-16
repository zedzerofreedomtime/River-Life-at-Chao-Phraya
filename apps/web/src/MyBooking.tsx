import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { api, labels, money, type Booking } from "./api";

export default function MyBooking({
  initial,
  initialToken,
  onOpenTickets,
}: {
  initial: Booking | null;
  initialToken: string;
  onOpenTickets?: (booking: Booking) => void;
}) {
  const [booking, setBooking] = useState(initial);
  const [id, setId] = useState(
    initial?.id ?? sessionStorage.getItem("riverlife.booking.id") ?? "",
  );
  const [token, setToken] = useState(
    initialToken || sessionStorage.getItem("riverlife.booking.token") || "",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const latest = await api<Booking>(
        `/bookings/${encodeURIComponent(id)}`,
        {},
        token,
      );
      setBooking(latest);
      sessionStorage.setItem("riverlife.booking.id", latest.id);
      sessionStorage.setItem("riverlife.booking.token", token);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const savedID =
      initial?.id || sessionStorage.getItem("riverlife.booking.id");
    const savedToken =
      initialToken || sessionStorage.getItem("riverlife.booking.token");
    if (!savedID || !savedToken) return;
    void api<Booking>(
      `/bookings/${encodeURIComponent(savedID)}`,
      {},
      savedToken,
    )
      .then(setBooking)
      .catch((cause: Error) => setError(cause.message));
  }, [initial?.id, initialToken]);

  return (
    <section className="content-panel">
      <div className="orders-heading">
        <h1>คำสั่งซื้อของฉัน</h1>
        <p>ตรวจสอบรายละเอียดการจอง และเปิด QR Ticket ของคุณ</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          label="รหัสการจอง"
          value={id}
          onChange={(event) => {
            setId(event.target.value);
            setBooking(null);
          }}
        />
        <TextField
          label="รหัสเข้าถึงส่วนตัว"
          type="password"
          value={token}
          onChange={(event) => {
            setToken(event.target.value);
            setBooking(null);
          }}
        />
        <Button
          variant="outlined"
          onClick={() => void load()}
          disabled={busy || !id || !token}
        >
          เปิดคำสั่งซื้อ
        </Button>
      </div>
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {booking && (
        <div className="booking-detail">
          <div className="order-status-bar">
            <h3>
              โซน {booking.zone_id} · {booking.quantity} ใบ ·{" "}
              {money(booking.total)}
            </h3>
            <strong>{labels[booking.status]}</strong>
          </div>
          <p className="order-person">
            ผู้สั่งซื้อ: {booking.name} · {booking.email}
          </p>
          <Alert severity="info">
            เก็บรหัสการจองและรหัสเข้าถึงนี้ไว้เพื่อเปิดบัตรจากเครื่องอื่น
            อย่าส่งรหัสเข้าถึงให้บุคคลอื่น
          </Alert>
          <details className="my-4">
            <summary>แสดงรหัสเข้าถึงสำหรับเก็บรักษา</summary>
            <code className="break-all">{token}</code>
          </details>
          {booking.status === "confirmed" ? (
            <div className="order-success">
              <div>
                <strong>จองสำเร็จแล้ว</strong>
                <span>
                  QR Ticket จำนวน {booking.tickets.length} ใบพร้อมใช้งาน
                </span>
              </div>
              <Button
                variant="contained"
                onClick={() => onOpenTickets?.(booking)}
              >
                เปิดบัตรของฉัน
              </Button>
            </div>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              คำสั่งซื้อนี้อยู่ในสถานะ {labels[booking.status]}
            </Alert>
          )}
        </div>
      )}
    </section>
  );
}
