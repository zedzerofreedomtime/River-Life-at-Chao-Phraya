import { ArrowRight, CalendarDays, MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { EventInfo } from "./api";
import type { Language } from "./i18n";

export type EventCategory =
  "all" | "festival" | "concert" | "fanmeet" | "special";

type DiscoveryCard = {
  category: EventCategory;
  image: string;
  title: { th: string; en: string };
  description: { th: string; en: string };
};

const discoveryCards: DiscoveryCard[] = [
  {
    category: "concert",
    image: "/images/boat/unicorn-night-exterior.jpg",
    title: {
      th: "River Life Live on the Chao Phraya",
      en: "River Life Live on the Chao Phraya",
    },
    description: {
      th: "คอนเสิร์ตดนตรีสดบนเรือ Unicorn Cruise",
      en: "A live music concert aboard Unicorn Cruise",
    },
  },
  {
    category: "festival",
    image: "/images/boat/unicorn-night-hero-gold.png",
    title: { th: "เทศกาลดนตรีริมสายน้ำ", en: "Music Festival on the River" },
    description: {
      th: "กำลังเตรียมประกาศรายละเอียดงาน",
      en: "Details will be announced soon",
    },
  },
  {
    category: "special",
    image: "/images/boat/unicorn-upper-deck.jpg",
    title: { th: "ค่ำคืนพิเศษบนเรือ", en: "A Special Night on Board" },
    description: {
      th: "กิจกรรมพิเศษสำหรับผู้ร่วมงาน River Life",
      en: "A special experience for River Life guests",
    },
  },
];

export default function Home({
  event,
  language,
  category,
  onOpenConcert,
}: {
  event: EventInfo;
  language: Language;
  category: EventCategory;
  onOpenConcert: () => void;
}) {
  const [query, setQuery] = useState("");
  const en = language === "en";
  const cards = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return discoveryCards.filter((card) => {
      const categoryMatches = category === "all" || card.category === category;
      const searchTarget =
        `${card.title.th} ${card.title.en} ${card.description.th} ${card.description.en}`.toLocaleLowerCase();
      return (
        categoryMatches &&
        (!normalizedQuery || searchTarget.includes(normalizedQuery))
      );
    });
  }, [category, query]);

  const eventDate =
    event.date || (en ? "Date to be announced" : "รอยืนยันวันจัดงาน");
  return (
    <section className="ticket-home">
      <section className="ticket-discovery" aria-labelledby="ticket-home-title">
        <div className="ticket-discovery-content">
          <h1 id="ticket-home-title">
            {en
              ? "Find your next night on the river"
              : "ค้นหาคอนเสิร์ตครั้งต่อไปบนสายน้ำ"}
          </h1>
          <label className="ticket-search" htmlFor="event-search">
            <Search aria-hidden="true" size={22} />
            <input
              id="event-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                en
                  ? "Search events, artists or experiences"
                  : "ค้นหาอีเวนต์ ศิลปิน หรือประสบการณ์"
              }
            />
          </label>
        </div>
      </section>

      <section
        className="ticket-featured"
        aria-labelledby="featured-event-title"
      >
        <img
          src="/images/boat/unicorn-night-hero-gold.png"
          alt="เรือ Unicorn Cruise ล่องบนแม่น้ำเจ้าพระยาในยามค่ำคืน"
        />
        <div className="ticket-featured-copy">
          <p>{en ? "River Life presents" : "River Life presents"}</p>
          <h2 id="featured-event-title">
            {en ? "Concerts on the Chao Phraya" : "คอนเสิร์ตบนแม่น้ำเจ้าพระยา"}
          </h2>
          <span>
            {en
              ? "Live music, dining and Bangkok's river view in one ticket."
              : "ดนตรีสด อาหาร และวิวแม่น้ำเจ้าพระยาในบัตรใบเดียว"}
          </span>
          <button onClick={onOpenConcert}>
            {en ? "See concert details" : "ดูรายละเอียดคอนเสิร์ต"}
            <ArrowRight aria-hidden="true" size={20} />
          </button>
        </div>
      </section>

      <section className="ticket-events" aria-labelledby="all-events-title">
        <div className="ticket-events-heading">
          <div>
            <h2 id="all-events-title">
              {en ? "Events on board" : "อีเวนต์บนเรือ"}
            </h2>
            <p>
              {category === "all"
                ? en
                  ? "Discover live moments on the Chao Phraya"
                  : "เลือกบัตรสำหรับประสบการณ์พิเศษบนแม่น้ำเจ้าพระยา"
                : en
                  ? "Results in your selected category"
                  : "ผลลัพธ์จากหมวดที่คุณเลือก"}
            </p>
          </div>
          <span>
            {cards.length} {en ? "events" : "อีเวนต์"}
          </span>
        </div>
        {cards.length ? (
          <div className="ticket-event-grid">
            {cards.map((card, index) => (
              <article className="ticket-event-card" key={card.title.en}>
                <img src={card.image} alt="" />
                <div>
                  <p className="ticket-card-date">
                    <CalendarDays aria-hidden="true" size={16} />
                    {index === 0
                      ? eventDate
                      : en
                        ? "Coming soon"
                        : "เร็ว ๆ นี้"}
                  </p>
                  <h3>{en ? card.title.en : card.title.th}</h3>
                  <p className="ticket-card-description">
                    {en ? card.description.en : card.description.th}
                  </p>
                  <p className="ticket-card-venue">
                    <MapPin aria-hidden="true" size={16} /> {event.pier}
                  </p>
                  <button onClick={onOpenConcert}>
                    {en ? "Details & tickets" : "รายละเอียดและบัตร"}
                    <ArrowRight aria-hidden="true" size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="ticket-empty-state">
            {en
              ? "No events match this search yet. Try another keyword or category."
              : "ยังไม่พบอีเวนต์ที่ตรงกับการค้นหา ลองเปลี่ยนคำค้นหาหรือหมวดหมู่"}
          </div>
        )}
      </section>
    </section>
  );
}
