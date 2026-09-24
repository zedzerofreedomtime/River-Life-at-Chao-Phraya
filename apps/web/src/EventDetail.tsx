import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Music2,
  Ticket,
  Utensils,
} from "lucide-react";
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
  const date =
    event.date || (en ? "Date to be announced" : "รอยืนยันวันจัดงาน");
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
      value: en ? `${event.pier} Pier` : `ท่าเรือ ${event.pier}`,
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
              <h1>{event.title}</h1>
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
              <p className="event-price-note">{en ? "Ticket prices are provisional until the event is confirmed." : "ราคาบัตรชั่วคราว รอยืนยันรายละเอียดงาน"}</p>
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
              ? "River Life brings live music to the Chao Phraya aboard UNICRON CRUISE. Explore the river views and spaces on board before choosing a ticket zone. Food service and event inclusions will be confirmed with the show details."
              : "River Life นำดนตรีสดมาสู่แม่น้ำเจ้าพระยาบนเรือ UNICRON CRUISE ชมวิวและพื้นที่บนเรือก่อนเลือกโซนบัตร ส่วนอาหารและสิ่งที่รวมในบัตรจะยืนยันพร้อมรายละเอียดงาน"}
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
                  ? "Food service details will be confirmed with the event"
                  : "รายละเอียดอาหารจะประกาศพร้อมงาน"
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
              <dd>{event.pier}</dd>
            </div>
          </dl>
          <p>
            {en
              ? "Please arrive before boarding time. Guests who miss the boat are treated as no-show."
              : "กรุณามาถึงก่อนเวลาขึ้นเรือ ผู้ที่มาสายจนไม่ทันเรือจะถือเป็น No-show"}
          </p>
        </aside>
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
