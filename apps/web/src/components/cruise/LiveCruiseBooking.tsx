import PolicyLinks from "../shared/PolicyLinks";
import OmisePayment from "./OmisePayment";
import CruiseBookingComplete from "./CruiseBookingComplete";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Info, Ship } from "lucide-react";
import { api, ApiError, money } from "../../data/api";
import {
  sailingDate,
  cruiseDisplayText,
  type Sailing,
  type CruiseReservation,
  type CruiseExtra,
} from "../../data/cruises";
import type { Language } from "../../data/i18n";
import DetailedDeckPlan from "./DetailedDeckPlan";
import BookingPreview from "./BookingPreview";
import ExtrasCategoryPicker, { extraCategories } from "./ExtrasCategoryPicker";
import "../../BookingPreview.css";

export default function LiveCruiseBooking({
  language,
  authenticated,
  accountName = "",
  onLogin,
  onOrders,
  onContact,
  onBack,
  salesCustomer,
  onSalesReserved,
}: {
  language: Language;
  authenticated: boolean;
  accountName?: string;
  onLogin: () => void;
  onOrders: () => void;
  onContact: () => void;
  onBack: () => void;
  salesCustomer?: { email: string };
  onSalesReserved?: (reservation: CruiseReservation) => void;
}) {
  const seatMode = true;
  const en = language === "en";
  const t = (th: string, english: string) => (en ? english : th);
  const [sailings, setSailings] = useState<Sailing[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [sailingId, setSailingId] = useState(() => {
      const linked = new URLSearchParams(window.location.search).get("sailing");
      if (linked) return linked;
      try {
        return sessionStorage.getItem("riverlife.cruise.sailing") ?? "";
      } catch {
        return "";
      }
    }),
    [selected, setSelected] = useState<string[]>([]),
    [guests, setGuests] = useState(1),
    [deck, setDeck] = useState<"upper" | "lower">("upper"),
    [step, setStep] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({}),
    [category, setCategory] = useState("all"),
    [requests, setRequests] = useState<string[]>([]),
    [notes, setNotes] = useState(""),
    [name, setName] = useState(""),
    [phone, setPhone] = useState("");
  // Keep the accepted quote even when polling removes or reprices a product.
  const [extraQuotes, setExtraQuotes] = useState<Record<string, CruiseExtra>>(
    {},
  );
  const [busy, setBusy] = useState(false),
    [result, setResult] = useState<CruiseReservation | null>(null),
    [now, setNow] = useState(Date.now());
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [existingHold, setExistingHold] = useState<CruiseReservation | null>(
    null,
  );
  const returnPayment = new URLSearchParams(window.location.search).get(
    "payment",
  );
  useEffect(() => {
    if (!authenticated || !returnPayment || salesCustomer) return;
    let stopped = false;
    void api<CruiseReservation>(
      `/me/cruise-reservations/${encodeURIComponent(returnPayment)}`,
    )
      .then((saved) => {
        if (stopped) return;
        setResult(saved);
        setNow(Date.now());
        if (saved.status === "confirmed") setPaymentVerified(true);
      })
      .catch(() => {
        if (!stopped)
          setError(
            t(
              "โหลดรายการชำระเงินไม่ได้ กรุณาเปิดรายการจองของฉัน",
              "Unable to resume payment. Open My reservations.",
            ),
          );
      });
    return () => {
      stopped = true;
    };
  }, [authenticated, returnPayment]);
  const heading = useRef<HTMLHeadingElement>(null);
  const attempt = useRef<{ body: string; key: string } | null>(null);
  const selectionInitialized = useRef(false);
  const nameEdited = useRef(false);
  useEffect(() => {
    if (!nameEdited.current) setName(accountName.slice(0, 60));
  }, [accountName]);
  useEffect(() => {
    try {
      if (sailingId)
        sessionStorage.setItem("riverlife.cruise.sailing", sailingId);
      else sessionStorage.removeItem("riverlife.cruise.sailing");
    } catch {
      /* Booking remains usable when browser storage is unavailable. */
    }
  }, [sailingId]);
  useEffect(() => {
    let stopped = false;
    const load = () =>
      api<Sailing[]>("/sailings?vessel=unicorn")
        .then((data) => {
          if (!stopped) {
            setSailings(data);
            if (!selectionInitialized.current) {
              selectionInitialized.current = true;
              // Preserve an explicit/previous sailing. With one option, guests
              // can choose chairs immediately; polling never switches sailings.
              setSailingId((previous) =>
                data.some((item) => item.id === previous)
                  ? previous
                  : previous
                    ? previous
                    : data.length === 1
                      ? data[0].id
                      : "",
              );
            }
            setLoadError("");
          }
        })
        .catch(() => {
          if (!stopped) {
            setLoadError(
              t(
                "โหลดรอบเรือไม่ได้ กรุณาลองใหม่",
                "Unable to load sailings. Please retry.",
              ),
            );
            setSailings([]);
          }
        })
        .finally(() => {
          if (!stopped) setLoading(false);
        });
    void load();
    const timer = setInterval(load, 15000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [en]);
  useEffect(() => {
    if (!result) return;
    window.scrollTo({ top: 0, behavior: "instant" });
    heading.current?.focus({ preventScroll: true });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [result]);
  const sailing = sailings.find((s) => s.id === sailingId);
  const chosen =
    sailing?.tables.filter((table) =>
      selected.some((id) => id === table.id || id.startsWith(table.id + ":")),
    ) ?? [];
  const products = sailing?.extras ?? [];
  const tableTotal = chosen.reduce(
    (sum, table) =>
      sum +
      (seatMode
        ? (table.seat_price ?? 0) *
          selected.filter((id) => id.startsWith(table.id + ":")).length
        : table.price),
    0,
  );
  const selectedExtras = Object.values(extraQuotes).filter(
    (item) => (quantities[item.id] ?? 0) > 0,
  );
  const extraChanges = selectedExtras.flatMap((quote) => {
    const current = products.find((item) => item.id === quote.id);
    const unavailable =
      !current || !current.enabled || current.remaining < quantities[quote.id];
    return unavailable || current.price !== quote.price
      ? [{ quote, current, unavailable }]
      : [];
  });
  const extrasTotal = selectedExtras.reduce(
    (sum, item) => sum + item.price * quantities[item.id],
    0,
  );
  const total = tableTotal + extrasTotal;
  const valid =
    !!sailing &&
    !loadError &&
    extraChanges.length === 0 &&
    chosen.length > 0 &&
    (seatMode || chosen.length === selected.length) &&
    selected.length <= (seatMode ? 200 : 30) &&
    (seatMode
      ? selected.every((id) =>
          chosen.some((table) => (table.available_seats ?? []).includes(id)),
        ) && selected.length === guests
      : chosen.every((table) => table.available)) &&
    Number.isInteger(guests) &&
    guests >= 1 &&
    guests <= 200 &&
    chosen.reduce((sum, table) => sum + table.seats, 0) >= guests &&
    selectedExtras.every(
      (item) =>
        item.enabled && quantities[item.id] <= Math.min(10, item.remaining),
    );
  const move = (next: number) => {
    setStep(next);
    setError("");
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  };
  async function reserve() {
    if (!authenticated) {
      onLogin();
      return;
    }
    if (!valid || !name.trim() || busy) return;
    const body = JSON.stringify({
      sailing_id: sailingId,
      table_ids: seatMode ? [] : [...selected].sort(),
      seat_ids: seatMode ? [...selected].sort() : [],
      guest_count: guests,
      expected_total: total,
      extras: selectedExtras
        .map((item) => ({ id: item.id, quantity: quantities[item.id] }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      notes,
      requests: [...requests].sort(),
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      ...(salesCustomer ? { customer_email: salesCustomer.email } : {}),
    });
    if (attempt.current?.body !== body)
      attempt.current = { body, key: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const saved = await api<CruiseReservation>(
        salesCustomer
          ? "/dashboard/sales/cruises/reservations"
          : "/cruise-reservations",
        {
          method: "POST",
          headers: { "Idempotency-Key": attempt.current.key },
          body,
        },
      );
      if (salesCustomer && onSalesReserved) {
        onSalesReserved(saved);
        return;
      }
      setResult(saved);
      setNow(Date.now());
    } catch (e) {
      if (salesCustomer) {
        setError(
          t(
            "สร้างรายการไม่สำเร็จ ตรวจสอบว่าลูกค้ามีบัญชีแล้ว ไม่มีรายการค้างชำระ และที่นั่ง/ราคายังพร้อมขาย แล้วลองใหม่",
            "Unable to reserve. Check the customer account, unpaid holds and current availability/prices, then retry.",
          ),
        );
        return;
      }
      if (e instanceof ApiError && e.status === 409) {
        // A customer-wide unpaid hold is different from a chair being sold.
        // Keep the new selection until the customer chooses how to resolve it.
        try {
          const reservations = await api<CruiseReservation[]>(
            "/me/cruise-reservations",
          );
          const held = Array.isArray(reservations)
            ? reservations.find(
                (item) =>
                  item.status === "held" &&
                  Date.parse(item.expires_at) > Date.now(),
              )
            : undefined;
          if (held) {
            setExistingHold(held);
            setError(
              t(
                "คุณมีรายการจองเดิมรอชำระเงิน กรุณาชำระรายการเดิม หรือยกเลิกรายการเดิมก่อนจองใหม่",
                "You have an unpaid reservation. Continue its payment or cancel it before making a new reservation.",
              ),
            );
            heading.current?.focus({ preventScroll: true });
            window.scrollTo({ top: 0, behavior: "instant" });
            return;
          }
        } catch {
          setError(
            t(
              "ตรวจรายการจองค้างไม่ได้ กรุณาลองอีกครั้ง หรือเปิดรายการจองของฉัน",
              "Unable to check existing reservations. Retry or open My reservations.",
            ),
          );
          return;
        }
        // A rejected reservation did not acquire inventory. Refresh before allowing
        // a new selection, while retaining the guest's contact details and extras.
        move(0);
        attempt.current = null;
        try {
          const data = await api<Sailing[]>("/sailings?vessel=unicorn");
          setSailings(data);
          setLoadError("");
          const current = data.find((item) => item.id === sailingId);
          setSelected((previous) =>
            previous.filter((id) =>
              current?.tables.some((table) =>
                seatMode
                  ? (table.available_seats ?? []).includes(id)
                  : table.id === id && table.available,
              ),
            ),
          );
          setError(
            t(
              "สำรองไม่สำเร็จ ข้อมูลที่นั่ง ราคา หรือเงื่อนไขการจองอาจเปลี่ยนแปลง อัปเดตผังล่าสุดแล้ว กรุณาเลือกที่นั่งว่างและตรวจรายการอีกครั้ง",
              "Reservation could not be completed. Availability, prices or booking limits may have changed. The plan is updated; choose an available seat and review again.",
            ),
          );
        } catch {
          setSelected([]);
          setLoadError(
            t(
              "อัปเดตผังไม่ได้ กรุณาลองโหลดใหม่",
              "Unable to refresh availability. Please reload.",
            ),
          );
        }
        return;
      }
      setError(
        e instanceof Error
          ? e.message
          : t("สำรองที่นั่งไม่สำเร็จ", "Unable to reserve"),
      );
    } finally {
      setBusy(false);
    }
  }
  async function cancelExistingHold() {
    if (!existingHold || busy) return;
    setBusy(true);
    setError("");
    try {
      await api(
        `/me/cruise-reservations/${encodeURIComponent(existingHold.id)}/cancel`,
        { method: "POST" },
      );
      setExistingHold(null);
      attempt.current = null;
      setSailings(await api<Sailing[]>("/sailings?vessel=unicorn"));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t("ยกเลิกไม่สำเร็จ", "Unable to cancel"),
      );
    } finally {
      setBusy(false);
    }
  }
  if (result) {
    if (paymentVerified)
      return (
        <CruiseBookingComplete
          id={result.id}
          language={language}
          onOrders={onOrders}
        />
      );
    const remaining = Math.max(
      0,
      Math.floor((new Date(result.expires_at).getTime() - now) / 1000),
    );
    return (
      <section className="booking-preview bp-success flow-page payment-page cruise-payment-page">
        <div className="flow-heading">
          <PolicyLinks language={language} />
          <h1 ref={heading} tabIndex={-1}>
            {remaining > 0
              ? t("ชำระเงิน", "Payment")
              : t("หมดเวลาสำรองที่นั่งแล้ว", "Your seat hold has expired")}
          </h1>
          <p>
            {t(
              "เลือกวิธีชำระเงินบนหน้าของ Omise",
              "Choose your payment method on Omise",
            )}
          </p>
        </div>
        <div className="payment-layout">
          <article className="payment-instructions">
            <div className="payment-section-title">
              <span>{t("ช่องทางการชำระเงิน", "Payment method")}</span>
              <h2>Omise Checkout · Sandbox</h2>
            </div>
            <p>
              {t(
                "ชำระผ่านช่องทางที่เลือก ระบบตรวจสอบให้อัตโนมัติ และออกตั๋วหลังยืนยันยอดสำเร็จ",
                "Pay using your selected method. Payment is checked automatically; tickets follow verified payment.",
              )}
            </p>
            {remaining > 0 && result.status === "held" ? (
              <OmisePayment
                key={result.id}
                id={result.id}
                language={language}
                autoStart={remaining > 0}
                method="all"
                amount={result.total}
                resume={!!returnPayment}
                onPaid={() => setPaymentVerified(true)}
              />
            ) : (
              <p role="status">
                {t(
                  "รายการนี้หมดเวลาหรือยกเลิกแล้ว กรุณาเริ่มจองใหม่ ตรวจสถานะการชำระที่เริ่มไว้ก่อนหมดเวลาได้ในรายการจองของฉัน",
                  "This hold has expired or was cancelled. Start a new booking. Check My reservations for any payment already initiated.",
                )}
              </p>
            )}
          </article>
          <aside className="payment-summary-card">
            <h2>{t("สรุปคำสั่งซื้อ", "Order summary")}</h2>
            <div className="payment-order-summary">
              <span>{t("รหัสคำสั่งซื้อ", "Order ID")}</span>
              <b>{result.id}</b>
              <span>{t("ที่นั่ง", "Seats")}</span>
              <b>
                {(result.seat_ids?.length
                  ? result.seat_ids
                  : result.table_ids
                ).join(", ")}
              </b>
              <span>{t("รอบเรือ", "Sailing")}</span>
              <b>{cruiseDisplayText(result.title)}</b>
              <span>{t("วันเดินทาง", "Departure")}</span>
              <b>{sailingDate(result.departure_at, en)}</b>
            </div>
            <div className="payment-total">
              <span>{t("ยอดชำระ", "Total")}</span>
              <strong>{money(result.total)}</strong>
            </div>
            <p className="payment-summary-note">
              {t("เวลาสำรองที่เหลือ", "Time remaining")}:{" "}
              {Math.floor(remaining / 60)}:
              {String(remaining % 60).padStart(2, "0")}
            </p>
          </aside>
        </div>
        <div className="bp-actions">
          <button className="bp-secondary" onClick={onContact}>
            {t("ติดต่อทีมงาน", "Contact the team")}
          </button>
          <button className="bp-secondary" onClick={onOrders}>
            {t("ดูรายการจองของฉัน", "My reservations")}
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    );
  }
  if (!loading && !loadError && sailings.length === 0) {
    return <BookingPreview language={language} onBack={onBack} />;
  }
  const stages = [
    t("เลือกโซนและที่นั่ง", "Zone & seats"),
    t("คอนเฟิร์ม", "Confirm"),
    t("จ่ายเงิน", "Payment"),
    t("เรียบร้อย", "Complete"),
  ];
  return (
    <section className="booking-preview">
      <button className="bp-back" onClick={onBack}>
        <ArrowLeft size={17} />
        {t("กลับไปรอบล่องเรือ", "Back to cruises")}
      </button>
      <nav
        className="bp-progress"
        aria-label={t("ขั้นตอนการจอง", "Booking steps")}
      >
        {stages.map((label, index) => (
          <button
            key={label}
            aria-current={(step === 0 ? 0 : 1) === index ? "step" : undefined}
            disabled={index > (step === 0 ? 0 : 1)}
            onClick={() => move(index === 0 ? 0 : 2)}
          >
            <span>
              {index < (step === 0 ? 0 : 1) ? <Check size={16} /> : index + 1}
            </span>
            <strong>{label}</strong>
          </button>
        ))}
      </nav>
      <PolicyLinks language={language} />
      <div className="bp-heading-row">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            {step === 0
              ? t("จองที่นั่งบน Unicorn Cruise", "Book Unicorn Cruise")
              : t("ตรวจสอบและคอนเฟิร์ม", "Review & confirm")}
          </h1>
          <p>
            {t(
              "เลือกรอบและเก้าอี้จากรายการที่แสดง ตรวจสอบยอดก่อนชำระเงิน",
              "Choose a listed sailing and individual seats. Review the total before payment.",
            )}
          </p>
        </div>
      </div>
      {error && (
        <p className="bp-error" role="alert">
          {error}
        </p>
      )}
      {extraChanges.length > 0 && (
        <div className="bp-review-block bp-extra-changes" role="alert">
          <h2>
            {t("บริการเสริมมีการเปลี่ยนแปลง", "Your extras have changed")}
          </h2>
          <p>
            {t(
              "ยังใช้ยอดเดิมจนกว่าคุณจะตรวจสอบ กรุณาจัดการรายการต่อไปนี้ก่อนชำระเงิน",
              "Your previous total is retained. Review these changes before payment.",
            )}
          </p>
          {extraChanges.map(({ quote, current, unavailable }) => (
            <div key={quote.id}>
              <p>
                {cruiseDisplayText(quote.name)}:{" "}
                {unavailable
                  ? t(
                      `ไม่พร้อมขายตามจำนวนที่เลือก (เหลือ ${current?.enabled ? current.remaining : 0})`,
                      `Unavailable in the selected quantity (${current?.enabled ? current.remaining : 0} remaining)`,
                    )
                  : `${t("ราคาเปลี่ยนจาก", "Price changed from")} ${money(quote.price)} → ${money(current!.price)}`}
              </p>
              {!unavailable && (
                <button
                  type="button"
                  onClick={() =>
                    setExtraQuotes((prev) => ({
                      ...prev,
                      [quote.id]: current!,
                    }))
                  }
                >
                  {t("ยอมรับราคาใหม่", "Accept new price")}
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  setQuantities((prev) => ({ ...prev, [quote.id]: 0 }))
                }
              >
                {t("นำรายการออก", "Remove item")}{" "}
                {cruiseDisplayText(quote.name)}
              </button>
            </div>
          ))}
        </div>
      )}
      {existingHold && (
        <div
          className="bp-review-block"
          aria-label={t("รายการรอชำระเดิม", "Existing unpaid reservation")}
        >
          <h2>{t("รายการรอชำระเดิม", "Existing unpaid reservation")}</h2>
          <p>
            {(existingHold.seat_ids?.length
              ? existingHold.seat_ids
              : existingHold.table_ids
            ).join(", ")}
            {" · "}
            {money(existingHold.total)}
          </p>
          <p>
            {t("หมดเวลาสำรอง", "Hold expires")}:{" "}
            {sailingDate(existingHold.expires_at, en)}
          </p>
          <div className="bp-actions">
            <button
              className="bp-primary"
              disabled={busy}
              onClick={() => {
                if (Date.parse(existingHold.expires_at) <= Date.now()) {
                  setExistingHold(null);
                  setError(
                    t(
                      "รายการเดิมหมดเวลาแล้ว กรุณาลองจองอีกครั้ง",
                      "The previous hold expired. Please retry your reservation.",
                    ),
                  );
                  return;
                }
                setResult(existingHold);
                setNow(Date.now());
                setExistingHold(null);
                setError("");
              }}
            >
              {t("ชำระรายการเดิม", "Pay existing reservation")}
            </button>
            <button
              className="bp-secondary"
              disabled={busy}
              onClick={() => void cancelExistingHold()}
            >
              {t(
                "ยกเลิกรายการเดิมเพื่อจองใหม่",
                "Cancel previous reservation to book again",
              )}
            </button>
          </div>
        </div>
      )}
      {sailingId && !sailing && !loading && !loadError && (
        <p role="alert">
          {t(
            "รอบที่เลือกไม่เปิดรับจองแล้ว กรุณาเลือกรอบใหม่ ระบบไม่ได้เปลี่ยนรอบให้คุณ",
            "Your selected sailing is unavailable. Please choose another sailing; your selection has not been switched.",
          )}
        </p>
      )}
      {loadError && (
        <p className="bp-error" role="alert">
          {loadError}{" "}
          <button
            className="bp-text-button"
            onClick={() => window.location.reload()}
          >
            {t("โหลดใหม่", "Reload")}
          </button>
        </p>
      )}
      {loading ? (
        <p role="status">{t("กำลังโหลดรอบเรือ…", "Loading sailings…")}</p>
      ) : loadError && sailings.length === 0 ? null : (
        <div className="bp-layout">
          <div className="bp-content">
            {step === 0 && (
              <>
                <div className="bp-current-vessel">
                  <Ship size={32} />
                  <div>
                    <h2>Unicorn Cruise</h2>
                    <p>
                      {t(
                        "บุฟเฟ่ต์รวมในค่าที่นั่ง",
                        "Buffet included in seat price",
                      )}
                    </p>
                  </div>
                </div>
                <label className="bp-notes" htmlFor="sale-sailing">
                  {t(
                    "เลือกรอบเดินทาง (เวลาไทย)",
                    "Choose a sailing (Bangkok time)",
                  )}
                  <select
                    id="sale-sailing"
                    className="sale-select"
                    value={sailingId}
                    onChange={(e) => {
                      setSailingId(e.target.value);
                      setSelected([]);
                      setQuantities({});
                      setExtraQuotes({});
                      attempt.current = null;
                    }}
                  >
                    <option value="">
                      {t("กรุณาเลือกรอบ", "Select a sailing")}
                    </option>
                    {sailings.map((s) => (
                      <option value={s.id} key={s.id}>
                        {cruiseDisplayText(s.title)} ·{" "}
                        {sailingDate(s.departure_at, en)}
                      </option>
                    ))}
                  </select>
                </label>
                {sailing && (
                  <>
                    <p>
                      {cruiseDisplayText(sailing.pier)} ·{" "}
                      {t("ขึ้นเรือ", "Boarding")}{" "}
                      {sailingDate(sailing.boarding_at, en)}
                    </p>
                    <label className="bp-notes" htmlFor="sale-guests">
                      {t("จำนวนผู้ร่วมเดินทาง", "Guests")}
                      <input
                        id="sale-guests"
                        className="sale-select"
                        type="number"
                        min={1}
                        max={200}
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                      />
                    </label>
                    <div className="bp-table-heading">
                      <h2>{t("เลือกที่นั่ง", "Choose seats")}</h2>
                      <div className="bp-decks">
                        {(["upper", "lower"] as const).map((value) => (
                          <button
                            key={value}
                            aria-pressed={deck === value}
                            onClick={() => setDeck(value)}
                          >
                            {value === "upper"
                              ? t("ชั้นบน", "Upper deck")
                              : t("ชั้นล่าง", "Lower deck")}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="bp-muted">
                      {t(
                        "เลือกเก้าอี้ที่ต้องการ · คิดราคาตามจำนวนที่นั่ง",
                        "Choose your chairs · Pay per seat",
                      )}
                    </p>
                    {seatMode && (
                      <p>
                        {t(
                          "เลือกเก้าอี้ให้ตรงจำนวนผู้เดินทาง · อาจนั่งร่วมโต๊ะกับท่านอื่น",
                          "Choose one chair per guest · You may share a table with others",
                        )}
                      </p>
                    )}
                    <DetailedDeckPlan
                      seatMode={seatMode}
                      language={language}
                      deck={deck}
                      selected={selected}
                      onToggle={(id) =>
                        setSelected((prev) =>
                          prev.includes(id)
                            ? prev.filter((value) => value !== id)
                            : [...prev, id],
                        )
                      }
                      inventory={sailing.tables.map((table) => ({
                        id: table.id,
                        deck: table.deck,
                        seats: table.seats,
                        price: table.price / 100,
                        unavailable: seatMode
                          ? !table.available_seats?.length
                          : !table.available,
                        seatPrice: (table.seat_price ?? 0) / 100,
                        availableSeats: table.available_seats,
                        x: table.x ?? 0,
                        y: table.y ?? 0,
                        side: (table.y ?? 0) < 290 ? "starboard" : "port",
                        nearStage: (table.x ?? 0) < 350,
                      }))}
                    />
                    {chosen.length > 0 && !valid && (
                      <p className="bp-error" role="alert">
                        {t(
                          "กรุณาเลือกเก้าอี้ว่างให้ตรงจำนวนผู้เดินทาง",
                          "Choose available chairs to match your guest count",
                        )}
                      </p>
                    )}
                  </>
                )}
              </>
            )}
            {step === 0 && sailing && (
              <section
                className="bp-optional-extras bp-flight-extras"
                aria-labelledby="extras-heading"
              >
                <div className="bp-extras-heading">
                  <div>
                    <span className="bp-extras-eyebrow">
                      {t("เลือกเพิ่มได้ตามใจ", "MAKE IT YOUR OWN")}
                    </span>
                    <h2 id="extras-heading">
                      {t("เติมเต็มมื้อพิเศษ", "Make your evening special")}
                    </h2>
                    <p>
                      {t(
                        "อาหารพิเศษและไวน์สำหรับกลุ่มของคุณ เลือกจำนวนที่ต้องการได้เลย",
                        "Special food and wine for your group. Choose the quantities you need.",
                      )}
                    </p>
                  </div>
                  <span className="bp-extras-optional">
                    {t("ไม่บังคับ", "Optional")}
                  </span>
                </div>
                <div className="bp-included">
                  <Info size={21} />
                  <div>
                    <strong>
                      {t("บุฟเฟ่ต์รวมอยู่แล้ว", "Your buffet is included")}
                    </strong>
                    <p>
                      {t(
                        "รายการด้านล่างเป็นบริการเสริม มีค่าใช้จ่ายเพิ่มเติม กดข้ามได้",
                        "These are optional paid extras. You can skip them.",
                      )}
                    </p>
                  </div>
                </div>
                <ExtrasCategoryPicker
                  language={language}
                  selected={category}
                  counts={{
                    food: selectedExtras
                      .filter((p) => p.category === "food")
                      .reduce((n, p) => n + quantities[p.id], 0),
                    wine: selectedExtras
                      .filter((p) => p.category === "wine")
                      .reduce((n, p) => n + quantities[p.id], 0),
                  }}
                  requests={requests}
                  onSelect={setCategory}
                />
                {!["all", "food", "wine"].includes(category) ? (
                  <div className="bp-enquiry-card">
                    <h3>
                      {en
                        ? extraCategories.find((c) => c.id === category)?.en
                        : extraCategories.find((c) => c.id === category)?.th}
                    </h3>
                    <p>
                      {t(
                        "เป็นคำขอรอยืนยัน ยังไม่รวมราคาและยังไม่รับประกันการจัดเตรียม",
                        "An enquiry pending confirmation. Charges and availability are not confirmed.",
                      )}
                    </p>
                    <button
                      className="bp-secondary"
                      aria-pressed={requests.includes(category)}
                      onClick={() =>
                        setRequests((prev) =>
                          prev.includes(category)
                            ? prev.filter((id) => id !== category)
                            : [...prev, category],
                        )
                      }
                    >
                      {requests.includes(category)
                        ? t("นำคำขอนี้ออก", "Remove enquiry")
                        : t("เพิ่มเป็นคำขอรอยืนยัน", "Add an enquiry")}
                    </button>
                  </div>
                ) : (
                  <div className="bp-extras">
                    {products
                      .filter(
                        (item) =>
                          category === "all" || item.category === category,
                      )
                      .map((item) => (
                        <article
                          key={item.id}
                          className={`bp-extra${quantities[item.id] ? " bp-extra-selected" : ""}`}
                          style={item.image ? undefined : { display: "block" }}
                        >
                          {item.image && (
                            <img
                              src={item.image}
                              alt={cruiseDisplayText(item.name)}
                              loading="lazy"
                            />
                          )}
                          <div className="bp-extra-body">
                            <h2>{cruiseDisplayText(item.name)}</h2>
                            <p>{item.description}</p>
                            <span className="bp-extras-eyebrow">
                              {item.category === "wine"
                                ? t("ไวน์", "Wine")
                                : t("อาหารพิเศษ", "Special food")}
                            </span>
                            <strong>
                              {money(item.price)}{" "}
                              <small>{t("/ รายการ", "/ item")}</small>
                            </strong>
                            <p>
                              {t("เหลือ", "Remaining")}: {item.remaining}
                            </p>
                            <div className="bp-quantity">
                              <button
                                aria-label={`${t("ลด", "Remove")} ${cruiseDisplayText(item.name)}`}
                                disabled={!quantities[item.id]}
                                onClick={() =>
                                  setQuantities((prev) => ({
                                    ...prev,
                                    [item.id]: Math.max(
                                      0,
                                      (prev[item.id] ?? 0) - 1,
                                    ),
                                  }))
                                }
                              >
                                −
                              </button>
                              <output>{quantities[item.id] ?? 0}</output>
                              <button
                                aria-label={`${t("เพิ่ม", "Add")} ${cruiseDisplayText(item.name)}`}
                                disabled={
                                  !item.enabled ||
                                  (quantities[item.id] ?? 0) >=
                                    Math.min(10, item.remaining)
                                }
                                onClick={() => {
                                  if (!quantities[item.id])
                                    setExtraQuotes((prev) => ({
                                      ...prev,
                                      [item.id]: { ...item },
                                    }));
                                  setQuantities((prev) => ({
                                    ...prev,
                                    [item.id]: (prev[item.id] ?? 0) + 1,
                                  }));
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    {products.filter(
                      (item) =>
                        category === "all" || item.category === category,
                    ).length === 0 && (
                      <p>
                        {t(
                          "ยังไม่มีรายการเสริมในหมวดนี้",
                          "No extras in this category",
                        )}
                      </p>
                    )}
                  </div>
                )}
                <label className="bp-notes" htmlFor="sale-notes">
                  {t(
                    "หมายเหตุ / แพ้อาหาร / คำขอเพิ่มเติม",
                    "Notes / Allergies / Special requests",
                  )}
                  <textarea
                    id="sale-notes"
                    rows={3}
                    maxLength={300}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
                <div className="bp-extras-checkout">
                  <div aria-live="polite">
                    <span>
                      {t("บริการเสริมที่เลือก", "Selected extras")} ·{" "}
                      {selectedExtras.reduce(
                        (sum, item) => sum + quantities[item.id],
                        0,
                      )}{" "}
                      {t("รายการ", "items")}
                    </span>
                    <strong>+ {money(extrasTotal)}</strong>
                    <small>
                      {t(
                        "คิดเพิ่มจากค่าที่นั่ง · ตรวจยอดรวมได้ก่อนชำระเงิน",
                        "Added to your seat fare · Review your total before payment",
                      )}
                    </small>
                  </div>
                  <div className="bp-extras-actions">
                    <button
                      className="bp-secondary"
                      onClick={() => {
                        setQuantities({});
                        setRequests([]);
                      }}
                      disabled={!selectedExtras.length && !requests.length}
                    >
                      {t("ไม่เพิ่มบริการเสริม", "No extras")}
                    </button>
                    <button
                      className="bp-primary"
                      disabled={!valid}
                      onClick={() => move(2)}
                    >
                      {t("ตรวจสอบรายการ", "Review booking")}{" "}
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              </section>
            )}
            {step === 2 && (
              <>
                <div className="bp-review-block">
                  <h2>
                    {t("ตรวจสอบรายการก่อนชำระเงิน", "Review before payment")}
                  </h2>
                  <p>
                    {sailing ? cruiseDisplayText(sailing.title) : ""} ·{" "}
                    {sailingDate(sailing?.departure_at ?? null, en)}
                  </p>
                  <p>
                    {selected.join(", ")} · {guests} {t("คน", "guests")}
                  </p>
                  <button className="bp-text-button" onClick={() => move(0)}>
                    {t("แก้ไขที่นั่ง", "Edit seats")}
                  </button>
                  <hr />
                  {selectedExtras.map((item) => (
                    <p key={item.id}>
                      {cruiseDisplayText(item.name)} × {quantities[item.id]} —{" "}
                      {money(item.price * quantities[item.id])}
                    </p>
                  ))}
                  {requests.length > 0 && (
                    <p>
                      {t(
                        "คำขอรอยืนยัน (ยังไม่รวมราคา)",
                        "Enquiries (not yet priced)",
                      )}
                      :{" "}
                      {requests
                        .map((id) =>
                          en
                            ? extraCategories.find((c) => c.id === id)?.en
                            : extraCategories.find((c) => c.id === id)?.th,
                        )
                        .join(", ")}
                    </p>
                  )}
                  {notes && <p>{notes}</p>}
                  <button className="bp-text-button" onClick={() => move(0)}>
                    {t("แก้ไขบริการเสริม", "Edit extras")}
                  </button>
                </div>
                <div className="bp-fields">
                  <label>
                    {t("ชื่อผู้จอง *", "Booking name *")}
                    <input
                      required
                      maxLength={60}
                      value={name}
                      onChange={(e) => {
                        nameEdited.current = true;
                        setName(e.target.value);
                      }}
                    />
                  </label>
                  <label>
                    {t("เบอร์โทรศัพท์ (ไม่บังคับ)", "Phone (optional)")}
                    <input
                      maxLength={50}
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </label>
                </div>
                <p className="bp-muted">
                  {salesCustomer
                    ? t(
                        "ตั๋วจะออกหลังยืนยันการชำระเงินและส่งไปยังอีเมลบัญชีลูกค้า",
                        "Tickets are issued after payment verification and sent to the customer's account email.",
                      )
                    : t(
                        "ตั๋วจะออกหลังระบบยืนยันการชำระเงิน และส่งไปยังอีเมลบัญชีของคุณเมื่อเปิดบริการส่งอีเมล",
                        "Tickets are issued after payment verification and sent to your account email when delivery is enabled.",
                      )}
                </p>
                <button className="bp-secondary" onClick={() => move(0)}>
                  {t("ย้อนกลับ", "Back")}
                </button>
              </>
            )}
          </div>
          <aside className="bp-summary">
            <h2>{t("สรุปรายการ", "Your reservation")}</h2>
            <p>Unicorn Cruise</p>
            <p>
              {sailing
                ? sailingDate(sailing.departure_at, en)
                : t("ยังไม่ได้เลือกรอบ", "Select a sailing")}
            </p>
            <p>{selected.join(", ") || "—"}</p>
            <div className="bp-price-rows">
              <div>
                <span>{t("ค่าที่นั่ง", "Seat fare")}</span>
                <b>{money(tableTotal)}</b>
              </div>
              {selectedExtras.map((item) => (
                <div key={item.id}>
                  <span>
                    {cruiseDisplayText(item.name)} × {quantities[item.id]}
                  </span>
                  <b>{money(item.price * quantities[item.id])}</b>
                </div>
              ))}
              <div>
                <span>{t("รวมบริการเสริม", "Extras subtotal")}</span>
                <b>{money(extrasTotal)}</b>
              </div>
            </div>
            <div className="bp-grand-total">
              <span>{t("ยอดรวม", "Total")}</span>
              <strong>{money(total)}</strong>
            </div>
            <p className="bp-summary-buffet">
              <Check size={16} />
              {t("รวมบุฟเฟ่ต์แล้ว", "Buffet included")}
            </p>
            {requests.length > 0 && (
              <p className="bp-summary-enquiry">
                {requests.length}{" "}
                {t(
                  "คำขอรอยืนยัน · ยังไม่รวมค่าใช้จ่าย",
                  "enquiries pending pricing",
                )}
              </p>
            )}
            <button
              className="bp-primary"
              disabled={
                !valid || busy || (step === 2 && authenticated && !name.trim())
              }
              onClick={() => (step === 0 ? move(2) : void reserve())}
            >
              {busy
                ? t("กำลังบันทึก…", "Saving…")
                : step === 2
                  ? authenticated
                    ? salesCustomer
                      ? t(
                          `สำรองให้ลูกค้า ${money(total)}`,
                          `Reserve for customer ${money(total)}`,
                        )
                      : t(`ชำระเงิน ${money(total)}`, `Pay ${money(total)}`)
                    : t("เข้าสู่ระบบเพื่อสำรองที่นั่ง", "Sign in to reserve")
                  : t("ถัดไป", "Continue")}
              <ArrowRight size={18} />
            </button>
            <small className="bp-summary-hint">
              {salesCustomer
                ? t(
                    "สำรองที่นั่ง 15 นาที ลูกค้าชำระจากบัญชีของตัวเองก่อนหมดเวลา",
                    "Seats are held for 15 minutes. The customer pays from their own account before expiry.",
                  )
                : t(
                    "กดชำระเงินเพื่อยอมรับยอดรวมนี้และเวลาพักที่นั่ง 15 นาที · เปิดช่องทางชำระที่เลือกให้อัตโนมัติ",
                    "By paying you accept this total and the 15-minute hold. Your selected payment method opens automatically.",
                  )}
            </small>
          </aside>
        </div>
      )}
    </section>
  );
}
