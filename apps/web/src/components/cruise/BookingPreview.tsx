import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  ConciergeBell,
  Info,
  MapPin,
  Minus,
  Plus,
  Ship,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import type { Language } from "../../data/i18n";
import "../../BookingPreview.css";
import DetailedDeckPlan from "./DetailedDeckPlan";
import ExtrasCategoryPicker, { extraCategories } from "./ExtrasCategoryPicker";
import {
  previewTables as demoTables,
  type PreviewDeck as Deck,
} from "../../data/bookingPreviewPlan";

const boat = {
  id: "unicorn",
  name: "Unicorn Cruise",
  crop: "0 459 660 370",
  pier: "ICONSIAM",
  time: "19:00–21:00",
} as const;
const extras = [
  {
    id: "prawns",
    th: "กุ้งแม่น้ำย่าง",
    en: "Grilled river prawns",
    detail: "เสิร์ฟเป็นจานสำหรับแบ่งกันบนโต๊ะ",
    english: "A sharing plate for your table",
    price: 1200,
    unit: "จาน",
    unitEn: "plate",
    image: "/images/food-gallery/buffet-03-v2.webp",
    category: "food",
  },
  {
    id: "seafood",
    th: "ซีฟู้ดจานพิเศษ",
    en: "Seafood sharing platter",
    detail: "เพิ่มมื้อพิเศษสำหรับค่ำคืนของคุณ",
    english: "An extra treat for your evening",
    price: 1600,
    unit: "ชุด",
    unitEn: "platter",
    image: "/images/food-gallery/buffet-02-v2.webp",
    category: "food",
  },
  {
    id: "red-wine",
    th: "ไวน์แดง",
    en: "Red wine",
    detail: "เลือกเป็นขวดเพื่อแบ่งกันที่โต๊ะ",
    english: "A bottle to share at your table",
    price: 1400,
    unit: "ขวด",
    unitEn: "bottle",
    image: "/images/booking/wine-preview.png",
    category: "wine",
  },
  {
    id: "white-wine",
    th: "ไวน์ขาว",
    en: "White wine",
    detail: "อีกหนึ่งตัวเลือกสำหรับมื้อพิเศษ",
    english: "Another pairing for your dinner",
    price: 1400,
    unit: "ขวด",
    unitEn: "bottle",
    image: "/images/booking/wine-preview.png",
    category: "wine",
  },
] as const;
type Step = 0 | 1 | 2;
type PreviewVessel = typeof boat;
function BoatPhoto({ boat }: { boat: PreviewVessel }) {
  return (
    <svg
      className="bp-boat-photo"
      viewBox={boat.crop}
      role="img"
      aria-label={boat.name}
      preserveAspectRatio="xMidYMid slice"
    >
      <image
        href="/images/boat/river-life-four-vessels.png"
        width="1259"
        height="829"
      />
    </svg>
  );
}

export default function BookingPreview({
  language,
  onBack,
}: {
  language: Language;
  onBack: () => void;
}) {
  const seatMode = true;
  const en = language === "en";
  const t = (th: string, english: string) => (en ? english : th);
  const [step, setStep] = useState<Step>(0);
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(1);
  const [deck, setDeck] = useState<Deck>("upper");
  const [selected, setSelected] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [category, setCategory] = useState("all");
  const [requests, setRequests] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const chosen = demoTables.filter((table) =>
    selected.some((id) => id === table.id || id.startsWith(table.id + ":")),
  );
  const tableTotal = chosen.reduce(
    (sum, table) =>
      sum +
      (seatMode
        ? (table.price / table.seats) *
          selected.filter((id) => id.startsWith(table.id + ":")).length
        : table.price),
    0,
  );
  const selectedExtras = extras.filter(
    (item) => (quantities[item.id] ?? 0) > 0,
  );
  const extraTotal = selectedExtras.reduce(
    (sum, item) => sum + item.price * quantities[item.id],
    0,
  );
  const total = tableTotal + extraTotal;
  const valid =
    !!date &&
    !!boat.time &&
    chosen.length > 0 &&
    Number.isInteger(guests) &&
    guests >= 1 &&
    guests <= 32 &&
    (seatMode ? guests === selected.length : guests <= chosen.length * 4);
  const price = (value: number) =>
    new Intl.NumberFormat(en ? "en-GB" : "th-TH", {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 0,
    }).format(value);
  const formattedDate = date
    ? new Intl.DateTimeFormat(en ? "en-GB" : "th-TH", {
        dateStyle: "long",
        timeZone: "Asia/Bangkok",
      }).format(new Date(`${date}T12:00:00+07:00`))
    : t("ยังไม่ได้เลือกวัน", "Choose a date");
  const stages = [
    t("เลือกรอบและโต๊ะ", "Sailing & tables"),
    t("เติมเต็มมื้อพิเศษ", "Dining extras"),
    t("ตรวจสอบรายการ", "Review"),
  ];
  const navigate = (next: Step) => {
    setStep(next);
    setSaveError("");
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  };
  const changeQty = (id: string, change: number) =>
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.min(10, Math.max(0, (prev[id] ?? 0) + change)),
    }));
  function savePreview() {
    if (!valid) {
      navigate(0);
      return;
    }
    try {
      // Preview data stays in this tab. No live booking or payment request is made.
      sessionStorage.setItem(
        "riverlife.booking-preview.v1",
        JSON.stringify({
          preview: true,
          vessel: boat.id,
          date,
          guests,
          tables: seatMode ? chosen.map((table) => table.id) : selected,
          seat_ids: seatMode ? selected : [],
          extras: selectedExtras.map((item) => ({
            id: item.id,
            quantity: quantities[item.id],
            samplePrice: item.price,
          })),
          notes,
          requests,
          sampleTotal: total,
        }),
      );
      setSaved(true);
    } catch {
      setSaveError(
        t(
          "เบราว์เซอร์บันทึกตัวอย่างไม่ได้ กรุณาลองใหม่",
          "Your browser could not save this preview. Please retry.",
        ),
      );
    }
  }
  if (saved)
    return (
      <section
        className="booking-preview bp-success"
        aria-labelledby="bp-success-title"
      >
        <CheckCircle2 size={52} />
        <h1 id="bp-success-title">
          {t("บันทึกตัวอย่างรายการแล้ว", "Your sample itinerary is saved")}
        </h1>
        <p>
          {t(
            "ตัวอย่างนี้เก็บไว้ในแท็บนี้เท่านั้น ยังไม่ได้จองโต๊ะหรือสั่งอาหารจริง",
            "This preview is stored in this tab only. No tables or extras have been booked.",
          )}
        </p>
        <div className="bp-success-receipt">
          <strong>{boat.name}</strong>
          <p>
            {formattedDate} · {boat.time}
          </p>
          <p>
            {selected.join(", ")} · {guests} {t("คน", "guests")}
          </p>
          <span>{t("ยอดรวมตัวอย่าง", "Sample total")}</span>
          <b>{price(total)}</b>
        </div>
        <div className="bp-actions">
          <button
            className="bp-secondary"
            onClick={() => {
              setSaved(false);
              navigate(2);
            }}
          >
            {t("กลับไปแก้ไข", "Edit selection")}
          </button>
          <button className="bp-primary" onClick={onBack}>
            {t("กลับไปรอบล่องเรือ", "Back to cruises")}
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    );
  return (
    <section className="booking-preview" aria-labelledby="bp-heading">
      <button className="bp-back" onClick={onBack}>
        <ArrowLeft size={17} />
        {t("รอบล่องเรือและจอง", "Cruises & booking")}
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
            onClick={() => navigate(index as Step)}
          >
            <span>{index < step ? <Check size={16} /> : index + 1}</span>
            <strong>{label}</strong>
          </button>
        ))}
      </nav>
      <div className="bp-heading-row">
        <div>
          <h1 ref={heading} tabIndex={-1} id="bp-heading">
            {step === 0
              ? t("เลือกค่ำคืนบนเรือของคุณ", "Choose your evening on the river")
              : stages[step]}
          </h1>
          <p>
            {step === 0
              ? t(
                  "เลือกรอบเดินทางและโต๊ะบน Unicorn Cruise",
                  "Choose your sailing and tables aboard Unicorn Cruise",
                )
              : step === 1
                ? t(
                    "เลือกสิ่งที่ชอบ แล้วให้ค่ำคืนนี้พิเศษขึ้นอีกนิด",
                    "A little extra to make your evening special",
                  )
                : t(
                    "ทุกอย่างที่คุณเลือก รวมไว้ในที่เดียว",
                    "Everything you chose, together in one place",
                  )}
          </p>
        </div>
        <span className="bp-preview-label">
          <Info size={15} />
          {t("โหมดทดลอง · ยังไม่เปิดขาย", "Preview · not on sale")}
        </span>
      </div>
      <div className="bp-layout">
        <div className="bp-content" key={step}>
          {step === 0 && (
            <>
              <div className="bp-current-vessel">
                <BoatPhoto boat={boat} />
                <div>
                  <h2>Unicorn Cruise</h2>
                  <p>
                    {t(
                      "ล่องเจ้าพระยา · ขึ้นเรือที่ ICONSIAM",
                      "Chao Phraya cruise · Boarding at ICONSIAM",
                    )}
                  </p>
                </div>
              </div>
              <>
                <div className="bp-fields">
                  <label>
                    <span>
                      <CalendarDays size={17} />
                      {t("วันที่เดินทาง (ทดลอง)", "Sailing date (preview)")}
                    </span>
                    <input
                      aria-label={t("วันที่เดินทาง", "Sailing date")}
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    <span>
                      <Clock3 size={17} />
                      {t("รอบเดินทาง (เวลาไทย)", "Sailing (Bangkok time)")}
                    </span>
                    <select
                      aria-label={t("รอบเดินทาง", "Sailing time")}
                      value={boat.time}
                      onChange={() => {}}
                    >
                      <option>{boat.time}</option>
                    </select>
                  </label>
                  <label>
                    <span>
                      <Users size={17} />
                      {t("จำนวนผู้ร่วมเดินทาง", "Number of guests")}
                    </span>
                    <input
                      aria-label={t("จำนวนผู้ร่วมเดินทาง", "Number of guests")}
                      type="number"
                      min={1}
                      max={32}
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                    />
                  </label>
                </div>
                <div className="bp-pier">
                  <MapPin size={16} />
                  {t("จุดขึ้นเรือ", "Boarding at")} {boat.pier}
                </div>
                <div className="bp-table-heading">
                  <h2 className="bp-section-title">
                    {t("เลือกที่นั่งของคุณ", "Choose your seats")}
                  </h2>
                  <div className="bp-decks" aria-label={t("ชั้นเรือ", "Deck")}>
                    <button
                      aria-pressed={deck === "upper"}
                      onClick={() => setDeck("upper")}
                    >
                      {t("ชั้นบน", "Upper deck")}
                    </button>
                    <button
                      aria-pressed={deck === "lower"}
                      onClick={() => setDeck("lower")}
                    >
                      {t("ชั้นล่าง", "Lower deck")}
                    </button>
                  </div>
                </div>
                <p className="bp-muted">
                  {t(
                    "ผังและราคาเพื่อทดลองเท่านั้น · เลือกเก้าอี้ได้ตามจำนวนผู้เดินทาง",
                    "Sample plan and prices · Choose one chair per guest",
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
                  inventory={demoTables.map((table) => ({
                    ...table,
                    seatPrice: table.price / table.seats,
                  }))}
                  deck={deck}
                  language={language}
                  selected={selected}
                  onToggle={(id) =>
                    setSelected((prev) =>
                      prev.includes(id)
                        ? prev.filter((value) => value !== id)
                        : [...prev, id],
                    )
                  }
                />
                {chosen.length > 0 &&
                  (seatMode
                    ? guests !== selected.length
                    : guests > chosen.length * 4) && (
                    <p className="bp-error" role="alert">
                      {t(
                        "กรุณาเลือกเก้าอี้ให้ตรงจำนวนผู้เดินทาง",
                        "Choose one chair per guest.",
                      )}
                    </p>
                  )}
                <div className="bp-included">
                  <UtensilsCrossed size={21} />
                  <div>
                    <strong>
                      {t(
                        "บุฟเฟ่ต์รวมอยู่ในค่าที่นั่งแล้ว",
                        "Buffet is included in your seat price",
                      )}
                    </strong>
                    <p>
                      {t(
                        "ขั้นตอนถัดไปเป็นอาหารพิเศษและไวน์ที่เลือกเพิ่มได้",
                        "Special dishes and wine are optional in the next step",
                      )}
                    </p>
                  </div>
                </div>
              </>
            </>
          )}
          {step === 1 && (
            <>
              <div className="bp-included">
                <UtensilsCrossed size={23} />
                <div>
                  <strong>
                    {t(
                      "มีบุฟเฟ่ต์ให้คุณอยู่แล้ว",
                      "Your buffet is already included",
                    )}
                  </strong>
                  <p>
                    {t(
                      "รายการด้านล่างมีค่าใช้จ่ายเพิ่มเติม เลือกเพิ่มหรือข้ามได้เลย",
                      "These optional extras cost more. Choose your favourites or skip this step.",
                    )}
                  </p>
                </div>
              </div>
              <p className="bp-muted bp-sample-note">
                {t(
                  "เมนู ราคา และภาพเป็นตัวอย่างประกอบการออกแบบ ยังไม่ใช่รายการที่เรือเปิดจำหน่าย",
                  "Menus, prices and photos are design examples, not confirmed products for sale.",
                )}
              </p>
              <ExtrasCategoryPicker
                language={language}
                selected={category}
                counts={{
                  food: (quantities.prawns ?? 0) + (quantities.seafood ?? 0),
                  wine:
                    (quantities["red-wine"] ?? 0) +
                    (quantities["white-wine"] ?? 0),
                }}
                requests={requests}
                onSelect={setCategory}
              />
              {!["all", "food", "wine"].includes(category) && (
                <div className="bp-enquiry-card">
                  <h3>
                    {en
                      ? extraCategories.find((item) => item.id === category)?.en
                      : extraCategories.find((item) => item.id === category)
                          ?.th}
                  </h3>
                  <p>
                    {t(
                      "รายการนี้เป็นคำขอรอยืนยัน ยังไม่มีราคาและยังไม่รวมในยอดชำระ ทีมงานต้องยืนยันว่าจัดเตรียมได้ก่อน",
                      "This is an enquiry, with no price added to your total. The team must confirm availability and any charges.",
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
                      ? t("นำคำขอนี้ออก", "Remove this enquiry")
                      : t("เพิ่มเป็นคำขอรอยืนยัน", "Add an enquiry")}
                    <Plus size={16} />
                  </button>
                  <button
                    className="bp-text-button"
                    onClick={() => document.getElementById("bp-notes")?.focus()}
                  >
                    {t("เขียนรายละเอียดเพิ่มเติม", "Add more details")}
                  </button>
                </div>
              )}
              <div className="bp-extras">
                {extras
                  .filter(
                    (item) => category === "all" || item.category === category,
                  )
                  .map((item) => (
                    <article className="bp-extra" key={item.id}>
                      <img
                        src={item.image}
                        alt={en ? item.en : item.th}
                        loading="lazy"
                      />
                      <div className="bp-extra-body">
                        <h2>{en ? item.en : item.th}</h2>
                        <p>{en ? item.english : item.detail}</p>
                        <div className="bp-extra-footer">
                          <div>
                            <strong>{price(item.price)}</strong>
                            <small>
                              {" "}
                              / {en ? item.unitEn : item.unit} ·{" "}
                              {t("ตัวอย่าง", "sample")}
                            </small>
                          </div>
                          <div
                            className="bp-quantity"
                            role="group"
                            aria-label={en ? item.en : item.th}
                          >
                            <button
                              aria-label={`${t("ลด", "Remove")} ${en ? item.en : item.th}`}
                              disabled={!quantities[item.id]}
                              onClick={() => changeQty(item.id, -1)}
                            >
                              <Minus size={16} />
                            </button>
                            <output aria-live="polite">
                              {quantities[item.id] ?? 0}
                            </output>
                            <button
                              aria-label={`${t("เพิ่ม", "Add")} ${en ? item.en : item.th}`}
                              disabled={quantities[item.id] === 10}
                              onClick={() => changeQty(item.id, 1)}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
              <label className="bp-notes" htmlFor="bp-notes">
                {t(
                  "แจ้งความต้องการเพิ่มเติม (ไม่บังคับ)",
                  "Special requests (optional)",
                )}
                <textarea
                  id="bp-notes"
                  maxLength={500}
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t(
                    "เช่น แพ้อาหาร หรือโอกาสพิเศษที่อยากแจ้งทีมงาน",
                    "Food allergies or a special occasion",
                  )}
                />
                <small>
                  {t(
                    "คำขอยังต้องได้รับการยืนยันจากทีมงาน",
                    "Requests require confirmation from the team",
                  )}
                </small>
              </label>
              <div className="bp-actions">
                <button className="bp-secondary" onClick={() => navigate(0)}>
                  <ArrowLeft size={17} />
                  {t("ย้อนกลับ", "Back")}
                </button>
                <button
                  className="bp-text-button"
                  onClick={() => {
                    setQuantities({});
                    navigate(2);
                  }}
                >
                  {t("ข้ามโดยไม่เพิ่มรายการ", "Continue without extras")}
                  <ArrowRight size={17} />
                </button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="bp-review-block">
                <div className="bp-block-title">
                  <h2>
                    <Ship size={21} />
                    {t("ข้อมูลการเดินทาง", "Your sailing")}
                  </h2>
                  <button
                    className="bp-text-button"
                    onClick={() => navigate(0)}
                  >
                    {t("แก้ไข", "Edit")}
                  </button>
                </div>
                <div className="bp-review-vessel">
                  <BoatPhoto boat={boat} />
                  <div>
                    <h3>{boat.name}</h3>
                    <p>
                      {formattedDate} · {boat.time}
                    </p>
                    <p>
                      {boat.pier} · {guests} {t("คน", "guests")}
                    </p>
                  </div>
                </div>
                <div className="bp-review-tables">
                  {chosen.map((table) => (
                    <span key={table.id}>
                      {table.id} ·{" "}
                      {table.deck === "upper"
                        ? t("ชั้นบน", "Upper deck")
                        : t("ชั้นล่าง", "Lower deck")}{" "}
                      ·{" "}
                      {seatMode
                        ? selected
                            .filter((id) => id.startsWith(table.id + ":"))
                            .join(", ")
                        : `4 ${t("ที่นั่ง", "seats")}`}
                    </span>
                  ))}
                </div>
                <p className="bp-review-included">
                  <Check size={17} />
                  {t("รวมบุฟเฟ่ต์แล้ว", "Buffet included")}
                </p>
              </div>
              <div className="bp-review-block">
                <div className="bp-block-title">
                  <h2>
                    <ConciergeBell size={21} />
                    {t("อาหารและไวน์เพิ่มเติม", "Dining extras")}
                  </h2>
                  <button
                    className="bp-text-button"
                    onClick={() => navigate(1)}
                  >
                    {t("แก้ไข", "Edit")}
                  </button>
                </div>
                {selectedExtras.length ? (
                  selectedExtras.map((item) => (
                    <div className="bp-review-extra" key={item.id}>
                      <img src={item.image} alt="" />
                      <div>
                        <strong>{en ? item.en : item.th}</strong>
                        <small>
                          {quantities[item.id]} {en ? item.unitEn : item.unit} ×{" "}
                          {price(item.price)}
                        </small>
                      </div>
                      <b>{price(item.price * quantities[item.id])}</b>
                    </div>
                  ))
                ) : (
                  <p className="bp-muted">
                    {t(
                      "ไม่ได้เลือกบริการเสริม · เพลิดเพลินกับบุฟเฟ่ต์ที่รวมไว้ได้เลย",
                      "No extras selected. Enjoy your included buffet.",
                    )}
                  </p>
                )}
                {requests.length > 0 && (
                  <div className="bp-review-requests">
                    <strong>
                      {t(
                        "คำขอรอยืนยัน · ยังไม่รวมค่าใช้จ่าย",
                        "Enquiries · charges not yet included",
                      )}
                    </strong>
                    {requests.map((id) => (
                      <p key={id}>
                        <Check size={15} />
                        {en
                          ? extraCategories.find((item) => item.id === id)?.en
                          : extraCategories.find((item) => item.id === id)?.th}
                      </p>
                    ))}
                  </div>
                )}
                {notes.trim() && (
                  <p className="bp-request-text">
                    {t("คำขอเพิ่มเติม", "Special requests")}: {notes}
                  </p>
                )}
              </div>
              <div className="bp-notice">
                <Info size={20} />
                <p>
                  {t(
                    "นี่เป็นตัวอย่างการจองเท่านั้น ปุ่มบันทึกจะเก็บตัวอย่างในแท็บนี้ ยังไม่จองจริงและไม่มีการชำระเงิน",
                    "This is a booking preview. Saving keeps it in this tab only, without a live booking or payment.",
                  )}
                </p>
              </div>
              {saveError && (
                <p role="alert" className="bp-error">
                  {saveError}
                </p>
              )}
              <button className="bp-secondary" onClick={() => navigate(1)}>
                <ArrowLeft size={17} />
                {t("ย้อนกลับ", "Back")}
              </button>
            </>
          )}
        </div>
        <aside
          className="bp-summary"
          aria-label={t("สรุปรายการจอง", "Booking summary")}
        >
          <h2>{t("สรุปรายการของคุณ", "Your evening")}</h2>
          <div className="bp-summary-vessel">
            <BoatPhoto boat={boat} />
            <div>
              <strong>{boat.name}</strong>
              <small>{boat.pier || t("รอยืนยัน", "To be confirmed")}</small>
            </div>
          </div>
          <dl className="bp-summary-details">
            <div>
              <dt>
                <CalendarDays size={16} />
                {t("วันเดินทาง", "Date")}
              </dt>
              <dd>{formattedDate}</dd>
            </div>
            <div>
              <dt>
                <Clock3 size={16} />
                {t("รอบเรือ", "Sailing")}
              </dt>
              <dd>{boat.time || "—"}</dd>
            </div>
            <div>
              <dt>
                <Users size={16} />
                {t("ผู้ร่วมเดินทาง", "Guests")}
              </dt>
              <dd>
                {guests || 0} {t("คน", "guests")}
              </dd>
            </div>
            <div>
              <dt>{t("ที่นั่งที่เลือก", "Seats")}</dt>
              <dd>
                {selected.length
                  ? selected.join(", ")
                  : t("ยังไม่ได้เลือก", "Not selected")}
              </dd>
            </div>
          </dl>
          <div className="bp-price-rows">
            <div>
              <span>{t("ค่าที่นั่ง (ตัวอย่าง)", "Seating (sample)")}</span>
              <b data-testid="bp-table-total">{price(tableTotal)}</b>
            </div>
            {selectedExtras.map((item) => (
              <div key={item.id}>
                <span>
                  {en ? item.en : item.th} × {quantities[item.id]}
                </span>
                <b>{price(item.price * quantities[item.id])}</b>
              </div>
            ))}
            <div>
              <span>{t("รายการเพิ่มเติม", "Extras")}</span>
              <b data-testid="bp-extras-total">{price(extraTotal)}</b>
            </div>
          </div>
          {requests.length > 0 && (
            <p className="bp-summary-enquiry">
              {requests.length}{" "}
              {t(
                "คำขอรอยืนยัน · ยังไม่รวมราคา",
                "enquiries pending confirmation · not priced",
              )}
            </p>
          )}
          <div className="bp-grand-total">
            <span>{t("ยอดรวมตัวอย่าง", "Sample total")}</span>
            <strong data-testid="bp-total">{price(total)}</strong>
          </div>
          <p className="bp-summary-buffet">
            <Check size={16} />
            {t(
              "รวมบุฟเฟ่ต์ในค่าที่นั่งแล้ว",
              "Buffet included with your tables",
            )}
          </p>
          <button
            className="bp-primary"
            disabled={!valid}
            onClick={() =>
              step === 2 ? savePreview() : navigate((step + 1) as Step)
            }
          >
            {step === 0
              ? t("ถัดไป · มื้อพิเศษ", "Next · Dining extras")
              : step === 1
                ? t("ตรวจสอบรายการ", "Review selection")
                : t("บันทึกตัวอย่างรายการ", "Save sample itinerary")}
            <ArrowRight size={18} />
          </button>
          {step === 0 && !valid && (
            <small className="bp-summary-hint">
              {t(
                "เลือกวันและโต๊ะให้เพียงพอกับจำนวนคน",
                "Choose a date and enough tables for your group",
              )}
            </small>
          )}
          <small className="bp-summary-hint">
            {t(
              "ราคาและผังเป็นตัวอย่าง ยังไม่เปิดขายจริง",
              "Sample prices and plan. Not on sale yet.",
            )}
          </small>
        </aside>
      </div>
    </section>
  );
}
