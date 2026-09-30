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
      { th: "ผัดไทกุ้งสด", en: "FRIED NOODLE WITH SHRIMP" },
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
  const date = formatEventDate(event.date, language);
  const price = Math.min(...event.zones.map((zone) => zone.price)) / 100;
  const available = event.zones.reduce((total, zone) => total + zone.available, 0);
  const details = [
    {
      icon: CalendarDays,
      label: en ? "Event date" : "วันที่จัดงาน",
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
            {en ? "Home / Events on board" : "หน้าแรก / อีเวนต์บนเรือ"}
          </p>
          <article className="event-purchase-card">
            <div className="event-poster">
              <img
                src="/images/boat/unicorn-night-hero-gold.png"
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
                  ? "Live music and the Chao Phraya after dark aboard UNICRON CRUISE."
                  : "คอนเสิร์ตดนตรีสดและค่ำคืนบนแม่น้ำเจ้าพระยา"}
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
                {available === 0 ? (en ? "Sold out" : "บัตรหมด") : en ? "Choose tickets" : "เลือกโซนและซื้อบัตร"}
                <ArrowRight aria-hidden="true" size={21} />
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="event-detail-content">
        <article>
          <h2>{en ? "About this concert" : "เกี่ยวกับคอนเสิร์ตนี้"}</h2>
          <p>
            {en
              ? "River Life brings live music to the Chao Phraya aboard UNICRON CRUISE. Explore the river views, spaces on board, and the sample food menu before choosing a ticket zone. Ticket inclusions will be confirmed with the show details."
              : "River Life นำดนตรีสดมาสู่แม่น้ำเจ้าพระยาบนเรือ UNICRON CRUISE ชมวิว พื้นที่บนเรือ และตัวอย่างไลน์อาหารก่อนเลือกโซนบัตร ส่วนสิ่งที่รวมในบัตรจะยืนยันพร้อมรายละเอียดงาน"}
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
                  ? "Explore the sample menu below"
                  : "ดูตัวอย่างรายการอาหารด้านล่าง"
              }
            />
          </div>
        </article>
        <aside className="event-boarding-card">
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

      <section className="event-food-menu" aria-labelledby="event-food-menu-title">
        <div className="event-food-menu-intro">
          <div>
            <p className="event-food-menu-eyebrow">{en ? "ON-BOARD DINING" : "อาหารบนเรือ"}</p>
            <h2 id="event-food-menu-title">{en ? "Sample food menu" : "ตัวอย่างไลน์อาหาร"}</h2>
            <p>
              {en
                ? "A look at the dishes shown on the cruise food menu. Individual items and availability may change."
                : "รายการอาหารตามภาพเมนูของเรือ แต่ละรายการและความพร้อมให้บริการอาจเปลี่ยนแปลงได้"}
            </p>
          </div>
          <div className="event-food-menu-notice">
            {en
              ? "Food and drinks are not confirmed as included with the concert ticket. Check the final ticket conditions before purchasing."
              : "ยังไม่ได้ยืนยันว่าอาหารและเครื่องดื่มรวมอยู่ในราคาบัตรคอนเสิร์ต โปรดตรวจเงื่อนไขบัตรฉบับยืนยันก่อนซื้อ"}
          </div>
        </div>
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
