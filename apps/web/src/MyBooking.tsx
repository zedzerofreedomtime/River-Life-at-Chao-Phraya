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
  const [id, setID] = useState(
    initial?.id ?? sessionStorage.getItem("riverlife.booking.id") ?? "",
  );
  const [token, setToken] = useState(
    initialToken || sessionStorage.getItem("riverlife.booking.token") || "",
  );
  const [attachment, setAttachment] = useState<File | null>(null);
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

  const upload = async () => {
    if (!booking || !attachment) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("attachment", attachment);
      const updated = await api<Booking>(
        `/bookings/${booking.id}/attachment`,
        { method: "POST", body: form },
        token,
      );
      setBooking(updated);
      setAttachment(null);
      onOpenTickets?.(updated);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const chooseAttachment = (next: File | null) => {
    if (next && next.size > 5 * 1024 * 1024) {
      setAttachment(null);
      setError("รูปต้องมีขนาดไม่เกิน 5 MB");
      return;
    }
    setError("");
    setAttachment(next);
  };

  return (
    <section className="content-panel">
      <div className="orders-heading">
        <h1>คำสั่งซื้อของฉัน</h1>
        <p>แนบรูปประกอบการจอง แล้วรับ QR Ticket</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          label="รหัสการจอง"
          value={id}
          onChange={(event) => {
            setID(event.target.value);
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
      {error && <Alert severity="error">{error}</Alert>}
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
          </Alert>
          <details className="access-code">
            <summary>แสดงรหัสเข้าถึงสำหรับเก็บรักษา</summary>
            <code className="break-all">{token}</code>
          </details>
          {booking.status === "held" && (
            <section
              className="order-attachment"
              aria-label="แนบรูปประกอบการจอง"
            >
              <span>ขั้นตอนที่ 2</span>
              <h3>แนบรูปประกอบการจอง</h3>
              <p>
                รองรับ PNG หรือ JPG ไม่เกิน 5 MB
                ระบบรับไฟล์ไว้เป็นหลักฐานเท่านั้น ไม่ตรวจสลิป ไม่ตรวจธุรกรรม
                และไม่วิเคราะห์ภาพ
              </p>
              <Button component="label" variant="outlined" disabled={busy}>
                {attachment ? "เปลี่ยนรูป" : "เลือกรูป"}
                <input
                  hidden
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) =>
                    chooseAttachment(event.target.files?.[0] ?? null)
                  }
                />
              </Button>
              <small className={attachment ? "selected" : ""}>
                {attachment
                  ? `เลือกแล้ว: ${attachment.name}`
                  : "ยังไม่ได้เลือกรูป"}
              </small>
              <Button
                variant="contained"
                disabled={busy || !attachment}
                onClick={() => void upload()}
              >
                {busy ? "กำลังส่งรูป…" : "ส่งรูปและรับ QR Ticket"}
              </Button>
            </section>
          )}
          {booking.status === "confirmed" && (
            <div className="order-success">
              <div>
                <strong>รับรูปเรียบร้อยแล้ว</strong>
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
          )}
          {booking.status !== "held" && booking.status !== "confirmed" && (
            <Alert severity="info" sx={{ mt: 2 }}>
              คำสั่งซื้อนี้อยู่ในสถานะ {labels[booking.status]}
            </Alert>
          )}
        </div>
      )}
    </section>
  );
}
