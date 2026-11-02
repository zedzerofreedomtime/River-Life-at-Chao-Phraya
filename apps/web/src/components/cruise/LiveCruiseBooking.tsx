import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Info, Ship } from "lucide-react";
import { api, money } from "../../data/api";
import {
  sailingDate,
  type Sailing,
  type CruiseReservation,
} from "../../data/cruises";
import type { Language } from "../../data/i18n";
import DetailedDeckPlan from "./DetailedDeckPlan";
import BookingPreview from "./BookingPreview";
import ExtrasCategoryPicker, { extraCategories } from "./ExtrasCategoryPicker";
import "../../BookingPreview.css";

export default function LiveCruiseBooking({
  language,
  authenticated,
  onLogin,
  onOrders,
  onContact,
  onBack,
}: {
  language: Language;
  authenticated: boolean;
  onLogin: () => void;
  onOrders: () => void;
  onContact: () => void;
  onBack: () => void;
}) {
  const [seatMode, setSeatMode] = useState(false);
  const en = language === "en";
  const t = (th: string, english: string) => (en ? english : th);
  const [sailings, setSailings] = useState<Sailing[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [sailingId, setSailingId] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [guests, setGuests] = useState(4),
    [deck, setDeck] = useState<"upper" | "lower">("upper"),
    [step, setStep] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({}),
    [category, setCategory] = useState("all"),
    [requests, setRequests] = useState<string[]>([]),
    [notes, setNotes] = useState(""),
    [name, setName] = useState(""),
    [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false),
    [result, setResult] = useState<CruiseReservation | null>(null),
    [now, setNow] = useState(Date.now());
  const heading = useRef<HTMLHeadingElement>(null);
  const attempt = useRef<{ body: string; key: string } | null>(null);
  useEffect(() => {
    let stopped = false;
    const load = () =>
      api<Sailing[]>("/sailings?vessel=unicorn")
        .then((data) => {
          if (!stopped) {
            setSailings(data);
            setError("");
          }
        })
        .catch(() => {
          if (!stopped) {
            setError(
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
  const selectedExtras = products.filter(
    (item) => (quantities[item.id] ?? 0) > 0,
  );
  const extrasTotal = selectedExtras.reduce(
    (sum, item) => sum + item.price * quantities[item.id],
    0,
  );
  const total = tableTotal + extrasTotal;
  const valid =
    !!sailing &&
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
    });
    if (attempt.current?.body !== body)
      attempt.current = { body, key: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const saved = await api<CruiseReservation>("/cruise-reservations", {
        method: "POST",
        headers: { "Idempotency-Key": attempt.current.key },
        body,
      });
      setResult(saved);
      setNow(Date.now());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t("สำรองโต๊ะไม่สำเร็จ", "Unable to reserve"),
      );
    } finally {
      setBusy(false);
    }
  }
  if (result) {
    const remaining = Math.max(
      0,
      Math.floor((new Date(result.expires_at).getTime() - now) / 1000),
    );
    return (
      <section className="booking-preview bp-success">
        <Check size={45} />
        <h1>
          {remaining > 0
            ? t(
                "สำรองโต๊ะแล้ว · รอการชำระเงิน",
                "Tables held · payment pending",
              )
            : t("หมดเวลาสำรองโต๊ะแล้ว", "Your table hold has expired")}
        </h1>
        <p>
          {result.title} ·{" "}
          {(result.seat_ids?.length ? result.seat_ids : result.table_ids).join(
            ", ",
          )}
        </p>
        <div className="bp-success-receipt">
          <strong>{money(result.total)}</strong>
          <p>
            {t("รหัสรายการ", "Reservation")}: {result.id}
          </p>
          <p>
            {t("เวลาสำรองที่เหลือ", "Time remaining")}:{" "}
            {Math.floor(remaining / 60)}:
            {String(remaining % 60).padStart(2, "0")}
          </p>
        </div>
        <p>
          {t(
            "ยังไม่ได้ชำระเงินและยังไม่มีตั๋วขึ้นเรือ ขณะนี้ยังไม่เปิดรับชำระผ่าน Payment Gateway ติดต่อทีมงานก่อนชำระเงิน และรอการตรวจสอบยอดจริง",
            "This is an unpaid hold, not a boarding ticket. Online payment is not connected. Contact the team before paying and wait for verified payment confirmation.",
          )}
        </p>
        <div className="bp-actions">
          <button className="bp-secondary" onClick={onContact}>
            {t("ติดต่อทีมงาน", "Contact the team")}
          </button>
          <button className="bp-primary" onClick={onOrders}>
            {t("ดูรายการจองของฉัน", "My reservations")}
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    );
  }
  if (!loading && !error && sailings.length === 0) {
    return <BookingPreview language={language} onBack={onBack} />;
  }
  const stages = [
    t("เลือกรอบและโต๊ะ", "Sailing & tables"),
    t("เติมเต็มมื้อพิเศษ", "Dining extras"),
    t("ตรวจสอบและสำรอง", "Review & reserve"),
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
            aria-current={step === index ? "step" : undefined}
            disabled={index > step}
            onClick={() => move(index)}
          >
            <span>{index < step ? <Check size={16} /> : index + 1}</span>
            <strong>{label}</strong>
          </button>
        ))}
      </nav>
      <div className="bp-heading-row">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            {step === 0
              ? t("จองโต๊ะบน Unicorn Cruise", "Book Unicorn Cruise")
              : stages[step]}
          </h1>
          <p>
            {t(
              "เปิดจองเฉพาะรอบ ราคา และผังที่ทีมงานรับรองแล้ว",
              "Only verified sailings, prices and tables are offered here",
            )}
          </p>
        </div>
      </div>
      {error && (
        <p className="bp-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">{t("กำลังโหลดรอบเรือ…", "Loading sailings…")}</p>
      ) : error ? null : (
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
                        "Buffet included in table price",
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
                      attempt.current = null;
                    }}
                  >
                    <option value="">
                      {t("กรุณาเลือกรอบ", "Select a sailing")}
                    </option>
                    {sailings.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.title} · {sailingDate(s.departure_at, en)}
                      </option>
                    ))}
                  </select>
                </label>
                {sailing && (
                  <>
                    <p>
                      {sailing.pier} · {t("ขึ้นเรือ", "Boarding")}{" "}
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
                      <h2>{t("เลือกโต๊ะ", "Choose tables")}</h2>
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
                        "เลือกทั้งโต๊ะหรือรายเก้าอี้ · ตรวจราคาในรายละเอียดก่อนจอง",
                        "Choose a whole table or individual chairs · Check the price before booking",
                      )}
                    </p>
                    <div
                      className="bp-decks"
                      aria-label={t("รูปแบบการจอง", "Booking mode")}
                    >
                      <button
                        aria-pressed={!seatMode}
                        onClick={() => {
                          setSeatMode(false);
                          setSelected([]);
                        }}
                      >
                        {t("จองทั้งโต๊ะ", "Whole table")}
                      </button>
                      <button
                        aria-pressed={seatMode}
                        onClick={() => {
                          setSeatMode(true);
                          setSelected([]);
                          setGuests(1);
                        }}
                      >
                        {t("เลือกเป็นรายเก้าอี้", "Individual chairs")}
                      </button>
                    </div>
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
                          "กรุณาเลือกที่นั่งให้เพียงพอ หรือเลือกโต๊ะที่ยังว่าง",
                          "Choose enough seats and available tables",
                        )}
                      </p>
                    )}
                  </>
                )}
              </>
            )}
            {step === 1 && (
              <>
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
                          className="bp-extra"
                          style={item.image ? undefined : { display: "block" }}
                        >
                          {item.image && (
                            <img src={item.image} alt={item.name} />
                          )}
                          <div className="bp-extra-body">
                            <h2>{item.name}</h2>
                            <p>{item.description}</p>
                            <strong>{money(item.price)}</strong>
                            <p>
                              {t("เหลือ", "Remaining")}: {item.remaining}
                            </p>
                            <div className="bp-quantity">
                              <button
                                aria-label={`${t("ลด", "Remove")} ${item.name}`}
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
                                aria-label={`${t("เพิ่ม", "Add")} ${item.name}`}
                                disabled={
                                  (quantities[item.id] ?? 0) >=
                                  Math.min(10, item.remaining)
                                }
                                onClick={() =>
                                  setQuantities((prev) => ({
                                    ...prev,
                                    [item.id]: (prev[item.id] ?? 0) + 1,
                                  }))
                                }
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
                <div className="bp-actions">
                  <button className="bp-secondary" onClick={() => move(0)}>
                    {t("ย้อนกลับ", "Back")}
                  </button>
                  <button
                    className="bp-text-button"
                    onClick={() => {
                      setQuantities({});
                      setRequests([]);
                      move(2);
                    }}
                  >
                    {t("ข้ามโดยไม่เพิ่มรายการ", "Continue without extras")}
                  </button>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div className="bp-review-block">
                  <h2>
                    {t("ตรวจสอบรายการก่อนสำรอง", "Review before reserving")}
                  </h2>
                  <p>
                    {sailing?.title} ·{" "}
                    {sailingDate(sailing?.departure_at ?? null, en)}
                  </p>
                  <p>
                    {selected.join(", ")} · {guests} {t("คน", "guests")}
                  </p>
                  <button className="bp-text-button" onClick={() => move(0)}>
                    {t("แก้ไขโต๊ะ", "Edit tables")}
                  </button>
                  <hr />
                  {selectedExtras.map((item) => (
                    <p key={item.id}>
                      {item.name} × {quantities[item.id]} —{" "}
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
                  <button className="bp-text-button" onClick={() => move(1)}>
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
                      onChange={(e) => setName(e.target.value)}
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
                  {t(
                    "อีเมลยืนยันและตั๋วจะส่งไปยังอีเมลบัญชีที่เข้าสู่ระบบ หลังทีมงานตรวจสอบการชำระเงินจริงแล้ว",
                    "After verified payment, confirmation and tickets will be sent to your signed-in account email.",
                  )}
                </p>
                <button className="bp-secondary" onClick={() => move(1)}>
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
                <span>{t("ค่าที่นั่ง", "Tables")}</span>
                <b>{money(tableTotal)}</b>
              </div>
              {selectedExtras.map((item) => (
                <div key={item.id}>
                  <span>
                    {item.name} × {quantities[item.id]}
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
              onClick={() => (step < 2 ? move(step + 1) : void reserve())}
            >
              {busy
                ? t("กำลังบันทึก…", "Saving…")
                : step === 2
                  ? authenticated
                    ? t("ยืนยันสำรองโต๊ะ", "Reserve tables")
                    : t("เข้าสู่ระบบเพื่อสำรองโต๊ะ", "Sign in to reserve")
                  : t("ถัดไป", "Continue")}
              <ArrowRight size={18} />
            </button>
            <small className="bp-summary-hint">
              {t(
                "พักโต๊ะ 15 นาที · ยังไม่เปิดชำระผ่าน Gateway",
                "15-minute hold · Gateway payment not connected",
              )}
            </small>
          </aside>
        </div>
      )}
    </section>
  );
}
