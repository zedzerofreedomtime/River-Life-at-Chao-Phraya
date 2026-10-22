import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import { CheckCircle2, Clock3, X } from "lucide-react";
import { api, money, bookingItemLabel, type Booking } from "../../data/api";
import type { Language } from "../../data/i18n";

export default function Payment({
  initial,
  initialToken,
  onCompleted,
  onBackToZones,
  language,
  demo,
}: {
  initial: Booking | null;
  initialToken: string;
  onCompleted: (booking: Booking) => void;
  onBackToZones: () => void;
  language: Language;
  demo: boolean;
}) {
  const en = language === "en";
  const tr = (th: string, english: string) => (en ? english : th);
  const [booking, setBooking] = useState(initial);
  const [token] = useState(
    initialToken || sessionStorage.getItem("riverlife.booking.token") || "",
  );
  const [restoring, setRestoring] = useState(
    () =>
      !initial &&
      Boolean(
        sessionStorage.getItem("riverlife.booking.id") &&
        (initialToken || sessionStorage.getItem("riverlife.booking.token")),
      ),
  );
  const [attachment, setAttachment] = useState<File | null>(null);
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [bookingTermsAccepted, setBookingTermsAccepted] = useState(false);
  const [bookingTermsOpen, setBookingTermsOpen] = useState(false);
  useEffect(() => {
    setBookingTermsAccepted(false);
  }, [initial?.id]);
  const [marketingDialogOpen, setMarketingDialogOpen] = useState(false);
  const [termsReadToEnd, setTermsReadToEnd] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [paymentConfig, setPaymentConfig] = useState<{
    enabled: boolean;
    sandbox: boolean;
  } | null>(null);
  const [checkingStripe, setCheckingStripe] = useState(false);
  const stripeEnabled = paymentConfig?.enabled === true;
  useEffect(() => {
    void api<{ enabled: boolean; sandbox: boolean }>("/payments/config")
      .then(setPaymentConfig)
      .catch((cause: Error) => setError(cause.message));
  }, []);

  useEffect(() => {
    const id = initial?.id || sessionStorage.getItem("riverlife.booking.id");
    if (
      !stripeEnabled ||
      !id ||
      !token ||
      !new URLSearchParams(window.location.search).has("stripe_return")
    )
      return;
    let stopped = false;
    let timer: number | undefined;
    let attempts = 0;
    setCheckingStripe(true);
    const check = async () => {
      try {
        const updated = await api<Booking>(
          `/bookings/${encodeURIComponent(id)}/payment-status`,
          { method: "POST" },
          token,
        );
        if (stopped) return;
        setBooking(updated);
        if (updated.status !== "confirmed" && ++attempts < 10) {
          timer = window.setTimeout(() => void check(), 3000);
          return;
        }
      } catch (cause) {
        if (!stopped) setError((cause as Error).message);
      }
      if (!stopped) setCheckingStripe(false);
    };
    void check();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [stripeEnabled, initial?.id, token]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const expired =
    booking?.status === "expired" ||
    (booking?.status === "held" &&
      new Date(booking.expires_at).getTime() <= now);
  const canSubmit = booking?.status === "held" && !expired;

  useEffect(() => {
    const id = initial?.id || sessionStorage.getItem("riverlife.booking.id");
    if (!id || !token) {
      setRestoring(false);
      return;
    }
    void api<Booking>(`/bookings/${encodeURIComponent(id)}`, {}, token)
      .then((updated) =>
        setBooking((current) =>
          current?.status === "confirmed" ? current : updated,
        ),
      )
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setRestoring(false));
  }, [initial?.id, token]);

  const chooseAttachment = (file: File | null) => {
    if (
      file &&
      (!/\.(png|jpe?g)$/i.test(file.name) ||
        !["image/png", "image/jpeg"].includes(file.type))
    ) {
      setAttachment(null);
      setError(
        tr(
          "กรุณาเลือกไฟล์รูปภาพ PNG หรือ JPEG เท่านั้น",
          "Please choose a PNG or JPEG image only",
        ),
      );
      return;
    }
    if (file && file.size === 0) {
      setAttachment(null);
      setError(
        tr(
          "ไฟล์รูปภาพว่างเปล่า กรุณาเลือกไฟล์ใหม่",
          "The image is empty. Please choose another file",
        ),
      );
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setAttachment(null);
      setError(
        tr("รูปต้องมีขนาดไม่เกิน 5 MB", "Image must be 5 MB or smaller"),
      );
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
    if (!booking || !attachment || !canSubmit || !bookingTermsAccepted || busy)
      return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("attachment", attachment);
      form.append("marketing_consent", String(marketingAccepted));
      form.append("marketing_consent_language", language);
      form.append("booking_terms_accepted", "true");
      form.append("booking_terms_version", "booking-terms-v1");
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

  const startStripeCheckout = async () => {
    if (!booking || !canSubmit || !bookingTermsAccepted || busy) return;
    setBusy(true);
    setError("");
    try {
      const checkout = await api<{ url: string }>(
        `/bookings/${booking.id}/checkout`,
        {
          method: "POST",
          body: JSON.stringify({
            language,
            marketing_consent: marketingAccepted,
            booking_terms_accepted: true,
            booking_terms_version: "booking-terms-v1",
          }),
        },
        token,
      );
      const target = new URL(checkout.url);
      if (
        target.protocol !== "https:" ||
        target.hostname !== "checkout.stripe.com"
      )
        throw new Error("Invalid checkout URL");
      window.location.assign(target.href);
    } catch (cause) {
      setError((cause as Error).message);
      setBusy(false);
    }
  };

  if (!paymentConfig || checkingStripe || restoring) {
    return (
      <section className="flow-page flow-empty">
        <h1>
          {checkingStripe
            ? tr("กำลังตรวจสอบการชำระเงิน…", "Checking your payment…")
            : tr("กำลังโหลดช่องทางชำระเงิน…", "Loading payment methods…")}
        </h1>
        {error && <Alert severity="error">{error}</Alert>}
        {error && (
          <Button onClick={() => window.location.reload()}>
            {tr("ลองใหม่", "Try again")}
          </Button>
        )}
      </section>
    );
  }

  if (!booking) {
    return (
      <section className="flow-page flow-empty">
        {error && <Alert severity="error">{error}</Alert>}
        <h1>{tr("ไม่พบรายการชำระเงิน", "No payment found")}</h1>
        <p>
          {tr(
            "เลือกรอบเรือและโต๊ะ เพื่อสร้างรายการซื้อบัตร",
            "Choose your sailing and tables to start a booking.",
          )}
        </p>
        <Button variant="contained" onClick={onBackToZones}>
          {tr("กลับไปเลือกโต๊ะ", "Back to tables")}
        </Button>
      </section>
    );
  }

  if (booking.status === "confirmed") {
    return (
      <section className="flow-page flow-empty">
        <h1>{tr("รายการนี้ชำระเงินแล้ว", "Payment already submitted")}</h1>
        <p>
          {tr("QR Ticket ของคุณพร้อมใช้งานแล้ว", "Your QR ticket is ready.")}
        </p>
        <Button variant="contained" onClick={() => onCompleted(booking)}>
          {tr("ไปหน้าทำรายการสำเร็จ", "View booking confirmation")}
        </Button>
      </section>
    );
  }

  if (!canSubmit) {
    return (
      <section className="flow-page flow-empty">
        <h1>
          {expired
            ? tr("หมดเวลาสำรองบัตร", "Reservation expired")
            : tr(
                "รายการนี้ไม่สามารถชำระเงินได้",
                "Payment unavailable for this booking",
              )}
        </h1>
        <p>
          {booking.status === "review"
            ? tr(
                "ได้รับหลักฐานแล้ว กรุณาตรวจสอบสถานะในคำสั่งซื้อ ไม่ต้องส่งซ้ำ",
                "Your receipt is under review. Check your booking status; do not submit it again.",
              )
            : tr(
                "กรุณากลับไปเลือกบัตรเพื่อสร้างรายการใหม่",
                "Please choose tickets to create a new booking.",
              )}
        </p>
        <Button variant="contained" onClick={onBackToZones}>
          {tr("กลับไปเลือกโต๊ะ", "Back to tables")}
        </Button>
      </section>
    );
  }

  return (
    <section className="flow-page payment-page">
      <FlowSteps activeStep={2} language={language} />
      <button className="back-link" onClick={onBackToZones} disabled={busy}>
        ← {tr("กลับไปเลือกโต๊ะ", "Back to tables")}
      </button>
      <div className="flow-heading">
        <h1>{tr("ชำระเงิน", "Payment")}</h1>
        <p>
          {stripeEnabled
            ? tr(
                "ทดสอบการชำระเงินผ่าน Stripe Sandbox ด้วยข้อมูลทดสอบ",
                "Test payments through Stripe Sandbox using test payment details.",
              )
            : demo
              ? tr(
                  "หน้าทดลองการชำระเงิน · ห้ามโอนเงินจริง สามารถแนบภาพตัวอย่างเพื่อทดสอบขั้นตอนต่อไป",
                  "Payment preview only · Do not transfer real money. Upload a sample image to test the next step.",
                )
              : tr(
                  "สแกน QR โอนเงิน แนบสลิป และยืนยันการชำระเงินในหน้านี้",
                  "Scan the QR code, transfer the amount, upload your receipt, and submit it here.",
                )}
        </p>
      </div>
      {stripeEnabled && (
        <Alert severity="info">
          {tr(
            "โหมดทดลอง Stripe · ไม่มีการเรียกเก็บเงินจริง ใช้บัตรทดสอบ 4242 4242 4242 4242",
            "Stripe sandbox · No real money is charged. Use test card 4242 4242 4242 4242.",
          )}
        </Alert>
      )}
      {!stripeEnabled && en && (
        <Alert severity="info">
          International card and wallet payments are planned but not yet
          connected. This preview cannot accept a real payment.
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <div className="payment-layout">
        <article className="payment-instructions">
          <div className="payment-section-title">
            <span>{tr("ช่องทางการชำระเงิน", "Payment method")}</span>
            <h2>
              {stripeEnabled
                ? "Stripe Checkout · Sandbox"
                : demo
                  ? "QR PromptPay · Demo"
                  : "QR PromptPay"}
            </h2>
          </div>
          {stripeEnabled ? (
            <div className="payment-qr-content payment-stripe-content">
              <div>
                <strong>
                  {tr(
                    "เลือกวิธีชำระเงินบนหน้าของ Stripe",
                    "Choose your payment method on Stripe",
                  )}
                </strong>
                <p>
                  {tr(
                    "ระบบแสดงช่องทางที่เปิดใช้งานและรองรับอุปกรณ์ของคุณ หลังชำระเงินจะกลับมายืนยันรายการและเปิด QR Ticket",
                    "Stripe shows the enabled methods available for your device. After payment, return here to confirm your booking and open your QR ticket.",
                  )}
                </p>
                <b className="payment-amount">{money(booking.total)}</b>
              </div>
            </div>
          ) : (
            <>
              <div className="payment-qr-content">
                {demo ? (
                  <div
                    className="payment-qr-placeholder"
                    role="img"
                    aria-label={tr(
                      "คิวอาร์โค้ดปิดใช้งานในโหมดทดลอง",
                      "Payment QR code disabled in demo mode",
                    )}
                  >
                    {tr(
                      "ทดลองเท่านั้น · ไม่มี QR ชำระเงินจริง",
                      "DEMO ONLY · NO LIVE PAYMENT QR",
                    )}
                  </div>
                ) : (
                  <img
                    src="/images/payment/promptpay-qr.png"
                    alt={tr(
                      "QR PromptPay สำหรับชำระเงิน",
                      "PromptPay QR code for payment",
                    )}
                  />
                )}
                <div>
                  <strong>
                    {demo
                      ? tr("จำลองขั้นตอนชำระเงิน", "Preview the payment step")
                      : tr("สแกน QR เพื่อชำระเงิน", "Scan the QR code to pay")}
                  </strong>
                  <p>
                    {demo
                      ? tr(
                          "ไม่ต้องโอนเงิน จำนวนนี้เป็นเพียงราคาตัวอย่าง",
                          "Do not transfer money. This amount is a sample price.",
                        )
                      : tr(
                          "โอนเงินตามยอดคำสั่งซื้อนี้ผ่านแอปธนาคารของคุณ",
                          "Transfer the order total using your banking app.",
                        )}
                  </p>
                  <b className="payment-amount">{money(booking.total)}</b>
                  <small>
                    <Clock3 aria-hidden="true" size={16} />{" "}
                    {tr("สำรองสิทธิ์ถึง", "Reserved until")}{" "}
                    {new Date(booking.expires_at).toLocaleTimeString(
                      en ? "en-GB" : "th-TH",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}{" "}
                    {en ? "" : "น."}
                  </small>
                </div>
              </div>
              <div className="payment-upload">
                <h3>
                  {demo
                    ? tr("แนบภาพตัวอย่างเพื่อทดสอบ", "Upload a sample image")
                    : tr("แนบสลิปการชำระเงิน", "Upload payment receipt")}
                </h3>
                <p>
                  {tr(
                    "รองรับ PNG หรือ JPG ขนาดไม่เกิน 5 MB",
                    "PNG or JPG, up to 5 MB",
                  )}
                </p>
                <Button component="label" variant="outlined" disabled={busy}>
                  {attachment
                    ? tr("เปลี่ยนรูปสลิป", "Change receipt")
                    : tr("เลือกไฟล์สลิป", "Choose receipt")}
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
                  {attachment
                    ? attachment.name
                    : tr("ยังไม่ได้เลือกไฟล์", "No file selected")}
                </span>
              </div>
            </>
          )}
          <div className="marketing-consent">
            <Checkbox
              checked={bookingTermsAccepted}
              disabled={busy}
              onChange={(_, checked) => setBookingTermsAccepted(checked)}
              inputProps={{
                "aria-label": tr(
                  "ยอมรับเงื่อนไขการจองและการชำระเงิน (จำเป็น)",
                  "Accept booking and payment terms (required)",
                ),
              }}
            />
            <p>
              {tr("ฉันยอมรับ", "I accept the")}{" "}
              <button
                type="button"
                disabled={busy}
                onClick={() => setBookingTermsOpen(true)}
              >
                {tr(
                  "เงื่อนไขการจองและการชำระเงิน",
                  "booking and payment terms",
                )}
              </button>{" "}
              {tr("(จำเป็น)", "(required)")}
            </p>
          </div>
          <div className="marketing-consent">
            <Checkbox
              checked={marketingAccepted}
              onChange={(_, checked) => {
                if (checked) openMarketingTerms();
                else setMarketingAccepted(false);
              }}
              inputProps={{
                "aria-label": tr(
                  "ยินยอมรับข้อมูลทางการตลาด (ไม่บังคับ)",
                  "Marketing consent (optional)",
                ),
              }}
            />
            <p>
              {tr("ฉันยินดีรับ", "I agree to receive")}{" "}
              <button type="button" onClick={openMarketingTerms}>
                {tr(
                  "ข้อมูลและสิทธิพิเศษทางการตลาด",
                  "marketing news and special offers",
                )}
              </button>{" "}
              {tr("(ไม่บังคับ)", "(optional)")}
            </p>
          </div>
        </article>
        <aside className="payment-summary-card">
          <h2>{tr("สรุปคำสั่งซื้อ", "Order summary")}</h2>
          <div className="payment-order-summary">
            <span>{tr("รหัสคำสั่งซื้อ", "Order ID")}</span>
            <b>#{booking.id.toUpperCase()}</b>
            <span>
              {booking.table_ids?.length
                ? tr("โต๊ะที่สำรอง", "Reserved tables")
                : tr("โซนบัตร", "Ticket zone")}
            </span>
            <b>{bookingItemLabel(booking, language)}</b>
            {!!booking.table_ids?.length && (
              <>
                <span>{tr("ผู้ร่วมเดินทาง", "Attending guests")}</span>
                <b>
                  {booking.guest_count} {tr("คน", "guests")} ·{" "}
                  {tr("จองเต็มโต๊ะ", "Whole-table reservation")}
                </b>
              </>
            )}
            <span>{tr("จำนวนบัตร", "Tickets")}</span>
            <b>
              {booking.quantity}{" "}
              {en ? (booking.quantity === 1 ? "ticket" : "tickets") : "ใบ"}
            </b>
          </div>
          <div className="payment-total">
            <span>{tr("ยอดชำระเงินทั้งสิ้น", "Total due")}</span>
            <strong>{money(booking.total)}</strong>
          </div>
          <p className="payment-summary-note">
            {stripeEnabled
              ? tr(
                  "รายการทดสอบ Stripe Sandbox · ระบบออกบัตรหลังยืนยันผลชำระเงิน",
                  "Stripe sandbox booking · Tickets are issued after payment is verified.",
                )
              : demo
                ? tr(
                    "รายการนี้ใช้ทดสอบหน้าจอเท่านั้น ไม่มีการชำระเงินจริง",
                    "This booking is for previewing the flow only. No real payment is collected.",
                  )
                : tr(
                    "ตรวจสอบชื่อผู้รับและยอดเงินก่อนแนบสลิป",
                    "Check the recipient and amount before uploading your receipt.",
                  )}
          </p>
        </aside>
      </div>
      <Button
        className="payment-confirm"
        variant="contained"
        fullWidth
        disabled={
          busy || !bookingTermsAccepted || (!stripeEnabled && !attachment)
        }
        onClick={() =>
          void (stripeEnabled ? startStripeCheckout() : completePayment())
        }
        startIcon={<CheckCircle2 size={18} />}
      >
        {busy
          ? tr("กำลังดำเนินการ…", "Processing…")
          : stripeEnabled
            ? tr("ไปชำระเงินกับ Stripe (ทดลอง)", "Continue to Stripe (test)")
            : demo
              ? tr("ส่งภาพตัวอย่าง", "Submit sample image")
              : tr("ยืนยันการชำระเงิน", "Submit payment")}
      </Button>
      {!bookingTermsAccepted && (
        <p role="status">
          {tr(
            "กรุณายอมรับเงื่อนไขการจองและการชำระเงินก่อนดำเนินการ ไม่จำเป็นต้องยินยอมรับข่าวสารการตลาด",
            "Please accept the booking and payment terms to continue. Marketing consent is optional.",
          )}
        </p>
      )}
      <Dialog
        open={bookingTermsOpen}
        onClose={() => setBookingTermsOpen(false)}
        aria-labelledby="booking-terms-title"
        maxWidth="sm"
        fullWidth
        className="marketing-dialog"
      >
        <section className="marketing-terms-modal">
          <div className="marketing-terms-header">
            <h2 id="booking-terms-title">
              {tr("เงื่อนไขการจองและการชำระเงิน", "Booking and payment terms")}
            </h2>
            <button
              type="button"
              aria-label={tr("ปิดเงื่อนไขการจอง", "Close booking terms")}
              onClick={() => setBookingTermsOpen(false)}
            >
              <X aria-hidden="true" size={21} />
            </button>
          </div>
          <div className="marketing-terms-scroll">
            <p>
              {tr(
                "เวอร์ชัน booking-terms-v1 · สำหรับระบบสาธิต",
                "Version booking-terms-v1 · Demonstration system",
              )}
            </p>
            <p>
              {booking.table_ids?.length
                ? tr(
                    "ตรวจสอบเลขโต๊ะ ผู้ร่วมเดินทาง และยอดรวม จองเต็มโต๊ะตามจำนวนที่นั่งที่แสดง ผัง ราคา และตั๋วนี้ใช้ทดสอบระบบเท่านั้น ไม่ใช่สิทธิ์ขึ้นเรือจริง",
                    "Check table IDs, guest count and total. Whole tables are reserved for the displayed seats. Layout, prices and tickets are for testing only, not actual boarding rights.",
                  )
                : tr(
                    "โปรดตรวจสอบข้อมูลผู้จอง โซน จำนวนผู้ร่วมเดินทาง และยอดรวมให้ถูกต้องก่อนดำเนินการ การจองนี้เป็นการเลือกโซน ไม่ใช่การระบุโต๊ะหรือที่นั่งเฉพาะ",
                    "Check the booking details, zone, guest count and total before continuing. This is a zone reservation, not an assigned table or seat.",
                  )}
            </p>
            <p>
              {tr(
                "รายการที่ยังไม่ชำระเงินมีเวลาสำรองสิทธิ์จำกัดตามที่ระบบแสดง ระบบจะออกตั๋วหลังยืนยันผลตามขั้นตอนชำระเงิน ไม่ใช่เพียงเปิดหน้าชำระเงิน",
                "Unpaid reservations have a limited hold period shown by the system. Tickets are issued after payment confirmation, not merely after opening checkout.",
              )}
            </p>
            <p>
              {tr(
                "ขณะนี้เป็นระบบสาธิต วัน ราคา และรายละเอียดที่รอยืนยันไม่ใช่ข้อเสนอขายจริง ห้ามโอนเงินจริงหรือใช้บัตรจริงในการทดสอบ และตั๋วทดสอบไม่ใช่สิทธิ์ขึ้นเรือจริง",
                "This is a demonstration. Unconfirmed dates, prices and details are not a live sales offer. Do not transfer real money or use a real payment card. Test tickets do not grant actual boarding rights.",
              )}
            </p>
            <p>
              {tr(
                "เงื่อนไขการเปลี่ยนแปลง ยกเลิก และคืนเงินสำหรับการขายจริงยังรอยืนยันจากผู้จัด ก่อนเปิดขายจริงต้องประกาศเงื่อนไขเหล่านี้ให้ครบถ้วน",
                "Live-sale change, cancellation and refund terms are awaiting organizer confirmation and must be published before live sales begin.",
              )}
            </p>
            <p>
              {tr(
                "การรับข่าวสารการตลาดเป็นตัวเลือกแยกต่างหาก การไม่ยินยอมไม่กระทบการดำเนินการจอง",
                "Marketing consent is a separate choice. Declining marketing does not prevent your booking.",
              )}
            </p>
          </div>
          <Button
            variant="contained"
            onClick={() => setBookingTermsOpen(false)}
          >
            {tr("ปิดรายละเอียด", "Close details")}
          </Button>
        </section>
      </Dialog>
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
            <h2 id="marketing-terms-title">
              {tr(
                "ข้อมูลและสิทธิพิเศษทางการตลาด",
                "Marketing news and special offers",
              )}
            </h2>
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
            <h3>
              {tr(
                "การให้ความยินยอมเพื่อรับข้อมูลทางการตลาด",
                "Consent to marketing communications",
              )}
            </h3>
            <p>
              {tr(
                "River Life จะใช้ชื่อ อีเมล และข้อมูลการจองของคุณเพื่อส่งข่าวสาร สิทธิพิเศษ โปรโมชัน และกิจกรรมที่เกี่ยวข้องกับคอนเสิร์ตบนเรือเท่านั้น",
                "River Life will use your name, email address, and booking details to send news, offers, promotions, and activities related to concerts on board.",
              )}
            </p>
            <h3>{tr("ข้อมูลที่อาจได้รับ", "What you may receive")}</h3>
            <p>
              {tr(
                "คุณอาจได้รับอีเมลเกี่ยวกับรอบการแสดงใหม่ สิทธิพิเศษสำหรับผู้ถือบัตร แพ็กเกจอาหาร กิจกรรมของศิลปิน และข้อเสนอจาก River Life",
                "You may receive emails about new events, ticket holder benefits, dining packages, artist activities, and River Life offers.",
              )}
            </p>
            <h3>{tr("สิทธิของคุณ", "Your choices")}</h3>
            <p>
              {tr(
                "คุณสามารถขอถอนความยินยอมได้โดยติดต่อผู้จัดงาน โดยไม่กระทบต่อการซื้อบัตรหรือการใช้งาน QR Ticket",
                "You can request withdrawal of consent by contacting the organizer. This will not affect your ticket purchase or QR ticket.",
              )}
            </p>
            <h3>{tr("การคุ้มครองข้อมูล", "Data protection")}</h3>
            <p>
              {tr(
                "เราจัดเก็บข้อมูลเท่าที่จำเป็นและใช้มาตรการรักษาความปลอดภัยที่เหมาะสม โดยจะไม่จำหน่ายข้อมูลส่วนบุคคลให้แก่บุคคลภายนอก",
                "We retain only necessary information, apply appropriate security measures, and do not sell personal data to third parties.",
              )}
            </p>
            <p>
              {tr(
                "โปรดอ่านรายละเอียดทั้งหมดก่อนยอมรับการสื่อสารทางการตลาดนี้ การยอมรับเป็นทางเลือกและไม่ใช่เงื่อนไขในการซื้อบัตรคอนเสิร์ต",
                "Please read all terms before accepting marketing communications. Consent is optional and is not required to buy a ticket.",
              )}
            </p>
          </div>
          <p className="marketing-scroll-hint">
            {termsReadToEnd
              ? tr(
                  "คุณอ่านเงื่อนไขครบแล้ว",
                  "You have reached the end of the terms",
                )
              : tr(
                  "เลื่อนอ่านเงื่อนไขจนถึงด้านล่างเพื่อยอมรับ",
                  "Scroll to the bottom to accept",
                )}
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
      ? ["Concert", "Choose tables", "Payment", "Complete"]
      : ["เลือกคอนเสิร์ต", "เลือกโต๊ะ", "ชำระเงิน", "ทำรายการสำเร็จ"];
  return (
    <ol
      className="flow-steps"
      aria-label={language === "en" ? "Booking steps" : "ขั้นตอนการจอง"}
    >
      {steps.map((step, index) => (
        <li
          className={
            index < activeStep ? "done" : index === activeStep ? "current" : ""
          }
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
