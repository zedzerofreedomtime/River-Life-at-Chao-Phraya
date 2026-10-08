import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react";
import type { Language } from "./i18n";

const highlights = [
  { th: "วัดอรุณราชวราราม", en: "Wat Arun", group: "heritage" },
  { th: "พระบรมมหาราชวัง", en: "The Grand Palace", group: "heritage" },
  { th: "วัดพระเชตุพนฯ (วัดโพธิ์)", en: "Wat Pho", group: "heritage" },
  { th: "วัดกัลยาณมิตรวรมหาวิหาร", en: "Wat Kalayanamit", group: "heritage" },
  { th: "สะพานพระราม 8", en: "Rama VIII Bridge", group: "landmarks" },
  {
    th: "สะพานพระพุทธยอดฟ้า",
    en: "Phra Phuttha Yodfa Bridge",
    group: "landmarks",
  },
  {
    th: "มิลเลนเนียม ฮิลตัน กรุงเทพฯ",
    en: "Millennium Hilton Bangkok",
    group: "landmarks",
  },
  { th: "ไอคอนสยาม", en: "ICONSIAM", group: "landmarks" },
  { th: "ริเวอร์ซิตี้ แบงค็อก", en: "River City Bangkok", group: "landmarks" },
  {
    th: "เอเชียทีค เดอะ ริเวอร์ฟร้อนท์",
    en: "Asiatique The Riverfront",
    group: "landmarks",
  },
];

const scenicPhotos = [
  {
    th: "วัดอรุณราชวราราม",
    en: "Wat Arun",
    descriptionTh: "พระปรางค์ริมแม่น้ำและแสงสีทองยามค่ำคืน",
    descriptionEn: "The riverside temple and its golden evening glow.",
    src: "/images/landmarks/wat-arun-riverside.jpg",
    width: 960,
    height: 640,
    position: "center",
    author: "McKay Savage",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    source:
      "https://commons.wikimedia.org/wiki/File:Wat_Arun_aglow_at_night_(6491938121).jpg",
  },
  {
    th: "พระบรมมหาราชวัง",
    en: "The Grand Palace",
    descriptionTh: "ยอดปราสาทและสถาปัตยกรรมไทยในย่านพระนคร",
    descriptionEn: "Royal spires and Thai architecture in Bangkok’s old town.",
    src: "/images/landmarks/grand-palace-night.jpg",
    width: 960,
    height: 720,
    position: "center 60%",
    author: "Theerapon Bunnak",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    source:
      "https://commons.wikimedia.org/wiki/File:Grand_Palace_at_a_night_in_Bangkok.jpg",
  },
  {
    th: "สะพานพระราม 8",
    en: "Rama VIII Bridge",
    descriptionTh: "แนวสายเคเบิลและแสงสะท้อนบนผืนน้ำ",
    descriptionEn: "Sweeping bridge cables and reflections on the river.",
    src: "/images/landmarks/rama-viii-night.jpg",
    width: 960,
    height: 731,
    position: "center",
    author: "Stygiangloom",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    source:
      "https://commons.wikimedia.org/wiki/File:Rama_VIII_Bridge_at_night.jpg",
  },
  {
    th: "ไอคอนสยาม",
    en: "ICONSIAM",
    descriptionTh: "แสงเมืองริมเจ้าพระยาและจุดขึ้นเรือท่าที่ 4",
    descriptionEn: "Waterfront city lights and our boarding point at Pier 4.",
    src: "/images/landmarks/iconsiam-twilight.jpg",
    width: 960,
    height: 720,
    position: "center",
    author: "Abasaa",
    license: "Public domain",
    licenseUrl:
      "https://commons.wikimedia.org/wiki/File:ICONSIAM_at_twilight_01.JPG#Licensing",
    source:
      "https://commons.wikimedia.org/wiki/File:ICONSIAM_at_twilight_01.JPG",
  },
];

export default function RiverHighlights({ language }: { language: Language }) {
  const en = language === "en";
  const heritage = highlights.filter((place) => place.group === "heritage");
  const riverfront = highlights.filter((place) => place.group === "landmarks");
  const trackRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () => {
      const card = track.firstElementChild as HTMLElement | null;
      if (!card) return;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const visible = Math.max(
        1,
        Math.round((track.clientWidth + gap) / (card.offsetWidth + gap)),
      );
      const count = Math.ceil(scenicPhotos.length / visible);
      const max = track.scrollWidth - track.clientWidth;
      setPageCount(count);
      setPage(max > 0 ? Math.round((track.scrollLeft / max) * (count - 1)) : 0);
    };
    const observer = new ResizeObserver(update);
    observer.observe(track);
    update();
    return () => observer.disconnect();
  }, []);

  const scrollToPage = (next: number) => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    track.scrollTo({
      left:
        (Math.max(0, Math.min(next, pageCount - 1)) /
          Math.max(1, pageCount - 1)) *
        max,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  return (
    <section
      id="river-highlights"
      className="culture-route culture-container"
      aria-labelledby="culture-route-title"
    >
      <div className="culture-section-heading">
        <div>
          <span className="culture-route-eyebrow">
            {en
              ? "THE CITY, SEEN FROM THE RIVER"
              : "กรุงเทพฯ ในมุมมองจากสายน้ำ"}
          </span>
          <h2 id="culture-route-title">
            {en ? "The sights along our journey" : "จุดหมายของเรา"}
          </h2>
          <p>
            {en
              ? "Take in Bangkok’s historic temples, bridges and riverside icons from on board. Keep your camera ready as the city unfolds along the river."
              : "ชมวัดสำคัญ สะพาน และแลนด์มาร์กริมแม่น้ำจากบนเรือ เตรียมกล้องให้พร้อมแล้วเก็บภาพกรุงเทพฯ ในมุมมองจากเจ้าพระยา"}
          </p>
        </div>
        <a className="culture-text-link" href="#cruise-calendar">
          {en ? "Find a sailing" : "เลือกรอบล่องเรือ"}
          <ArrowRight size={18} aria-hidden="true" />
        </a>
      </div>

      <div
        className="culture-sights-carousel"
        role="region"
        aria-roledescription={en ? "carousel" : "แกลเลอรีเลื่อนภาพ"}
        aria-label={en ? "Riverside photo highlights" : "ภาพจุดชมวิวริมแม่น้ำ"}
      >
        <div
          id="culture-sights-track"
          className="culture-sights-track"
          ref={trackRef}
          tabIndex={0}
          onScroll={(event) => {
            const track = event.currentTarget;
            const max = track.scrollWidth - track.clientWidth;
            setPage(
              max > 0
                ? Math.round((track.scrollLeft / max) * (pageCount - 1))
                : 0,
            );
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
              event.preventDefault();
              scrollToPage(page + (event.key === "ArrowRight" ? 1 : -1));
            }
          }}
          aria-label={
            en
              ? "Swipe or use the arrow keys to browse"
              : "เลื่อนภาพหรือใช้ปุ่มลูกศรเพื่อดูสถานที่"
          }
        >
          {scenicPhotos.map((place) => (
            <article className="culture-sight-card" key={place.en}>
              <div className="culture-sight-image">
                <img
                  src={place.src}
                  width={place.width}
                  height={place.height}
                  alt={
                    en
                      ? `${place.en} — location photograph`
                      : `ภาพสถานที่ ${place.th}`
                  }
                  loading="lazy"
                  style={{ objectPosition: place.position }}
                />
                <span>
                  <Camera size={14} aria-hidden="true" />
                  {en ? "PHOTO SPOT" : "จุดถ่ายภาพ"}
                </span>
              </div>
              <div className="culture-sight-copy">
                <h3>{en ? place.en : place.th}</h3>
                <p>{en ? place.descriptionEn : place.descriptionTh}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="culture-sights-controls">
          <button
            type="button"
            onClick={() => scrollToPage(page - 1)}
            disabled={page === 0}
            aria-controls="culture-sights-track"
            aria-label={en ? "Previous sights" : "ดูสถานที่ก่อนหน้า"}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <div className="culture-sights-dots">
            {Array.from({ length: pageCount }, (_, index) => (
              <button
                type="button"
                key={index}
                onClick={() => scrollToPage(index)}
                aria-label={
                  en
                    ? `View sights page ${index + 1}`
                    : `ดูภาพสถานที่ชุดที่ ${index + 1}`
                }
                aria-current={page === index ? "true" : undefined}
                aria-controls="culture-sights-track"
              >
                <span />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollToPage(page + 1)}
            disabled={page === pageCount - 1}
            aria-controls="culture-sights-track"
            aria-label={en ? "Next sights" : "ดูสถานที่ถัดไป"}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="culture-route-note">
        {en
          ? "Enjoy these sights and take photos from on board. Location photos are illustrative; views and the route vary by sailing and river conditions. Shore visits are not included unless stated in your sailing details."
          : "ชมวิวและถ่ายภาพจากบนเรือ ภาพสถานที่ใช้ประกอบบรรยากาศ มุมมองและเส้นทางอาจแตกต่างตามรอบและสภาพการเดินเรือ การแวะขึ้นฝั่งจะระบุในรายละเอียดรอบที่เลือกเท่านั้น"}
      </p>

      <details className="culture-route-expand">
        <summary>
          <MapPin size={18} aria-hidden="true" />
          {en
            ? "Explore all riverside highlights"
            : "ดูจุดชมวิวทั้งหมดและภาพประกอบเส้นทาง"}
          <ChevronRight size={18} aria-hidden="true" />
        </summary>
        <div className="culture-route-layout">
          <figure className="culture-route-photo">
            <a
              href="/images/river-cruise-route-night.jpg"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={
                en
                  ? "Open the full route illustration"
                  : "เปิดภาพประกอบเส้นทางขนาดเต็ม"
              }
            >
              <img
                src="/images/river-cruise-route-night.jpg"
                alt={
                  en
                    ? "UNICORN CRUISE on the Chao Phraya, with a route illustration of riverside landmarks"
                    : "เรือ UNICORN CRUISE บนแม่น้ำเจ้าพระยา พร้อมภาพประกอบแลนด์มาร์กริมแม่น้ำ"
                }
                width={1024}
                height={1536}
                loading="lazy"
              />
            </a>
            <figcaption>
              <Camera size={15} aria-hidden="true" />
              {en
                ? "Illustration of riverside highlights"
                : "ภาพประกอบจุดชมวิวริมแม่น้ำ"}
            </figcaption>
          </figure>

          <div className="culture-route-details">
            <div className="culture-route-groups">
              <div className="culture-route-group">
                <h3>
                  {en ? "Heritage on the river" : "เสน่ห์ประวัติศาสตร์ริมฝั่ง"}
                </h3>
                <ul>
                  {heritage.map((place, index) => (
                    <li key={place.en}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <MapPin size={15} aria-hidden="true" />
                      {en ? place.en : place.th}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="culture-route-group">
                <h3>
                  {en
                    ? "Bridges & riverfront icons"
                    : "สะพานและแลนด์มาร์กริมแม่น้ำ"}
                </h3>
                <ul>
                  {riverfront.map((place, index) => (
                    <li key={place.en}>
                      <span>
                        {String(index + heritage.length + 1).padStart(2, "0")}
                      </span>
                      <MapPin size={15} aria-hidden="true" />
                      {en ? place.en : place.th}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="culture-route-caption">
              {en
                ? "These highlights are not a sailing timetable. Check the route for your selected date."
                : "รายชื่อจุดชมวิวนี้ไม่ใช่ลำดับเวลาการเดินเรือ โปรดดูเส้นทางของวันที่เลือกก่อนจอง"}
            </p>
          </div>
        </div>
      </details>
      <details className="culture-sights-credits">
        <summary>
          {en ? "Location photography credits" : "เครดิตภาพสถานที่"}
        </summary>
        <ul>
          {scenicPhotos.map((place) => (
            <li key={place.en}>
              <a href={place.source} target="_blank" rel="noopener noreferrer">
                {en ? place.en : place.th}
              </a>
              {" — "}
              {place.author}
              {" · "}
              <a
                href={place.licenseUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {place.license}
              </a>
            </li>
          ))}
        </ul>
        <p>
          {en
            ? "Wikimedia Commons thumbnails, displayed with responsive cropping. Photographs do not imply endorsement."
            : "ภาพจาก Wikimedia Commons แสดงผลโดยครอปตามขนาดหน้าจอ การใช้ภาพไม่ได้หมายถึงการรับรองบริการโดยช่างภาพ"}
        </p>
      </details>
    </section>
  );
}
