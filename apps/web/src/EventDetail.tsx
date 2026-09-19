import {
  Anchor,
  ArrowRight,
  CalendarDays,
  Camera,
  Clock3,
  Diamond,
  MapPin,
  Music2,
  ShipWheel,
  Utensils,
  UsersRound,
  Waves,
} from "lucide-react";
import { useState } from "react";
import type { EventInfo } from "./api";
import type { Language } from "./i18n";

export default function EventDetail({
  event,
  onStartCheckout,
  language,
}: {
  event: EventInfo;
  onStartCheckout: (zone?: string) => void;
  language: Language;
}) {
  const en = language === "en";
  const programme = en
    ? [
        ["Welcome", "Meet the team at ICONSIAM Pier."],
        ["Live music", "Settle in with a live music performance."],
        [
          "Thai riverside performance",
          "A special cultural performance along the river.",
        ],
        ["Live music", "Enjoy music throughout the cruise."],
      ]
    : [
        ["Welcome", "ต้อนรับผู้ร่วมงาน ณ ท่าเรือ ICONSIAM"],
        ["Live music", "เริ่มต้นด้วยเสียงดนตรีสดไพเราะ"],
        ["หนุมาน – นางมัจฉา", "การแสดงพิเศษริมสายน้ำ ถ่ายทอดเสน่ห์วัฒนธรรมไทย"],
        ["Live music", "สนุกต่อเนื่องไปกับบทเพลงตลอดการล่องเรือ"],
      ];
  const vessel = {
    id: "unicorn-cruise",
    name: en ? "Unicorn Cruise" : "ยูนิคอร์นครูซ",
    detail: en
      ? "250 upper-deck tickets · 100 lower-deck tickets"
      : "ดาดฟ้าบน 250 ใบ · ชั้นล่าง 100 ใบ",
    image: "/images/boat/unicorn-night-exterior.jpg",
    capacity: en ? "350 guests" : "350 ท่าน",
    pier: en ? "ICONSIAM Pier" : "ท่าเรือ ICONSIAM",
    departure: en ? "Departs 19:00" : "ออกเรือ 19:00",
  };
  return (
    <>
      <section className="event-hero river-landing-hero">
        <img
          src="/images/boat/unicorn-night-hero-gold.png"
          alt={
            en
              ? "Unicorn Cruise on the Chao Phraya at night"
              : "เรือ Unicorn Cruise ล่องแม่น้ำเจ้าพระยายามค่ำคืน"
          }
        />
        <div className="event-hero-copy">
          <h1>
            {en ? (
              <>
                Concerts on the <em>Chao Phraya</em>
              </>
            ) : (
              <>
                คอนเสิร์ตบน<em>แม่น้ำเจ้าพระยา</em>
              </>
            )}
          </h1>
          <p>
            {en
              ? "Live music. Fine dining. Unforgettable views in the heart of Bangkok."
              : "ดนตรีสด อาหารพิเศษ และวิวประทับใจใจกลางกรุงเทพฯ"}
          </p>
          <button className="hero-explore" onClick={() => onStartCheckout()}>
            {en ? "Explore the cruise" : "สำรวจการล่องเรือ"}
            <ArrowRight aria-hidden="true" size={21} />
          </button>
        </div>
        <p className="hero-signature">
          Live the River
          <br />
          Love the Journey ♡
        </p>
        <button
          className="hero-arrow hero-arrow-left"
          aria-label={en ? "Previous slide" : "ภาพก่อนหน้า"}
        >
          ‹
        </button>
        <button
          className="hero-arrow hero-arrow-right"
          aria-label={en ? "Next slide" : "ภาพถัดไป"}
        >
          ›
        </button>
      </section>
      <AvailabilityPanel
        language={language}
        onStartCheckout={onStartCheckout}
      />
      <section
        className="river-benefits"
        aria-label={en ? "Highlights" : "จุดเด่น"}
      >
        <Benefit
          icon={Music2}
          title={en ? "World-Class Concerts" : "คอนเสิร์ตระดับพรีเมียม"}
          text={en ? "Live music with iconic views" : "ดนตรีสดพร้อมวิวแม่น้ำ"}
        />
        <Benefit
          icon={Utensils}
          title={en ? "Exceptional Dining" : "มื้ออาหารพิเศษ"}
          text={
            en ? "A culinary journey on the river" : "ประสบการณ์รสชาติบนสายน้ำ"
          }
        />
        <Benefit
          icon={Camera}
          title={en ? "Unrivaled Views" : "วิวที่น่าประทับใจ"}
          text={
            en
              ? "Bangkok's most breathtaking skyline"
              : "เส้นขอบฟ้ากรุงเทพฯ ที่งดงาม"
          }
        />
        <Benefit
          icon={Diamond}
          title={en ? "Premium Experience" : "ประสบการณ์พรีเมียม"}
          text={en ? "Moments that stay with you" : "ช่วงเวลาที่น่าจดจำ"}
        />
      </section>
      <section
        className="event-facts"
        aria-label={en ? "Cruise information" : "ข้อมูลการเดินทาง"}
      >
        <Fact
          icon={MapPin}
          label="ICONSIAM"
          value={en ? "ICONSIAM Pier" : "ท่าเรือ ICONSIAM"}
        />
        <Fact
          icon={Clock3}
          label={
            en ? `Board by ${event.boarding}` : `ขึ้นเรือก่อน ${event.boarding}`
          }
          value={
            en
              ? "Please arrive before boarding time."
              : "กรุณามาถึงก่อนเวลาที่กำหนด"
          }
        />
        <Fact
          icon={ShipWheel}
          label={
            en ? `Departs ${event.departure}` : `ออกเรือ ${event.departure}`
          }
          value={
            en ? "The cruise departs on schedule." : "เริ่มล่องตามกำหนดการ"
          }
        />
        <Fact
          icon={Waves}
          label={en ? "Two-hour cruise" : "ล่องเรือ 2 ชั่วโมง"}
          value={
            en
              ? "Take in the river from both banks."
              : "สัมผัสบรรยากาศสองฝั่งพระยา"
          }
        />
      </section>
      <section className="event-content">
        <article className="event-story">
          <span className="event-kicker">
            {en ? "ABOUT THIS EVENT" : "เกี่ยวกับงานนี้"}
          </span>
          <div className="event-heading-row">
            <h2>{en ? "An evening on the river" : "รายละเอียดงานแสดง"}</h2>
            <span>
              MORE THAN A CONCERT
              <br />A NIGHT ON THE RIVER
            </span>
          </div>
          <p>
            {en
              ? "Enjoy live music and a one-of-a-kind river-cruise experience. Every moment is designed to become a lasting Bangkok memory."
              : "ดื่มด่ำกับดนตรี การแสดง และประสบการณ์สุดพิเศษบนเรือสำราญกลางแม่น้ำเจ้าพระยา ให้ทุกช่วงเวลาของค่ำคืนนี้ เป็นความทรงจำที่งดงาม"}
          </p>
          <h3>{en ? "Evening schedule" : "กำหนดการ (Rundown)"}</h3>
          <ol className="rundown">
            {programme.map(([name, detail]) => (
              <li key={`${name}-${detail}`}>
                <strong>{name}</strong>
                <span>{detail}</span>
              </li>
            ))}
          </ol>
          <div className="event-notes">
            <div>
              <Utensils aria-hidden="true" />
              <p>
                <strong>
                  {en ? "Dinner on board" : "อิ่มอร่อยกับบุฟเฟต์ดินเนอร์"}
                </strong>
                {en
                  ? "A curated dinner experience is served throughout the cruise."
                  : "บริการอาหารบุฟเฟต์หลากหลายเมนู ตลอดการล่องเรือ"}
              </p>
            </div>
            <div>
              <Clock3 aria-hidden="true" />
              <p>
                <strong>
                  {en ? "Arrival policy" : "เงื่อนไขการเข้าร่วมงาน"}
                </strong>
                {en
                  ? "Guests who miss boarding time forfeit their booking and are not eligible for a refund."
                  : "หากไม่มาแสดงตัวภายในเวลาที่กำหนด ถือว่าสละสิทธิ์ และไม่สามารถขอคืนบัตรได้"}
              </p>
            </div>
          </div>
          <span className="event-signoff">BANGKOK LIVES ON THE RIVER</span>
        </article>
        <aside className="ticket-picker">
          <h2>{en ? "Choose your vessel" : "เลือกเรือ"}</h2>
          <p>
            {en
              ? "Choose a vessel to select your zone and tickets."
              : "เลือกเรือก่อนเข้าสู่ขั้นตอนเลือกโซนและบัตร"}
          </p>
          <article className="booking-vessel-card" key={vessel.id}>
            <img src={vessel.image} alt={`เรือ ${vessel.name}`} />
            <div className="booking-vessel-copy">
              <small>{vessel.departure}</small>
              <strong>{vessel.name}</strong>
              <em>{vessel.detail}</em>
              <div className="booking-vessel-meta">
                <span>
                  <MapPin aria-hidden="true" size={15} /> {vessel.pier}
                </span>
                <span>
                  <UsersRound aria-hidden="true" size={15} /> {vessel.capacity}
                </span>
              </div>
            </div>
            <button onClick={() => onStartCheckout()}>
              {en ? "Choose Unicorn Cruise" : "เลือกเรือลำนี้"}{" "}
              <ArrowRight aria-hidden="true" size={18} />
            </button>
          </article>
          <small>
            {en
              ? "Prices are provisional and subject to confirmation."
              : "ราคาเป็นข้อมูลชั่วคราว รอยืนยันก่อนเปิดขายจริง"}
          </small>
        </aside>
      </section>
    </>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div>
      <Icon aria-hidden="true" />
      <span>
        <strong>{label}</strong>
        {value}
      </span>
    </div>
  );
}

function AvailabilityPanel({
  language,
  onStartCheckout,
}: {
  language: Language;
  onStartCheckout: () => void;
}) {
  const [tab, setTab] = useState("cruise");
  const en = language === "en";
  const tabs = [
    ["cruise", Anchor, en ? "Book a Cruise" : "จองการล่องเรือ"],
    ["events", CalendarDays, en ? "Events & Concerts" : "อีเวนต์และคอนเสิร์ต"],
    ["packages", Diamond, en ? "Special Packages" : "แพ็กเกจพิเศษ"],
    ["group", UsersRound, en ? "Group & Private Charter" : "กรุ๊ปและเหมาลำ"],
  ] as const;
  return (
    <section
      className="availability-panel"
      aria-label={en ? "Cruise availability" : "ตรวจสอบรอบเรือ"}
    >
      <div className="availability-tabs" role="tablist">
        {tabs.map(([value, Icon, label]) => (
          <button
            aria-selected={tab === value}
            className={tab === value ? "active" : ""}
            key={value}
            onClick={() => setTab(value)}
            role="tab"
            type="button"
          >
            <Icon aria-hidden="true" size={24} />
            {label}
          </button>
        ))}
      </div>
      <div className="availability-fields">
        <label>
          {en ? "Cruise Date" : "วันที่ล่องเรือ"}
          <span>
            <CalendarDays aria-hidden="true" size={20} />
            {en ? "Select date" : "เลือกวันที่"}
            <Chevron />
          </span>
        </label>
        <label>
          {en ? "Guests" : "จำนวนผู้โดยสาร"}
          <span>
            <UsersRound aria-hidden="true" size={20} />
            {en ? "2 Adults" : "ผู้ใหญ่ 2 ท่าน"}
            <Chevron />
          </span>
        </label>
        <label>
          {en ? "Cruise Type" : "รูปแบบการล่องเรือ"}
          <span>
            <Anchor aria-hidden="true" size={20} />
            {en ? "All Cruises" : "ทุกรอบเรือ"}
            <Chevron />
          </span>
        </label>
        <button
          className="availability-cta"
          onClick={onStartCheckout}
          type="button"
        >
          {en ? "Check Availability" : "ตรวจสอบที่นั่งว่าง"}
          <ArrowRight aria-hidden="true" size={22} />
        </button>
      </div>
    </section>
  );
}

function Chevron() {
  return (
    <span aria-hidden="true" className="field-chevron">
      ⌄
    </span>
  );
}

function Benefit({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Music2;
  title: string;
  text: string;
}) {
  return (
    <article>
      <span>
        <Icon aria-hidden="true" size={28} />
      </span>
      <p>
        <strong>{title}</strong>
        {text}
      </p>
    </article>
  );
}
