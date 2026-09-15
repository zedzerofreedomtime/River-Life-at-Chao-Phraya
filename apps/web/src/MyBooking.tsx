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
  onOpenTickets?: (booking: Booking) => void;
}) {
  const [b, setB] = useState(initial),
    [id, setId] = useState(
      initial?.id ?? sessionStorage.getItem("riverlife.booking.id") ?? "",
    ),
    [token, setToken] = useState(
      initialToken || sessionStorage.getItem("riverlife.booking.token") || "",
    ),
    [proof, setProof] = useState<File | null>(null),
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
  async function uploadProof() {
    if (!b || !proof) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("slip", proof);
      const updated = await api<Booking>(
        `/bookings/${b.id}/slip`,
        { method: "POST", body: form },
        token,
      );
      setB(updated);
      setProof(null);
      if (updated.status === "confirmed") onOpenTickets?.(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="content-panel">
      <div className="orders-heading">
        <div>
          <h1>คำสั่งซื้อของฉัน</h1>
          <p>ตรวจสอบสถานะการชำระเงินและรายละเอียดคำสั่งซื้อ</p>
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
          {b.status === "held" && (
            <section
              className="order-proof-upload"
              aria-label="แนบสลิปการชำระเงิน"
            >
              <h3>แนบสลิปการชำระเงิน</h3>
              <p>
                ระบบ AI จะอ่านยอดเงินและรายละเอียดที่มองเห็น ตรวจสลิปซ้ำ
                และประเมินความผิดปกติก่อนออก QR Ticket
              </p>
              {b.verification.status && (
                <Alert
                  severity={
                    b.verification.status === "pass"
                      ? "success"
                      : b.verification.status === "suspicious"
                        ? "warning"
                        : "error"
                  }
                >
                  <strong>
                    {b.verification.status === "suspicious"
                      ? "สลิปนี้ตรวจไม่ผ่านแบบอัตโนมัติ"
                      : "ไม่สามารถยืนยันสลิปนี้ได้"}
                  </strong>
                  {b.verification.reason && ` — ${b.verification.reason}`}
                  <small className="slip-risk-score">
                    คะแนนความเสี่ยง {b.verification.score}/100
                  </small>
                </Alert>
              )}
              <Button component="label" variant="outlined" disabled={busy}>
                {proof ? "เปลี่ยนรูปสลิป" : "เลือกรูปสลิป"}
                <input
                  hidden
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) => {
                    const next = event.target.files?.[0] ?? null;
                    if (next && next.size > 5 * 1024 * 1024) {
                      setProof(null);
                      setError("รูปสลิปต้องมีขนาดไม่เกิน 5 MB");
                      return;
                    }
                    setProof(next);
                  }}
                />
              </Button>
              <small className={proof ? "selected" : ""}>
                {proof ? `เลือกแล้ว: ${proof.name}` : "ยังไม่ได้เลือกรูปสลิป"}
              </small>
              <Button
                variant="contained"
                disabled={busy || !proof}
                onClick={() => void uploadProof()}
              >
                {busy ? "กำลังตรวจสลิปด้วย AI…" : "ตรวจสลิปและรับ QR"}
              </Button>
              <small>
                ผลการตรวจภาพไม่ใช่การยืนยันว่าเงินเข้าบัญชีผู้รับแล้ว
              </small>
            </section>
          )}
          {b.status === "review" && (
            <Alert severity="info">ระบบกำลังออก QR Ticket ให้คุณ</Alert>
          )}
          {b.status === "confirmed" && (
            <div className="order-success">
              <div>
                <strong>ยืนยันการจองแล้ว</strong>
                <span>บัตรอิเล็กทรอนิกส์ {b.tickets.length} ใบพร้อมใช้งาน</span>
              </div>
              <Button variant="contained" onClick={() => onOpenTickets?.(b)}>
                ไปที่บัตรของฉัน
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
