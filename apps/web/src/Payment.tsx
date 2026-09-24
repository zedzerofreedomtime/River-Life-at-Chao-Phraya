import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import { CheckCircle2, Clock3, X } from "lucide-react";
import { api, money, type Booking } from "./api";
import type { Language } from "./i18n";

export default function Payment({
  initial,
  initialToken,
  onCompleted,
  onBackToZones,
  language,
}: {
  initial: Booking | null;
  initialToken: string;
  onCompleted: (booking: Booking) => void;
  onBackToZones: () => void;
  language: Language;
}) {
  const en = language === "en";
  const tr = (th: string, english: string) => en ? english : th;
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
      setError(tr("รูปต้องมีขนาดไม่เกิน 5 MB", "Image must be 5 MB or smaller"));
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
        <h1>{tr("ไม่พบรายการชำระเงิน", "No payment found")}</h1>
        <p>{tr("เริ่มเลือกคอนเสิร์ตและโซนบัตรใหม่ เพื่อสร้างรายการซื้อบัตร", "Choose a concert and ticket zone to start a new booking.")}</p>
        <Button variant="contained" onClick={onBackToZones}>
          {tr("กลับไปเลือกโซน", "Back to zones")}
        </Button>
      </section>
    );
  }

  if (booking.status === "confirmed") {
    return (
      <section className="flow-page flow-empty">
        <h1>{tr("รายการนี้ชำระเงินแล้ว", "Payment already submitted")}</h1>
        <p>{tr("QR Ticket ของคุณพร้อมใช้งานแล้ว", "Your QR ticket is ready.")}</p>
        <Button variant="contained" onClick={() => onCompleted(booking)}>
          {tr("ไปหน้าทำรายการสำเร็จ", "View booking confirmation")}
        </Button>
      </section>
    );
  }

  return (
    <section className="flow-page payment-page">
      <FlowSteps activeStep={2} language={language} />
      <button className="back-link" onClick={onBackToZones} disabled={busy}>
        ← {tr("กลับไปเลือกโซน", "Back to zones")}
      </button>
      <div className="flow-heading">
        <h1>{tr("ชำระเงิน", "Payment")}</h1>
        <p>{tr("สแกน QR โอนเงิน แนบสลิป และยืนยันการชำระเงินในหน้านี้", "Scan the QR code, transfer the amount, upload your receipt, and submit it here.")}</p>
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      <div className="payment-layout">
        <article className="payment-instructions">
          <div className="payment-section-title">
            <span>{tr("ช่องทางการชำระเงิน", "Payment method")}</span>
            <h2>QR PromptPay</h2>
          </div>
          <div className="payment-qr-content">
            <img
              src="/images/payment/promptpay-qr.png"
              alt={tr("QR PromptPay สำหรับชำระเงิน", "PromptPay QR code for payment")}
            />
            <div>
              <strong>{tr("สแกน QR เพื่อชำระเงิน", "Scan the QR code to pay")}</strong>
              <p>{tr("โอนเงินตามยอดคำสั่งซื้อนี้ผ่านแอปธนาคารของคุณ", "Transfer the order total using your banking app.")}</p>
              <b className="payment-amount">{money(booking.total)}</b>
              <small>
                <Clock3 aria-hidden="true" size={16} /> {tr("สำรองสิทธิ์ถึง", "Reserved until")}{" "}
                {new Date(booking.expires_at).toLocaleTimeString(en ? "en-GB" : "th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                {en ? "" : "น."}
              </small>
            </div>
          </div>
          <div className="payment-upload">
            <h3>{tr("แนบสลิปการชำระเงิน", "Upload payment receipt")}</h3>
            <p>{tr("รองรับ PNG หรือ JPG ขนาดไม่เกิน 5 MB", "PNG or JPG, up to 5 MB")}</p>
            <Button component="label" variant="outlined" disabled={busy}>
              {attachment ? tr("เปลี่ยนรูปสลิป", "Change receipt") : tr("เลือกไฟล์สลิป", "Choose receipt")}
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
              {attachment ? attachment.name : tr("ยังไม่ได้เลือกไฟล์", "No file selected")}
            </span>
          </div>
          <div className="marketing-consent">
            <Checkbox checked={marketingAccepted} readOnly tabIndex={-1} />
            <p>
              {tr("ฉันยินดีรับ", "I agree to receive")}{" "}
              <button type="button" onClick={openMarketingTerms}>
                {tr("ข้อมูลและสิทธิพิเศษทางการตลาด", "marketing news and special offers")}
              </button>
            </p>
          </div>
        </article>
        <aside className="payment-summary-card">
          <h2>{tr("สรุปคำสั่งซื้อ", "Order summary")}</h2>
          <div className="payment-order-summary">
            <span>{tr("รหัสคำสั่งซื้อ", "Order ID")}</span>
            <b>#{booking.id.toUpperCase()}</b>
            <span>{tr("โซนบัตร", "Ticket zone")}</span>
            <b>{booking.zone_id}</b>
            <span>{tr("จำนวนบัตร", "Tickets")}</span>
            <b>{booking.quantity} {en ? (booking.quantity === 1 ? "ticket" : "tickets") : "ใบ"}</b>
          </div>
          <div className="payment-total">
            <span>{tr("ยอดชำระเงินทั้งสิ้น", "Total due")}</span>
            <strong>{money(booking.total)}</strong>
          </div>
          <p className="payment-summary-note">
            {tr("ตรวจสอบชื่อผู้รับและยอดเงินก่อนแนบสลิป", "Check the recipient and amount before uploading your receipt.")}
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
        {busy ? tr("กำลังบันทึกรายการ…", "Submitting…") : tr("ยืนยันการชำระเงิน", "Submit payment")}
      </Button>
      <small className="payment-disclaimer">
        {tr("ระบบนี้บันทึกหลักฐานเพื่อดำเนินการต่อเท่านั้น ยังไม่ใช่การตรวจสอบธุรกรรมอัตโนมัติ", "Your receipt is submitted for review. Payment is not verified automatically.")}
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
            <h2 id="marketing-terms-title">{tr("ข้อมูลและสิทธิพิเศษทางการตลาด", "Marketing news and special offers")}</h2>
            <button
              type="button"
              aria-label={tr("ปิดเงื่อนไขการตลาด", "Close marketing terms")}
              onClick={() => setMarketingDialogOpen(false)}
            >
              <X aria-hidden="true" size={21} />
            </button>
          </div>
          <div
            className="marketing-terms-scroll"
            onScroll={(event) => checkTermsScroll(event.currentTarget)}
          >
            <h3>{tr("การให้ความยินยอมเพื่อรับข้อมูลทางการตลาด", "Consent to marketing communications")}</h3>
            <p>
              {tr("River Life จะใช้ชื่อ อีเมล และข้อมูลการจองของคุณเพื่อส่งข่าวสาร สิทธิพิเศษ โปรโมชัน และกิจกรรมที่เกี่ยวข้องกับคอนเสิร์ตบนเรือเท่านั้น", "River Life will use your name, email address, and booking details to send news, offers, promotions, and activities related to concerts on board.")}
            </p>
            <h3>{tr("ข้อมูลที่อาจได้รับ", "What you may receive")}</h3>
            <p>
              {tr("คุณอาจได้รับอีเมลเกี่ยวกับรอบการแสดงใหม่ สิทธิพิเศษสำหรับผู้ถือบัตร แพ็กเกจอาหาร กิจกรรมของศิลปิน และข้อเสนอจาก River Life", "You may receive emails about new events, ticket holder benefits, dining packages, artist activities, and River Life offers.")}
            </p>
            <h3>{tr("สิทธิของคุณ", "Your choices")}</h3>
            <p>
              {tr("คุณสามารถถอนความยินยอมได้ทุกเมื่อผ่านลิงก์ในอีเมล โดยไม่กระทบต่อการซื้อบัตร หรือการใช้งาน QR Ticket ของคุณ", "You can withdraw consent at any time using the link in our email. This will not affect your ticket purchase or QR ticket.")}
            </p>
            <h3>{tr("การคุ้มครองข้อมูล", "Data protection")}</h3>
            <p>
              {tr("เราจัดเก็บข้อมูลเท่าที่จำเป็นและใช้มาตรการรักษาความปลอดภัยที่เหมาะสม โดยจะไม่จำหน่ายข้อมูลส่วนบุคคลให้แก่บุคคลภายนอก", "We retain only necessary information, apply appropriate security measures, and do not sell personal data to third parties.")}
            </p>
            <p>
              {tr("โปรดอ่านรายละเอียดทั้งหมดก่อนยอมรับการสื่อสารทางการตลาดนี้ การยอมรับเป็นทางเลือกและไม่ใช่เงื่อนไขในการซื้อบัตรคอนเสิร์ต", "Please read all terms before accepting marketing communications. Consent is optional and is not required to buy a ticket.")}
            </p>
          </div>
          <p className="marketing-scroll-hint">
            {termsReadToEnd
              ? tr("คุณอ่านเงื่อนไขครบแล้ว", "You have reached the end of the terms")
              : tr("เลื่อนอ่านเงื่อนไขจนถึงด้านล่างเพื่อยอมรับ", "Scroll to the bottom to accept")}
          </p>
          <Button
            variant="contained"
            disabled={!termsReadToEnd}
            onClick={() => {
              setMarketingAccepted(true);
              setMarketingDialogOpen(false);
            }}
          >
            {tr("ยอมรับ", "Accept")}
          </Button>
        </section>
      </Dialog>
    </section>
  );
}

export function FlowSteps({
  activeStep,
  language = "th",
}: {
  activeStep: number;
  language?: Language;
}) {
  const steps =
    language === "en"
      ? ["Concert", "Zones & tickets", "Payment", "Complete"]
      : ["เลือกคอนเสิร์ต", "เลือกโซนและบัตร", "ชำระเงิน", "ทำรายการสำเร็จ"];
  return (
    <ol className="flow-steps" aria-label={language === "en" ? "Booking steps" : "ขั้นตอนการจอง"}>
      {steps.map((step, index) => (
        <li
          className={index < activeStep ? "done" : index === activeStep ? "current" : ""}
          aria-current={index === activeStep ? "step" : undefined}
          key={step}
        >
          <span>{index + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}
