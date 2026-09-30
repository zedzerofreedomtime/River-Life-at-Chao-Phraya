import { ArrowRight, CalendarDays, Clock3, Ticket } from "lucide-react";
import { formatEventDate, formatPier, localizeEventTitle, money, type EventInfo } from "./api";
import type { Language } from "./i18n";

const gallery = [
  { src: "/images/boat/unicorn-upper-deck-live.jpg", th: "ดาดฟ้าและพื้นที่เวที", en: "Open deck and stage area" },
  { src: "/images/boat/unicorn-lower-deck-dining.jpg", th: "พื้นที่รับประทานอาหารชั้นล่าง", en: "Lower deck dining area" },
  { src: "/images/boat/unicorn-river-view.jpg", th: "วิวแม่น้ำจากบนเรือ", en: "River views from on board" },
];

export default function Home({
  event, language, onOpenConcert,
}: {
  event: EventInfo;
  language: Language;
  onOpenConcert: () => void;
}) {
  const en = language === "en";
  const lowestPrice = event.zones.length ? Math.min(...event.zones.map((zone) => zone.price)) : null;
  const eventDate = formatEventDate(event.date, language);

  return (
    <section className="ticket-home">
      <section className="ticket-featured" aria-labelledby="ticket-home-title">
        <img src="/images/boat/unicorn-night-hero-gold.png" alt={en ? "UNICRON CRUISE on the Chao Phraya at night" : "เรือ UNICRON CRUISE บนแม่น้ำเจ้าพระยายามค่ำคืน"} />
        <div className="ticket-featured-copy">
          <h1 id="ticket-home-title">{localizeEventTitle(event.title, language)}</h1>
          <div className="featured-facts">
            <span><CalendarDays aria-hidden="true" size={18} />{eventDate} · {formatPier(event.pier, event.pier_number, language)}</span>
            <span><Clock3 aria-hidden="true" size={18} />{en ? `Boarding ${event.boarding} · Departure ${event.departure}` : `ขึ้นเรือ ${event.boarding} · ออกเรือ ${event.departure}`}</span>
            <span><Ticket aria-hidden="true" size={18} />{lowestPrice === null ? (en ? "Price to be announced" : "รอยืนยันราคา") : `${en ? "From" : "เริ่มต้น"} ${money(lowestPrice)}`}</span>
          </div>
          <p className="ticket-featured-preview">{event.date_is_preview ? (en ? "Preview date and prices — not a live event announcement" : "วันและราคาเป็นตัวอย่าง · ยังไม่ใช่ประกาศขายจริง") : (en ? "Check event details before purchasing" : "ตรวจสอบรายละเอียดงานก่อนซื้อบัตร")}</p>
          <button onClick={onOpenConcert}>{en ? "Explore the concert" : "ดูคอนเสิร์ตนี้"}<ArrowRight aria-hidden="true" size={20} /></button>
        </div>
        <div className="ticket-featured-stage">
          <img src="/images/boat/unicorn-upper-deck-live.jpg" alt={en ? "Real upper deck with stage setup on UNICRON CRUISE" : "ภาพพื้นที่เวทีจริงบนดาดฟ้าเรือ UNICRON CRUISE"} />
        </div>
      </section>

      <section className="boat-experience" aria-labelledby="boat-experience-title">
        <div className="boat-experience-heading">
          <h2 id="boat-experience-title">{en ? "A look on board" : "ชมบรรยากาศบนเรือ"}</h2>
          <p>{en ? "Photos of the vessel and its spaces. Stage setup and event details may differ by show." : "ภาพพื้นที่จริงของเรือ การจัดเวทีและรายละเอียดงานอาจเปลี่ยนตามรอบแสดง"}</p>
        </div>
        <div className="boat-experience-gallery">
          {gallery.map((photo) => (
            <figure key={photo.src}>
              <img src={photo.src} alt={en ? photo.en : photo.th} loading="lazy" />
              <figcaption>{en ? photo.en : photo.th}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section className="river-story" aria-labelledby="river-story-title">
        <span>{en ? "THE RIVER" : "เรื่องราวของแม่น้ำ"}</span>
        <h2 id="river-story-title">{en ? "The Chao Phraya is part of Bangkok's story" : "เจ้าพระยา สายน้ำที่เล่าเรื่องกรุงเทพฯ"}</h2>
        <p>{en ? "From Wat Arun to the riverfront landmarks, the Chao Phraya connects historic culture with the city after dark. Enjoy the view while listening to a concert on board." : "จากวัดอรุณถึงสถานที่สำคัญริมฝั่ง แม่น้ำเจ้าพระยาเชื่อมวัฒนธรรมกับบรรยากาศกรุงเทพฯ ยามค่ำคืน มองวิวเมืองพร้อมฟังคอนเสิร์ตบนเรือ"}</p>
        <p>{en ? "For context, the Marine Department reported 7,264,336 passengers on Chao Phraya express boats in fiscal 2024. This is public-boat ridership, not a count of tourists or dinner-cruise guests." : "ข้อมูลประกอบ: กรมเจ้าท่ารายงานผู้โดยสารเรือด่วนเลียบฝั่งแม่น้ำเจ้าพระยา 7,264,336 คนในปีงบประมาณ 2567 ตัวเลขนี้เป็นผู้โดยสารเรือด่วน ไม่ใช่จำนวนนักท่องเที่ยวหรือผู้โดยสารเรือดินเนอร์"}</p>
        <small>{en ? "River context: " : "ข้อมูลเกี่ยวกับแม่น้ำ: "}<a href="https://www.tourismthailand.org/Articles/vijit-chao-phraya-2025-en" target="_blank" rel="noopener noreferrer">{en ? "Tourism Authority of Thailand" : "การท่องเที่ยวแห่งประเทศไทย"}</a></small>
        <small> · <a href="https://md.go.th/wp-content/uploads/2025/06/%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%AA%E0%B8%96%E0%B8%B4%E0%B8%95%E0%B8%B4%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%A1%E0%B8%B9%E0%B8%A5%E0%B8%9B%E0%B8%B5%E0%B8%87%E0%B8%9A%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%A1%E0%B8%B2%E0%B8%93-2567.pdf" target="_blank" rel="noopener noreferrer">{en ? "Marine Department statistics, table 15" : "สถิติกรมเจ้าท่า ตารางที่ 15"}</a></small>
      </section>
    </section>
  );
}
