import { useEffect, useRef, useState } from "react";
import { api } from "../../data/api";
import type { Language } from "../../data/i18n";

type Checkout = {
  qr_url: string;
  status: string;
  expires_at: string;
  sandbox: boolean;
};
export default function OmisePayment({
  id,
  language,
  onPaid,
}: {
  id: string;
  language: Language;
  onPaid: () => void;
}) {
  const en = language === "en";
  const paidCallback = useRef(onPaid);
  useEffect(() => {
    paidCallback.current = onPaid;
  }, [onPaid]);
  const [enabled, setEnabled] = useState(false);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let stopped = false;
    void api<{ payment_gateway_enabled: boolean }>("/cruise-checkout/config")
      .then((c) => {
        if (!stopped) setEnabled(c.payment_gateway_enabled);
      })
      .catch(() => {
        if (!stopped)
          setError(
            en ? "Unable to load payment methods" : "โหลดช่องทางชำระเงินไม่ได้",
          );
      });
    return () => {
      stopped = true;
    };
  }, [en]);
  useEffect(() => {
    if (!checkout || checkout.status !== "pending") return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      try {
        const next = await api<Checkout>(
          `/me/cruise-reservations/${encodeURIComponent(id)}/payment-status`,
          { method: "POST" },
        );
        if (stopped) return;
        setCheckout(next);
        setNow(Date.now());
        if (next.status === "successful") {
          paidCallback.current();
          return;
        }
        if (
          next.status !== "pending" ||
          Date.parse(next.expires_at) <= Date.now()
        )
          return;
      } catch (e) {
        if (!stopped) setError((e as Error).message);
      }
      if (!stopped) timer = setTimeout(() => void check(), 10000);
    }
    timer = setTimeout(() => void check(), 10000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [checkout?.status, id]);
  async function start() {
    setBusy(true);
    setError("");
    try {
      const next = await api<Checkout>(
        `/me/cruise-reservations/${encodeURIComponent(id)}/checkout`,
        { method: "POST", body: JSON.stringify({ terms_accepted: accepted }) },
      );
      setCheckout(next);
      setNow(Date.now());
      if (next.status === "successful") paidCallback.current();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rx-info" aria-label="Omise PromptPay">
      <h3>Omise · PromptPay Sandbox</h3>
      <p>
        {en
          ? "Test payments only. Do not transfer real money."
          : "ทดสอบระบบเท่านั้น ห้ามโอนเงินจริง"}
      </p>
      {error && <p role="alert">{error}</p>}
      {!enabled ? (
        <p>
          {en
            ? "Sandbox is awaiting account configuration."
            : "กำลังรอตั้งค่าบัญชี Sandbox"}
        </p>
      ) : (
        <>
          <label>
            <input
              type="checkbox"
              checked={accepted}
              disabled={!!checkout}
              onChange={(e) => setAccepted(e.target.checked)}
            />{" "}
            {en
              ? "I accept payment of this reservation’s displayed total and hold expiry."
              : "ยอมรับยอดชำระและเวลาหมดอายุที่แสดงในรายการจองนี้"}
          </label>
          <button disabled={busy || !accepted} onClick={() => void start()}>
            {busy
              ? en
                ? "Loading…"
                : "กำลังโหลด…"
              : checkout
                ? en
                  ? "Refresh payment"
                  : "ตรวจสอบสถานะอีกครั้ง"
                : en
                  ? "Generate test QR"
                  : "สร้าง QR ทดสอบ"}
          </button>
        </>
      )}
      {checkout && (
        <div aria-live="polite">
          <p>
            {en ? "Payment status" : "สถานะชำระเงิน"}: {checkout.status}
          </p>
          {checkout.status === "pending" &&
            Date.parse(checkout.expires_at) > now &&
            checkout.qr_url && (
              <img
                src={checkout.qr_url}
                alt={
                  en ? "Omise test PromptPay QR" : "QR PromptPay ทดสอบจาก Omise"
                }
                width={240}
                height={240}
                referrerPolicy="no-referrer"
              />
            )}
          <p>
            {en ? "QR expires" : "QR หมดอายุ"}:{" "}
            {new Date(checkout.expires_at).toLocaleString(
              en ? "en-GB" : "th-TH",
            )}
          </p>
          <p>
            {en
              ? "Simulate payment in the Omise test dashboard, then check status here."
              : "จำลองการชำระเงินใน Omise Test Dashboard แล้วตรวจสอบสถานะที่นี่"}
          </p>
        </div>
      )}
    </div>
  );
}
