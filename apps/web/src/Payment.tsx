import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { CheckCircle2, Clock3, QrCode } from "lucide-react";
import { api, money, type Booking } from "./api";

export default function Payment({
  initial,
  initialToken,
  onCompleted,
  onBackToZones,
}: {
  initial: Booking | null;
  initialToken: string;
  onCompleted: (booking: Booking) => void;
  onBackToZones: () => void;
}) {
  const [booking, setBooking] = useState(initial);
  const [token] = useState(
    initialToken || sessionStorage.getItem("riverlife.booking.token") || "",
  );
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = initial?.id || sessionStorage.getItem("riverlife.booking.id");
    if (!id || !token) return;
    void api<Booking>(`/bookings/${encodeURIComponent(id)}`, {}, token)
      .then(setBooking)
      .catch((cause: Error) => setError(cause.message));
  }, [initial?.id, token]);

  const chooseAttachment = (file: File | null) => {
    if (file && file.size > 5 * 1024 * 1024) {
      setAttachment(null);
      setError("รูปต้องมีขนาดไม่เกิน 5 MB");
      return;
    }
    setError("");
    setAttachment(file);
  };

  const completePayment = async () => {
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
      onCompleted(updated);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!booking) {
    return (
      <section className="flow-page flow-empty">
        <h1>ไม่พบรายการชำระเงิน</h1>
        <p>เริ่มเลือกคอนเสิร์ตและโซนบัตรใหม่ เพื่อสร้างรายการซื้อบัตร</p>
        <Button variant="contained" onClick={onBackToZones}>
          กลับไปเลือกโซน
        </Button>
      </section>
    );
  }

  if (booking.status === "confirmed") {
    return (
      <section className="flow-page flow-empty">
        <h1>รายการนี้ชำระเงินแล้ว</h1>
        <p>QR Ticket ของคุณพร้อมใช้งานแล้ว</p>
        <Button variant="contained" onClick={() => onCompleted(booking)}>
          ไปหน้าทำรายการสำเร็จ
        </Button>
      </section>
    );
  }

  return (
    <section className="flow-page payment-page">
      <FlowSteps activeStep={2} />
      <button className="back-link" onClick={onBackToZones} disabled={busy}>
        ← กลับไปเลือกโซน
      </button>
      <div className="flow-heading">
        <h1>ชำระเงิน</h1>
        <p>สแกน QR เพื่อโอนตามยอด แล้วแนบรูปหลักฐานเพื่อจบรายการ</p>
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      <div className="payment-layout">
        <article className="payment-instructions">
          <span>ขั้นตอนที่ 1</span>
          <h2>สแกน QR เพื่อชำระเงิน</h2>
          <p>โอนเงินตามยอดคำสั่งซื้อนี้ แล้วกลับมาแนบรูปหลักฐานด้านขวา</p>
          <strong className="payment-amount">{money(booking.total)}</strong>
          <small>
            <Clock3 aria-hidden="true" size={16} /> สำรองสิทธิ์ถึง{" "}
            {new Date(booking.expires_at).toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            น.
          </small>
          <div className="payment-order-summary">
            <span>คำสั่งซื้อ</span>
            <b>#{booking.id.toUpperCase()}</b>
            <span>โซน / จำนวน</span>
            <b>
              {booking.zone_id} / {booking.quantity} ใบ
            </b>
          </div>
        </article>
        <aside className="payment-qr-card">
          <img src="/images/payment/promptpay-qr.png" alt="QR สำหรับชำระเงิน" />
          <QrCode aria-hidden="true" size={20} />
          <strong>สแกนด้วยแอปธนาคาร</strong>
          <small>ตรวจสอบชื่อผู้รับและยอดเงินก่อนยืนยัน</small>
        </aside>
      </div>
      <section className="payment-proof">
        <span>ขั้นตอนที่ 2</span>
        <h2>แนบหลักฐานการชำระเงิน</h2>
        <p>รองรับ PNG หรือ JPG ไม่เกิน 5 MB เพื่อยืนยันรายการในระบบทดลอง</p>
        <div className="proof-actions">
          <Button component="label" variant="outlined" disabled={busy}>
            {attachment ? "เปลี่ยนรูป" : "เลือกรูปหลักฐาน"}
            <input
              hidden
              type="file"
              accept="image/png,image/jpeg"
              onChange={(event) =>
                chooseAttachment(event.target.files?.[0] ?? null)
              }
            />
          </Button>
          <span className={attachment ? "selected-file" : ""}>
            {attachment ? attachment.name : "ยังไม่ได้เลือกรูป"}
          </span>
          <Button
            variant="contained"
            disabled={!attachment || busy}
            onClick={() => void completePayment()}
            startIcon={<CheckCircle2 size={18} />}
          >
            {busy ? "กำลังบันทึกรายการ…" : "ยืนยันการชำระเงิน"}
          </Button>
        </div>
        <small className="payment-disclaimer">
          ระบบนี้บันทึกหลักฐานเพื่อดำเนินการต่อเท่านั้น
          ยังไม่ใช่การตรวจสอบธุรกรรมอัตโนมัติ
        </small>
      </section>
    </section>
  );
}

export function FlowSteps({ activeStep }: { activeStep: number }) {
  const steps = [
    "เลือกคอนเสิร์ต",
    "เลือกโซนและบัตร",
    "ชำระเงิน",
    "ทำรายการสำเร็จ",
  ];
  return (
    <ol className="flow-steps" aria-label="ขั้นตอนการจอง">
      {steps.map((step, index) => (
        <li className={index <= activeStep ? "done" : ""} key={step}>
          <span>{index + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}
