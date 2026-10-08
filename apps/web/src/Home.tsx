import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  Pause,
  Play,
  Ticket,
} from "lucide-react";
import { formatEventDate, formatPier, money, type EventInfo } from "./api";
import type { Language } from "./i18n";
import DiningGallery from "./DiningGallery";
import SailingCalendar from "./SailingCalendar";
import CruiseVideos from "./CruiseVideos";
import CruiseMenu from "./CruiseMenu";
import RiverHighlights from "./RiverHighlights";
import OnboardExperiences from "./OnboardExperiences";
import "./CultureHome.css";

const covers = [
  {
    src: "/images/river-life-culture-hero-v5.webp",
    width: 1902,
    height: 827,
    th: "ภาพแคมเปญ",
    en: "Campaign image",
    altTh:
      "ภาพแคมเปญจัดองค์ประกอบเรือ UNICORN CRUISE พรีเซนเตอร์ชุดแดงทอง และวัดอรุณ",
    altEn:
      "Campaign composite of UNICORN CRUISE, the presenter in her red and gold gown, and Wat Arun",
  },
  {
    src: "/images/boat/unicorn-night-exterior-enhanced-v1.webp",
    width: 1717,
    height: 916,
    th: "ภาพเรือปรับความคมชัด",
    en: "Enhanced cruise photo",
    altTh:
      "ภาพเรือ UNICORN CRUISE เต็มลำบนแม่น้ำเจ้าพระยา ปรับความคมชัดด้วย AI จากภาพถ่ายต้นฉบับ",
    altEn:
      "AI-enhanced original photograph of the complete UNICORN CRUISE vessel on the Chao Phraya",
  },
];

export default function Home({
  event,
  language,
  onOpenConcert,
  onOpenContact,
}: {
  event: EventInfo;
  language: Language;
  onOpenConcert: () => void;
  onOpenContact: () => void;
}) {
  const en = language === "en";
  const [cover, setCover] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (paused || interacting || reduceMotion) return;
    const timer = window.setInterval(
      () => setCover((current) => (current + 1) % covers.length),
      10000,
    );
    return () => window.clearInterval(timer);
  }, [paused, interacting, reduceMotion]);
  const lowestPrice = event.zones.length
    ? Math.min(...event.zones.map((zone) => zone.price))
    : null;
  const price =
    lowestPrice === null
      ? en
        ? "To be announced"
        : "รอยืนยันราคา"
      : en
        ? "THB " + new Intl.NumberFormat("en-GB").format(lowestPrice / 100)
        : money(lowestPrice);
  const steps = en
    ? [
        [
          "Choose a sailing",
          "Pick the date and explore what is included in that sailing.",
        ],
        [
          "Choose your places",
          "Sign in, select a zone and the number of guests.",
        ],
        ["Review & pay", "Check the sailing details and total before paying."],
        [
          "Board at the pier",
          "Bring your QR ticket at the stated boarding time.",
        ],
      ]
    : [
        [
          "เลือกรอบล่องเรือ",
          "เลือกวันและดูรายละเอียดประสบการณ์ที่รวมในรอบนั้น",
        ],
        ["เลือกที่นั่งของคุณ", "เข้าสู่ระบบ เลือกโซนและจำนวนผู้ร่วมเดินทาง"],
        ["ตรวจสอบและชำระเงิน", "ดูรายละเอียดรอบล่องเรือและยอดรวมก่อนชำระเงิน"],
        ["พบกันที่ท่าเรือ", "นำ QR Ticket มาแสดงตามเวลาขึ้นเรือของรอบที่จอง"],
      ];
  return (
    <div className="ticket-home culture-home">
      <section
        className="culture-hero"
        aria-labelledby="culture-home-title"
        onMouseEnter={() => setInteracting(true)}
        onMouseLeave={() => setInteracting(false)}
        onFocusCapture={() => setInteracting(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false);
        }}
      >
        <div className="culture-cover-images">
          {covers.map((image, index) => (
            <img
              key={image.src}
              src={image.src}
              alt={index === cover ? (en ? image.altEn : image.altTh) : ""}
              aria-hidden={index !== cover}
              className={index === cover ? "is-current" : ""}
              width={image.width}
              height={image.height}
              fetchPriority={index === 0 ? "high" : "low"}
              decoding="async"
            />
          ))}
        </div>
        <div className="culture-hero-copy">
          <h1 id="culture-home-title" lang="en">
            Symphony of
            <br />
            the Chao Phraya
          </h1>
          <p className="culture-tagline" lang="en">
            A River of Culture. A Night of Music.
          </p>
          <p className="culture-hero-description">
            {en
              ? "Cruise the Chao Phraya with River Life. Discover our river experiences and special concert sailings."
              : "จองล่องเรือเจ้าพระยากับ River Life พร้อมสัมผัสประสบการณ์บนสายน้ำและคอนเสิร์ตในรอบพิเศษ"}
          </p>
          <div className="culture-hero-actions">
            <a className="culture-button" href="#cruise-calendar">
              {en ? "Explore cruise dates" : "ดูรอบล่องเรือ"}
              <ArrowRight size={19} aria-hidden="true" />
            </a>
            <a className="culture-watch-link" href="#life-on-board">
              <span>
                <Play size={17} fill="currentColor" aria-hidden="true" />
              </span>
              {en ? "Watch life on board" : "ชมบรรยากาศจริง"}
            </a>
          </div>
        </div>
        <div className="culture-cover-controls">
          <span>
            {String(cover + 1).padStart(2, "0")} /{" "}
            {String(covers.length).padStart(2, "0")} ·{" "}
            {en ? covers[cover].en : covers[cover].th}
          </span>
          <button
            type="button"
            aria-label={en ? "Next cover image" : "ดูภาพปกถัดไป"}
            onClick={() => {
              setCover((current) => (current + 1) % covers.length);
              setPaused(true);
            }}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={
              paused || reduceMotion
                ? en
                  ? "Resume cover slideshow"
                  : "เล่นภาพปกอัตโนมัติ"
                : en
                  ? "Pause cover slideshow"
                  : "หยุดภาพปกอัตโนมัติ"
            }
            onClick={() => setPaused((current) => !current)}
            disabled={reduceMotion}
          >
            {paused || reduceMotion ? (
              <Play size={15} aria-hidden="true" />
            ) : (
              <Pause size={15} aria-hidden="true" />
            )}
          </button>
        </div>
      </section>
      <section
        className="culture-facts"
        aria-label={
          en ? "Featured sailing information" : "ข้อมูลรอบล่องเรือแนะนำ"
        }
      >
        <div className="culture-container">
          <div>
            <CalendarDays aria-hidden="true" />
            <p>
              <span>
                {event.date_is_preview
                  ? en
                    ? "Preview sailing date"
                    : "วันที่รอบตัวอย่าง"
                  : en
                    ? "Featured sailing"
                    : "รอบล่องเรือแนะนำ"}
              </span>
              <strong>{formatEventDate(event.date, language)}</strong>
            </p>
          </div>
          <div>
            <MapPin aria-hidden="true" />
            <p>
              <span>{en ? "Departure pier" : "ท่าเรือ"}</span>
              <strong>
                {formatPier(event.pier, event.pier_number, language)}
              </strong>
            </p>
          </div>
          <div>
            <Clock3 aria-hidden="true" />
            <p>
              <span>
                {en
                  ? "Boarding " + event.boarding
                  : "ขึ้นเรือ " + event.boarding}
              </span>
              <strong>
                {en
                  ? "Departure " + event.departure
                  : "ออกเรือ " + event.departure}
              </strong>
            </p>
          </div>
          <div>
            <Ticket aria-hidden="true" />
            <p>
              <span>
                {event.date_is_preview
                  ? en
                    ? "Preview price from"
                    : "ราคาตัวอย่างเริ่มต้น"
                  : en
                    ? "From, per guest"
                    : "เริ่มต้นต่อท่าน"}
              </span>
              <strong>{price}</strong>
            </p>
          </div>
        </div>
      </section>

      <SailingCalendar
        event={event}
        language={language}
        onOpenConcert={onOpenConcert}
      />
      <CruiseVideos language={language} />

      <section
        className="culture-story culture-container"
        aria-labelledby="culture-story-title"
      >
        <img
          src="/images/boat/unicorn-upper-deck-live.jpg"
          alt={
            en
              ? "Actual open deck, dining tables and live music stage on UNICORN CRUISE"
              : "ภาพจริงของดาดฟ้า โต๊ะอาหารและพื้นที่เวทีบนเรือ UNICORN CRUISE"
          }
          width={1477}
          height={1108}
          loading="lazy"
        />
        <div>
          <h2 id="culture-story-title">
            {en ? "A river of culture." : "สายน้ำแห่งวัฒนธรรม"}
          </h2>
          <p>
            {en
              ? "Discover the Chao Phraya with River Life, where Bangkok’s heritage and riverfront life become part of your journey."
              : "ล่องเรือเจ้าพระยากับ River Life สัมผัสเสน่ห์กรุงเทพฯ และวิถีชีวิตริมฝั่งที่เป็นส่วนหนึ่งของการเดินทาง"}
          </p>
          <p>
            {en
              ? "UNICORN CRUISE is at the heart of the experience. Our special concert sailings bring live music aboard — look for the programme on each date."
              : "เรือ UNICORN CRUISE คือหัวใจของประสบการณ์ และในรอบคอนเสิร์ตพิเศษ เราจะพาเสียงเพลงมาอยู่บนเรือ ดูโปรแกรมของแต่ละวันก่อนจอง"}
          </p>
          <a className="culture-text-link" href="#spaces-on-board">
            {en ? "Explore our boat" : "ทำความรู้จักเรือของเรา"}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
          <a className="culture-text-link" href="/concert#event-boarding">
            {en
              ? "Getting to " + event.pier + " · Pier " + event.pier_number
              : "การเดินทางไป " +
                formatPier(event.pier, event.pier_number, language)}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      </section>
      <RiverHighlights language={language} />
      <section
        id="spaces-on-board"
        className="culture-spaces culture-container"
        aria-labelledby="culture-spaces-title"
      >
        <OnboardExperiences language={language} />
        <details className="culture-river-context">
          <summary>
            {en
              ? "Read more about the Chao Phraya"
              : "ข้อมูลประกอบเกี่ยวกับแม่น้ำเจ้าพระยา"}
          </summary>
          <p>
            {en
              ? "For context, the Marine Department reported 7,264,336 passengers on Chao Phraya express boats in fiscal 2024. This is public-boat ridership, not a count of tourists or dinner-cruise guests."
              : "กรมเจ้าท่ารายงานผู้โดยสารเรือด่วนเลียบฝั่งแม่น้ำเจ้าพระยา 7,264,336 คนในปีงบประมาณ 2567 ตัวเลขนี้เป็นผู้โดยสารเรือด่วน ไม่ใช่จำนวนนักท่องเที่ยวหรือผู้โดยสารเรือดินเนอร์"}
          </p>
          <a
            href="https://www.tourismthailand.org/Articles/vijit-chao-phraya-2025-en"
            target="_blank"
            rel="noopener noreferrer"
          >
            {en
              ? "Tourism Authority of Thailand"
              : "การท่องเที่ยวแห่งประเทศไทย"}
          </a>
          {" · "}
          <a
            href="https://md.go.th/wp-content/uploads/2025/06/%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%AA%E0%B8%96%E0%B8%B4%E0%B8%95%E0%B8%B4%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%A1%E0%B8%B9%E0%B8%A5%E0%B8%9B%E0%B8%B5%E0%B8%87%E0%B8%9A%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%A1%E0%B8%B2%E0%B8%93-2567.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            {en
              ? "Marine Department statistics, table 15"
              : "สถิติกรมเจ้าท่า ตารางที่ 15"}
          </a>
        </details>
      </section>

      <section
        className="culture-dining culture-container"
        aria-labelledby="culture-dining-title"
      >
        <div className="culture-section-heading">
          <div>
            <h2 id="culture-dining-title">
              {en ? "A taste of life on board" : "มื้ออาหารบนสายน้ำ"}
            </h2>
            <p>
              {en
                ? "Real food, real river views. Explore the cruise menu before choosing your sailing."
                : "ชมภาพอาหารจริงและบรรยากาศมื้ออาหารบนเรือ พร้อมดูเมนูก่อนเลือกรอบล่องเรือ"}
            </p>
          </div>
          <a className="culture-text-link" href="/concert#event-food-menu">
            {en ? "View the food menu" : "ดูเมนูอาหาร"}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
        <DiningGallery language={language} />
        <CruiseMenu language={language} />
        <p className="culture-caption">
          {en
            ? "Dining is part of the on-board experience. Check the food and drinks included in your selected package."
            : "มื้ออาหารเป็นส่วนหนึ่งของประสบการณ์บนเรือ โปรดตรวจอาหารและเครื่องดื่มที่รวมในแพ็กเกจที่เลือก"}
        </p>
      </section>

      <section
        className="culture-booking culture-container"
        aria-labelledby="culture-booking-title"
      >
        <h2 id="culture-booking-title">
          {en
            ? "Your journey, step by step."
            : "จองล่องเรือกับเรา ใน 4 ขั้นตอน"}
        </h2>
        <ol>
          {steps.map(([title, text], index) => (
            <li key={index}>
              <span aria-hidden="true">0{index + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="culture-vip" aria-labelledby="culture-vip-title">
        <div className="culture-container">
          <div>
            <h2 id="culture-vip-title">
              {en ? "A table for your group?" : "อยากได้โต๊ะสำหรับกลุ่มของคุณ?"}
            </h2>
            <p>
              {en
                ? "For VIP tables, prepare your sailing date, guest count and preferred seating. Table availability and prices must be confirmed before payment."
                : "สำหรับโต๊ะ VIP เตรียมวันล่องเรือ จำนวนผู้ร่วมเดินทาง และพื้นที่ที่ต้องการ โดยต้องยืนยันโต๊ะว่างและราคาก่อนชำระเงิน"}
            </p>
          </div>
          <div>
            <button
              className="culture-button culture-button-outline"
              type="button"
              onClick={onOpenContact}
            >
              {en ? "Booking & VIP enquiries" : "ข้อมูลติดต่อและสอบถามโต๊ะ VIP"}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <p className="culture-caption">
              {en
                ? "Our contact details are pending confirmation."
                : "ช่องทางติดต่อของเรารอยืนยัน"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
