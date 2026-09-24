import { ArrowRight, CalendarDays, MapPin, Search, Ticket } from "lucide-react";
import { useState } from "react";
import { money, type EventInfo } from "./api";
import type { Language } from "./i18n";

export type EventCategory = "all" | "festival" | "concert" | "fanmeet" | "special";

const categories: { value: EventCategory; th: string; en: string }[] = [
  { value: "all", th: "งานทั้งหมด", en: "All events" },
  { value: "festival", th: "เทศกาลดนตรี", en: "Music festivals" },
  { value: "concert", th: "คอนเสิร์ต", en: "Concerts" },
  { value: "fanmeet", th: "แฟนมีตติ้ง", en: "Fan meetings" },
  { value: "special", th: "กิจกรรมพิเศษ", en: "Special events" },
];

const gallery = [
  { src: "/images/boat/unicorn-upper-deck-live.jpg", th: "ดาดฟ้าและพื้นที่เวที", en: "Open deck and stage area" },
  { src: "/images/boat/unicorn-lower-deck-dining.jpg", th: "พื้นที่รับประทานอาหารชั้นล่าง", en: "Lower deck dining area" },
  { src: "/images/boat/unicorn-river-view.jpg", th: "วิวแม่น้ำจากบนเรือ", en: "River views from on board" },
];

export default function Home({
  event, language, category, onCategoryChange, onOpenConcert,
}: {
  event: EventInfo;
  language: Language;
  category: EventCategory;
  onCategoryChange: (category: EventCategory) => void;
  onOpenConcert: () => void;
}) {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [artist, setArtist] = useState("");
  const en = language === "en";
  const lowestPrice = event.zones.length ? Math.min(...event.zones.map((zone) => zone.price)) : null;
  const available = event.zones.reduce((total, zone) => total + zone.available, 0);
  const eventDate = event.date || (en ? "Date to be announced" : "รอยืนยันวันจัดงาน");
  const term = query.trim().toLocaleLowerCase();
  const matchesSearch = !term || `${event.title} UNICRON CRUISE ICONSIAM ${(event.artists || []).join(" ")}`.toLocaleLowerCase().includes(term);
  const matchesDate = !date || (event.date !== null && event.date.slice(0, 10) === date);
  const matchesPrice = !maxPrice || (lowestPrice !== null && lowestPrice <= Number(maxPrice) * 100);
  const matchesArtist = !artist || (event.artists || []).includes(artist);
  const eventMatches = (category === "all" || category === "concert") && matchesSearch && matchesDate && matchesPrice && matchesArtist;

  return (
    <section className="ticket-home">
      <section className="ticket-discovery" aria-labelledby="ticket-home-title">
        <div className="ticket-discovery-content">
          <h1 id="ticket-home-title">{en ? "Concerts on the Chao Phraya" : "คอนเสิร์ตบนแม่น้ำเจ้าพระยา"}</h1>
          <p>{en ? "Find your night of music on board." : "ค้นหาค่ำคืนแห่งเสียงเพลงบนเรือ"}</p>
          <label className="ticket-search" htmlFor="event-search">
            <Search aria-hidden="true" size={22} />
            <input id="event-search" type="search" value={query} onChange={(change) => setQuery(change.target.value)} placeholder={en ? "Search events" : "ค้นหาชื่องาน"} />
          </label>
        </div>
      </section>

      <section className="ticket-featured" aria-labelledby="featured-event-title">
        <img src="/images/boat/unicorn-night-hero-gold.png" alt={en ? "UNICRON CRUISE on the Chao Phraya at night" : "เรือ UNICRON CRUISE บนแม่น้ำเจ้าพระยายามค่ำคืน"} />
        <div className="ticket-featured-copy">
          <h2 id="featured-event-title">{event.title}</h2>
          <span>{en ? "Live music and Bangkok's river views on board UNICRON CRUISE." : "ดนตรีสดและวิวกรุงเทพฯ ยามค่ำคืนบนเรือ UNICRON CRUISE"}</span>
          <div className="featured-facts">
            <span><CalendarDays aria-hidden="true" size={18} />{eventDate}</span>
            <span><Ticket aria-hidden="true" size={18} />{lowestPrice === null ? (en ? "Price to be announced" : "รอยืนยันราคา") : `${en ? "From" : "เริ่มต้น"} ${money(lowestPrice)}`}</span>
            <span>{en ? `${available} tickets available` : `คงเหลือ ${available} ใบ`}</span>
          </div>
          <button onClick={onOpenConcert}>{en ? "View concert & tickets" : "ดูรายละเอียดและบัตร"}<ArrowRight aria-hidden="true" size={20} /></button>
          <small>{en ? "Ticket prices are provisional until the event is confirmed." : "ราคาบัตรชั่วคราว รอยืนยันรายละเอียดงาน"}</small>
        </div>
      </section>

      <section className="ticket-events" aria-labelledby="all-events-title">
        <div className="ticket-events-heading">
          <div>
            <h2 id="all-events-title">{en ? "Events on board" : "งานบนเรือ"}</h2>
            <p>{en ? "Explore announced events and choose your tickets." : "ดูงานที่ประกาศแล้วและเลือกบัตรของคุณ"}</p>
          </div>
          <span>{eventMatches ? 1 : 0} {en ? "events" : "งาน"}</span>
        </div>
        <div className="event-category-filter" role="group" aria-label={en ? "Event categories" : "หมวดงาน"}>
          {categories.map((item) => (
            <button key={item.value} type="button" className={category === item.value ? "active" : ""} aria-pressed={category === item.value} onClick={() => onCategoryChange(item.value)}>
              {en ? item.en : item.th}
            </button>
          ))}
        </div>
        <div className="event-filter-row">
          <label><span>{en ? "Event date" : "วันที่จัดงาน"}</span><input type="date" value={date} onChange={(change) => setDate(change.target.value)} disabled={!event.date} /></label>
          <label><span>{en ? "Maximum starting price" : "ราคาเริ่มต้นไม่เกิน"}</span>
            <select value={maxPrice} onChange={(change) => setMaxPrice(change.target.value)}>
              <option value="">{en ? "Any price" : "ทุกราคา"}</option>
              <option value="1000">฿1,000</option><option value="1500">฿1,500</option>
              <option value="2000">฿2,000</option><option value="3000">฿3,000</option>
            </select>
          </label>
          <label><span>{en ? "Artist" : "ศิลปิน"}</span>
            <select value={artist} onChange={(change) => setArtist(change.target.value)} disabled={!event.artists?.length}>
              <option value="">{en ? "All artists" : "ศิลปินทั้งหมด"}</option>
              {(event.artists || []).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          {(!event.date || !event.artists?.length) && <p>{en ? "Date and artist filters become available when those details are announced." : "ตัวกรองวันที่และศิลปินจะเปิดเมื่อมีการประกาศข้อมูล"}</p>}
        </div>
        {eventMatches ? (
          <article className="ticket-event-card">
            <img src="/images/boat/unicorn-night-exterior.jpg" alt={en ? "UNICRON CRUISE at night" : "เรือ UNICRON CRUISE ยามค่ำคืน"} />
            <div>
              <p className="ticket-card-date"><CalendarDays aria-hidden="true" size={16} />{eventDate}</p>
              <h3>{event.title}</h3>
              <p className="ticket-card-description">{en ? "A live concert experience on the Chao Phraya." : "คอนเสิร์ตดนตรีสดบนแม่น้ำเจ้าพระยา"}</p>
              <p className="ticket-card-venue"><MapPin aria-hidden="true" size={16} />{event.pier}</p>
              <div className="ticket-card-bottom">
                <strong>{lowestPrice === null ? (en ? "Price TBA" : "รอยืนยันราคา") : `${en ? "From" : "เริ่มต้น"} ${money(lowestPrice)}`}</strong>
                <span>{en ? `${available} left` : `เหลือ ${available} ใบ`}</span>
              </div>
              <button onClick={onOpenConcert}>{en ? "Details & tickets" : "รายละเอียดและบัตร"}<ArrowRight aria-hidden="true" size={17} /></button>
            </div>
          </article>
        ) : (
          <div className="ticket-empty-state">{en ? "No announced events match these filters yet." : "ยังไม่มีงานที่ประกาศในหมวดหรือเงื่อนไขนี้"}</div>
        )}
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
    </section>
  );
}
