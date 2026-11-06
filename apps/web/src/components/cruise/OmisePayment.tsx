import { useEffect, useRef, useState } from "react";
import { api } from "../../data/api";
import type { Language } from "../../data/i18n";
import {
  loadOmiseCard,
  checkoutMethods,
  type OmiseConfig,
} from "../../data/omise";
import "./OmisePayment.css";

type Checkout = {
  qr_url: string;
  status: string;
  expires_at: string;
  sandbox: boolean;
  review_reason?: string;
  authorize_url?: string;
};
export default function OmisePayment({
  id,
  language,
  onPaid,
  autoStart = false,
  method = "all",
  amount = 0,
  resume = false,
}: {
  id: string;
  language: Language;
  onPaid: () => void;
  // Only the final booking action, beside the total/hold terms, may enable this.
  autoStart?: boolean;
  method?: string;
  amount?: number;
  resume?: boolean;
}) {
  const en = language === "en";
  const paidCallback = useRef(onPaid);
  useEffect(() => {
    paidCallback.current = onPaid;
  }, [onPaid]);
  const [enabled, setEnabled] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [methods, setMethods] = useState<string[]>([]);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const started = useRef(false);
  const inFlight = useRef(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (checkout?.status !== "pending") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [checkout?.status]);
  useEffect(() => {
    let stopped = false;
    void api<OmiseConfig>("/cruise-checkout/config")
      .then((c) => {
        if (!stopped) {
          setEnabled(c.payment_gateway_enabled);
          setPublicKey(c.public_key ?? "");
          setMethods(checkoutMethods(c));
        }
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
    if (enabled && autoStart && !started.current) {
      started.current = true;
      void (resume ? refresh() : begin());
    }
  }, [enabled, autoStart, resume]);
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
  async function start(nonce?: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await api<Checkout>(
        `/me/cruise-reservations/${encodeURIComponent(id)}/checkout`,
        {
          method: "POST",
          body: JSON.stringify({
            terms_accepted: true,
            ...(nonce
              ? nonce.startsWith("tokn_test_")
                ? { token: nonce }
                : { source: nonce }
              : {}),
          }),
        },
      );
      setCheckout(next);
      setNow(Date.now());
      if (next.status === "successful") paidCallback.current();
      else if (next.authorize_url) {
        const target = new URL(next.authorize_url);
        // Authorization destinations come from a server-verified provider charge.
        if (
          target.protocol !== "https:" ||
          !["api.omise.co", "pay.omise.co", "3ds.omise.co"].includes(
            target.hostname,
          )
        )
          throw new Error("Invalid payment authorization URL");
        window.location.assign(target.href);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function begin() {
    if (method === "promptpay") return start();
    if (!publicKey || amount <= 0) {
      setError(
        en
          ? "This payment method is not configured."
          : "ช่องทางนี้ยังไม่ได้ตั้งค่าบัญชี",
      );
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const card = await loadOmiseCard();
      card.configure({ publicKey });
      let submitted = false;
      const available = methods.map((value) =>
        value === "card" ? "credit_card" : value,
      );
      const defaultMethod =
        method === "all"
          ? available.includes("credit_card")
            ? "credit_card"
            : available[0]
          : method === "card"
            ? "credit_card"
            : method;
      if (!defaultMethod)
        throw new Error(
          en
            ? "No payment methods available"
            : "ยังไม่มีช่องทางชำระเงินที่เปิดใช้งาน",
        );
      card.open({
        amount,
        currency: "THB",
        locale: en ? "en" : "th",
        frameLabel: "River Life",
        defaultPaymentMethod: defaultMethod,
        otherPaymentMethods: available
          .filter((value) => value !== defaultMethod)
          .join(","),
        onCreateTokenSuccess: (nonce) => {
          if (submitted) return;
          submitted = true;
          inFlight.current = false;
          if (!/^(tokn|src)_test_[A-Za-z0-9]+$/.test(nonce)) {
            setBusy(false);
            setError(
              en
                ? "Invalid test payment token"
                : "ข้อมูลชำระเงินทดสอบไม่ถูกต้อง",
            );
            return;
          }
          void start(nonce);
        },
        onFormClosed: () => {
          if (submitted || !inFlight.current) return;
          inFlight.current = false;
          setBusy(false);
        },
      });
    } catch (e) {
      inFlight.current = false;
      setBusy(false);
      setError((e as Error).message);
    }
  }
  async function refresh() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await api<Checkout>(
        `/me/cruise-reservations/${encodeURIComponent(id)}/payment-status`,
        { method: "POST" },
      );
      setCheckout(next);
      setNow(Date.now());
      if (next.status === "successful") paidCallback.current();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="omise-payment" aria-label="Omise payment">
      <h3>Omise · Sandbox</h3>
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
          {!checkout && !autoStart && (
            <p>
              {en
                ? "By paying you accept this reservation’s displayed total and hold expiry."
                : "กดชำระเงินเพื่อยอมรับยอดรวมและเวลาหมดอายุที่แสดงในรายการนี้"}
            </p>
          )}
          {(!autoStart ||
            error ||
            checkout ||
            (!busy && method !== "promptpay")) && (
            <button
              disabled={busy || (!!checkout && checkout.status !== "pending")}
              onClick={() => void (checkout || resume ? refresh() : begin())}
            >
              {busy
                ? en
                  ? "Loading…"
                  : "กำลังโหลด…"
                : checkout
                  ? en
                    ? "Refresh payment"
                    : "ตรวจสอบสถานะอีกครั้ง"
                  : en
                    ? "Pay / continue"
                    : method === "promptpay"
                      ? "ชำระเงิน / แสดง QR"
                      : "ดำเนินการชำระเงิน"}
            </button>
          )}
          {busy && (
            <p role="status">
              {en ? "Preparing your payment…" : "กำลังเตรียมการชำระเงิน…"}
            </p>
          )}
        </>
      )}
      {checkout && (
        <div aria-live="polite">
          <p>
            {en ? "Payment status" : "สถานะชำระเงิน"}: {checkout.status}
          </p>
          {checkout.status === "review_required" && (
            <p role="alert">
              {en
                ? "Staff must review this payment. Do not pay again. No boarding ticket has been issued for this payment."
                : "รายการนี้ต้องให้เจ้าหน้าที่ตรวจสอบ กรุณาอย่าชำระซ้ำ ยังไม่มีการออกตั๋วขึ้นเรือสำหรับการจ่ายนี้"}
            </p>
          )}
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
            {en ? "Payment expires" : "ชำระได้ถึง"}:{" "}
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
