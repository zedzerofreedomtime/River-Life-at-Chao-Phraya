import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import { CheckCircle2, Clock3, X } from "lucide-react";
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
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [marketingDialogOpen, setMarketingDialogOpen] = useState(false);
  const [termsReadToEnd, setTermsReadToEnd] = useState(false);
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

  const openMarketingTerms = () => {
    setTermsReadToEnd(false);
    setMarketingDialogOpen(true);
  };

  const checkTermsScroll = (element: HTMLDivElement) => {
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 4) {
      setTermsReadToEnd(true);
    }
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
        <p>สแกน QR โอนเงิน แนบสลิป และยืนยันการชำระเงินในหน้านี้</p>
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      <div className="payment-layout">
        <article className="payment-instructions">
          <div className="payment-section-title">
            <span>ช่องทางการชำระเงิน</span>
            <h2>QR PromptPay</h2>
          </div>
          <div className="payment-qr-content">
            <img
              src="/images/payment/promptpay-qr.png"
              alt="QR PromptPay สำหรับชำระเงิน"
            />
            <div>
              <strong>สแกน QR เพื่อชำระเงิน</strong>
              <p>โอนเงินตามยอดคำสั่งซื้อนี้ผ่านแอปธนาคารของคุณ</p>
              <b className="payment-amount">{money(booking.total)}</b>
              <small>
                <Clock3 aria-hidden="true" size={16} /> สำรองสิทธิ์ถึง{" "}
                {new Date(booking.expires_at).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                น.
              </small>
            </div>
          </div>
          <div className="payment-upload">
            <h3>แนบสลิปการชำระเงิน</h3>
            <p>รองรับ PNG หรือ JPG ขนาดไม่เกิน 5 MB</p>
            <Button component="label" variant="outlined" disabled={busy}>
              {attachment ? "เปลี่ยนรูปสลิป" : "เลือกไฟล์สลิป"}
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
              {attachment ? attachment.name : "ยังไม่ได้เลือกไฟล์"}
            </span>
          </div>
          <div className="marketing-consent">
            <Checkbox checked={marketingAccepted} readOnly tabIndex={-1} />
            <p>
              ฉันยินดีรับ{" "}
              <button type="button" onClick={openMarketingTerms}>
                ข้อมูลและสิทธิพิเศษทางการตลาด
              </button>
            </p>
          </div>
        </article>
        <aside className="payment-summary-card">
          <h2>สรุปคำสั่งซื้อ</h2>
          <div className="payment-order-summary">
            <span>รหัสคำสั่งซื้อ</span>
            <b>#{booking.id.toUpperCase()}</b>
            <span>โซนบัตร</span>
            <b>{booking.zone_id}</b>
            <span>จำนวนบัตร</span>
            <b>{booking.quantity} ใบ</b>
          </div>
          <div className="payment-total">
            <span>ยอดชำระเงินทั้งสิ้น</span>
            <strong>{money(booking.total)}</strong>
          </div>
          <p className="payment-summary-note">
            ตรวจสอบชื่อผู้รับและยอดเงินก่อนแนบสลิป
          </p>
        </aside>
      </div>
      <Button
        className="payment-confirm"
        variant="contained"
        fullWidth
        disabled={!attachment || busy}
        onClick={() => void completePayment()}
        startIcon={<CheckCircle2 size={18} />}
      >
        {busy ? "กำลังบันทึกรายการ…" : "ยืนยันการชำระเงิน"}
      </Button>
      <small className="payment-disclaimer">
        ระบบนี้บันทึกหลักฐานเพื่อดำเนินการต่อเท่านั้น
        ยังไม่ใช่การตรวจสอบธุรกรรมอัตโนมัติ
      </small>
      <Dialog
        open={marketingDialogOpen}
        onClose={() => setMarketingDialogOpen(false)}
        className="marketing-dialog"
        aria-labelledby="marketing-terms-title"
        maxWidth="sm"
        fullWidth
      >
        <section className="marketing-terms-modal">
          <div className="marketing-terms-header">
            <h2 id="marketing-terms-title">ข้อมูลและสิทธิพิเศษทางการตลาด</h2>
            <button
              type="button"
              aria-label="ปิดเงื่อนไขการตลาด"
              onClick={() => setMarketingDialogOpen(false)}
            >
              <X aria-hidden="true" size={21} />
            </button>
          </div>
          <div
            className="marketing-terms-scroll"
            onScroll={(event) => checkTermsScroll(event.currentTarget)}
          >
            <h3>การให้ความยินยอมเพื่อรับข้อมูลทางการตลาด</h3>
            <p>
              River Life จะใช้ชื่อ อีเมล และข้อมูลการจองของคุณเพื่อส่งข่าวสาร
              สิทธิพิเศษ โปรโมชัน
              และกิจกรรมที่เกี่ยวข้องกับคอนเสิร์ตบนเรือเท่านั้น
            </p>
            <h3>ข้อมูลที่อาจได้รับ</h3>
            <p>
              คุณอาจได้รับอีเมลเกี่ยวกับรอบการแสดงใหม่
              สิทธิพิเศษสำหรับผู้ถือบัตร แพ็กเกจอาหาร กิจกรรมของศิลปิน
              และข้อเสนอจาก River Life
            </p>
            <h3>สิทธิของคุณ</h3>
            <p>
              คุณสามารถถอนความยินยอมได้ทุกเมื่อผ่านลิงก์ในอีเมล
              โดยไม่กระทบต่อการซื้อบัตร หรือการใช้งาน QR Ticket ของคุณ
            </p>
            <h3>การคุ้มครองข้อมูล</h3>
            <p>
              เราจัดเก็บข้อมูลเท่าที่จำเป็นและใช้มาตรการรักษาความปลอดภัยที่เหมาะสม
              โดยจะไม่จำหน่ายข้อมูลส่วนบุคคลให้แก่บุคคลภายนอก
            </p>
            <p>
              โปรดอ่านรายละเอียดทั้งหมดก่อนยอมรับการสื่อสารทางการตลาดนี้
              การยอมรับเป็นทางเลือกและไม่ใช่เงื่อนไขในการซื้อบัตรคอนเสิร์ต
            </p>
          </div>
          <p className="marketing-scroll-hint">
            {termsReadToEnd
              ? "คุณอ่านเงื่อนไขครบแล้ว"
              : "เลื่อนอ่านเงื่อนไขจนถึงด้านล่างเพื่อยอมรับ"}
          </p>
          <Button
            variant="contained"
            disabled={!termsReadToEnd}
            onClick={() => {
              setMarketingAccepted(true);
              setMarketingDialogOpen(false);
            }}
          >
            ยอมรับ
          </Button>
        </section>
      </Dialog>
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
