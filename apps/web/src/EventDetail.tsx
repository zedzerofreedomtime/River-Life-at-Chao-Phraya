import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Music2,
  Ticket,
  Utensils,
} from "lucide-react";
import { formatEventDate, formatPier, localizeEventTitle, type EventInfo } from "./api";
import type { Language } from "./i18n";
import DiningGallery from "./DiningGallery";
import CruiseMenu from "./CruiseMenu";
import { useEffect } from "react";

const foodMenu = [
  {
    th: "สลัด",
    en: "SALADS",
    items: [
      { th: "สลัดซีซาร์", en: "CAESAR SALAD" },
      { th: "ลาบไก่", en: "SPICY MINCED CHICKEN SALAD" },
      { th: "ส้มตำ", en: "PAPAYA SALAD WITH SHRIMP" },
    ],
  },
  {
    th: "ซูชิ",
    en: "SUSHI",
    items: [
      { th: "ซูชิรวม", en: "MIXED SUSHI" },
      { th: "ปูอัด", en: "CRAB STICKS" },
    ],
  },
  {
    th: "ซุป",
    en: "SOUPS",
    items: [
      { th: "ต้มยำกุ้ง", en: "TOM YUM GOONG" },
      { th: "ซุปข้าวโพด", en: "CORN SOUP" },
    ],
  },
  {
    th: "อาหารทะเล",
    en: "SEAFOOD",
    items: [
      { th: "กุ้งแม่น้ำ", en: "RIVER PRAWN ON ICE" },
      { th: "หอยชิลี", en: "CHILE CLAMS ON ICE" },
      { th: "แซลมอน", en: "SALMON" },
    ],
  },
  {
    th: "อาหารหลัก",
    en: "MAIN DISHED",
    items: [
      { th: "ผัดไทยกุ้งสด", en: "FRIED NOODLE WITH SHRIMP" },
      { th: "เต้าหู้ทรงเครื่อง", en: "FRIED TOFU WITH GRAVY SAUCE" },
      { th: "ไก่ทอดซอสเทอริยากิ", en: "CHICKEN TERIYAKI" },
      { th: "มักกะโรนี ซอสมะเขือเทศ", en: "MACARONI TOMATO SAUCE" },
      { th: "ปลาผัดขึ้นฉ่าย", en: "STIR-FRIED FISH WITH CELERY" },
      { th: "หอยชิลีผัดผงหม่าล่า", en: "STIR-FRIED CLAMS WITH MALA POWDER" },
      { th: "ผัดผักซอสน้ำมันหอย", en: "STIR-FRIED VEGETABLES IN OYSTER SAUCE" },
      { th: "ขนมจีนน้ำยาปลาแซลมอน", en: "SALMON CURRY SAUCE WITH RICE NOODLES" },
      { th: "เฟรนฟราย", en: "FRENCH FRIES" },
      { th: "ข้าวผัดไข่", en: "EGG FRIED RICE" },
      { th: "ข้าวสวย", en: "STEAMED RICE" },
    ],
  },
  {
    th: "ของหวาน",
    en: "DESSERTS",
    items: [
      { th: "กล้วยอบ ซอสคาราเมล & ช็อคโกแลต", en: "BAKED BANANA WITH CARAMEL & CHOCOLATE SAUCE" },
      { th: "เค้กนานาชนิด", en: "VARIETY OF CAKES" },
      { th: "ผลไม้ตามฤดูกาล", en: "SEASONAL FRUIT" },
      { th: "ชา กาแฟ", en: "COFFEE OR TEA" },
    ],
  },
] as const;

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
  useEffect(() => {
    if (!["#event-food-menu", "#event-boarding"].includes(window.location.hash)) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const date = formatEventDate(event.date, language);
  const price = Math.min(...event.zones.map((zone) => zone.price)) / 100;
  const available = event.zones.reduce((total, zone) => total + zone.available, 0);
  const details = [
    {
      icon: CalendarDays,
      label: en ? "Sailing date" : "วันที่ล่องเรือ",
      value: date,
    },
    {
      icon: Clock3,
      label: en ? "Boarding and departure" : "ขึ้นเรือและออกเรือ",
      value: en
        ? `Board ${event.boarding} · depart ${event.departure}`
        : `ขึ้นเรือ ${event.boarding} · ออกเรือ ${event.departure}`,
    },
    {
      icon: Ticket,
      label: en ? "Tickets from" : "บัตรเริ่มต้น",
      value: en
        ? `${new Intl.NumberFormat("th-TH").format(price)} THB`
        : `${new Intl.NumberFormat("th-TH").format(price)} บาท`,
    },
    {
      icon: Ticket,
      label: en ? "Tickets available" : "บัตรคงเหลือ",
      value: en ? `${available} tickets` : `${available} ใบ`,
    },
    {
      icon: MapPin,
      label: en ? "Boarding point" : "จุดขึ้นเรือ",
      value: formatPier(event.pier, event.pier_number, language),
    },
  ];

  return (
    <>
      <section className="event-purchase-hero">
        <div className="event-purchase-container">
          <p className="event-breadcrumb">
            {en ? "Home / Cruise experiences" : "หน้าแรก / ประสบการณ์ล่องเรือ"}
          </p>
          <article className="event-purchase-card">
            <div className="event-poster">
              <img
                src="/images/boat/unicorn-night-hero-gold.webp"
                alt={
                  en
                    ? "UNICRON CRUISE on the Chao Phraya at night"
                    : "เรือ UNICRON CRUISE ล่องแม่น้ำเจ้าพระยายามค่ำคืน"
                }
              />
              <span>{en ? "LIVE ON THE RIVER" : "LIVE ON THE RIVER"}</span>
            </div>
            <div className="event-purchase-info">
              <h1>{localizeEventTitle(event.title, language)}</h1>
              <p className="event-purchase-summary">
                {en
                  ? "Book your sailing with River Life. This special cruise programme brings live music aboard UNICORN CRUISE."
                  : "จองล่องเรือกับ River Life รอบพิเศษนี้จะพาเสียงเพลงมาอยู่บนเรือ UNICORN CRUISE"}
              </p>
              <dl className="event-key-details">
                {details.map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <dt>
                      <Icon aria-hidden="true" size={20} />
                    </dt>
                    <dd>
                      <strong>{label}</strong>
                      <span>{value}</span>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="event-price-note">{event.date_is_preview
                ? (en ? "Preview only: date and ticket prices are examples, not a live event announcement. Do not make a real payment." : "ตัวอย่างเท่านั้น: วันงานและราคาบัตรยังไม่ใช่ประกาศขายจริง กรุณาอย่าชำระเงินจริง")
                : (en ? "Check the event terms and ticket inclusions before purchasing." : "ตรวจสอบเงื่อนไขงานและสิ่งที่รวมในบัตรก่อนซื้อ")}</p>
              <button
                className="event-buy-button"
                onClick={() => onStartCheckout()}
                disabled={available === 0}
              >
                {available === 0 ? (en ? "Fully booked" : "เต็มแล้ว") : en ? "Choose seating & book" : "เลือกโซนและจองล่องเรือ"}
                <ArrowRight aria-hidden="true" size={21} />
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="event-detail-content">
        <article>
          <h2>{en ? "About this sailing" : "เกี่ยวกับรอบล่องเรือนี้"}</h2>
          <p>
            {en
              ? "Book your Chao Phraya journey with River Life aboard UNICORN CRUISE. Dining, river views and on-board entertainment are part of the regular experience. This sailing also features our special concert programme; its artist lineup and ticket inclusions will be announced separately."
              : "จองล่องเรือเจ้าพระยากับ River Life บนเรือ UNICORN CRUISE มื้ออาหาร วิวแม่น้ำ และความบันเทิงเป็นประสบการณ์พื้นฐานบนเรือ รอบนี้มีโปรแกรมคอนเสิร์ตพิเศษเพิ่มเติม โดยรายชื่อศิลปินและสิ่งที่รวมในบัตรจะประกาศสำหรับรอบนี้"}
          </p>
          <div className="event-detail-highlights">
            <Highlight
              icon={Music2}
              title={en ? "Live music" : "ดนตรีสด"}
              text={
                en
                  ? "A concert setting on the river"
                  : "เพลิดเพลินกับการแสดงบนสายน้ำ"
              }
            />
            <Highlight
              icon={Utensils}
              title={en ? "Dining experience" : "มื้ออาหารบนเรือ"}
              text={
                en
                  ? "Explore the cruise menu below"
                  : "ดูเมนูอาหารของเรือด้านล่าง"
              }
            />
          </div>
        </article>
        <aside id="event-boarding" className="event-boarding-card">
          <h2>{en ? "Before you board" : "ก่อนขึ้นเรือ"}</h2>
          <dl>
            <div>
              <dt>{en ? "Boarding" : "เวลาเช็กอิน"}</dt>
              <dd>{event.boarding}</dd>
            </div>
            <div>
              <dt>{en ? "Departure" : "เวลาออกเรือ"}</dt>
              <dd>{event.departure}</dd>
            </div>
            <div>
              <dt>{en ? "Meeting point" : "จุดนัดพบ"}</dt>
              <dd>{formatPier(event.pier, event.pier_number, language)}</dd>
            </div>
          </dl>
          <p>
            {en
              ? "Please arrive before boarding time. Artist lineup, ticket inclusions, and cancellation or refund terms are pending confirmation."
              : "กรุณามาถึงก่อนเวลาขึ้นเรือ รายชื่อศิลปิน สิ่งที่รวมในบัตร และเงื่อนไขยกเลิกหรือคืนเงินยังรอยืนยัน"}
          </p>
        </aside>
      </section>

      <section id="event-food-menu" className="event-food-menu" aria-labelledby="event-food-menu-title">
        <div className="event-food-menu-intro">
          <div>
            <p className="event-food-menu-eyebrow">{en ? "ON-BOARD DINING" : "อาหารบนเรือ"}</p>
            <h2 id="event-food-menu-title">{en ? "On-board food menu" : "ไลน์อาหารบนเรือ"}</h2>
            <p>
              {en
                ? "Explore the UNICORN CRUISE menu, with Thai dishes, seafood and desserts."
                : "เมนูอาหารจาก UNICORN CRUISE ทั้งอาหารไทย ซีฟู้ด และของหวาน"}
            </p>
          </div>
          <div className="event-food-menu-notice">
            {en
              ? "Please check the food and drinks included in your selected ticket package before paying."
              : "โปรดตรวจรายละเอียดอาหารและเครื่องดื่มที่รวมในแพ็กเกจบัตรที่เลือกก่อนชำระเงิน"}
          </div>
        </div>
        <DiningGallery language={language} />
        <CruiseMenu language={language} />
        <div className="event-food-menu-grid">
          {foodMenu.map((category) => (
            <article className="event-food-menu-card" key={category.en}>
              <h3>{en ? category.en : category.th}</h3>
              <ul>
                {category.items.map((item) => (
                  <li key={item.en}>{en ? item.en : item.th}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function Highlight({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Music2;
  title: string;
  text: string;
}) {
  return (
    <div>
      <span>
        <Icon aria-hidden="true" size={22} />
      </span>
      <p>
        <strong>{title}</strong>
        {text}
      </p>
    </div>
  );
}
