import { useEffect, useState } from "react";
import { ArrowRight, ChevronRight, Pause, Play } from "lucide-react";
import type { Language } from "../../data/i18n";

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

export default function CultureHero({ language }: { language: Language }) {
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

  return (
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
    </section>
  );
}
