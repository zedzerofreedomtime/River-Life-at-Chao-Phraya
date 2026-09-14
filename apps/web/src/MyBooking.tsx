import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import { api, labels, money, type Booking } from "./api";
export default function MyBooking({
  initial,
  initialToken,
  onOpenTickets,
}: {
  initial: Booking | null;
  initialToken: string;
  onOpenTickets?: () => void;
}) {
  const [b, setB] = useState(initial),
    [id, setId] = useState(
      initial?.id ?? sessionStorage.getItem("riverlife.booking.id") ?? "",
    ),
    [token, setToken] = useState(
      initialToken || sessionStorage.getItem("riverlife.booking.token") || "",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const latest = await api<Booking>(
        `/bookings/${encodeURIComponent(id)}`,
        {},
        token,
      );
      setB(latest);
      sessionStorage.setItem("riverlife.booking.id", latest.id);
      sessionStorage.setItem("riverlife.booking.token", token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    const savedId =
      initial?.id || sessionStorage.getItem("riverlife.booking.id");
    const savedToken =
      initialToken || sessionStorage.getItem("riverlife.booking.token");
    if (!savedId || !savedToken) return;
    let active = true;
    api<Booking>(`/bookings/${encodeURIComponent(savedId)}`, {}, savedToken)
      .then((latest) => {
        if (active) setB(latest);
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [initial?.id, initialToken]);
  return (
    <section className="content-panel">
      <div className="orders-heading">
        <div>
          <h1>คำสั่งซื้อของฉัน</h1>
          <p>ตรวจสอบสถานะและรายละเอียดคำสั่งซื้อ</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          label="รหัสการจอง"
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setB(null);
          }}
        />
        <TextField
          label="รหัสเข้าถึงส่วนตัว"
          type="password"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            setB(null);
          }}
        />
        <Button
          variant="outlined"
          onClick={load}
          disabled={busy || !id || !token}
        >
          ตรวจสอบ / อัปเดตสถานะ
        </Button>
      </div>
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {b && (
        <div className="booking-detail">
          <div className="order-status-bar">
            <h3>
              โซน {b.zone_id} · {b.quantity} ใบ · {money(b.total)}
            </h3>
            <strong>{labels[b.status]}</strong>
          </div>
          <p className="order-person">
            ผู้สั่งซื้อ: {b.name} · {b.email}
          </p>
          <Alert severity="info">
            เก็บรหัสการจองและรหัสเข้าถึงนี้ไว้เพื่อเปิดบัตรจากเครื่องอื่น
            อย่าส่งรหัสเข้าถึงให้บุคคลอื่น
          </Alert>
          <details className="my-4">
            <summary>แสดงรหัสเข้าถึงสำหรับเก็บรักษา</summary>
            <code className="break-all">{token}</code>
          </details>
          {b.status === "review" && (
            <Alert severity="info">ระบบกำลังออก QR Ticket ให้คุณ</Alert>
          )}
          {b.status === "confirmed" && (
            <div className="order-success">
              <div>
                <strong>ยืนยันการจองแล้ว</strong>
                <span>บัตรอิเล็กทรอนิกส์ {b.tickets.length} ใบพร้อมใช้งาน</span>
              </div>
              <Button variant="contained" onClick={onOpenTickets}>
                ไปที่บัตรของฉัน
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
