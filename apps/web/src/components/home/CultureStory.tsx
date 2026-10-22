import { ArrowRight } from "lucide-react";
import { formatPier, type EventInfo } from "../../data/api";
import type { Language } from "../../data/i18n";

export default function CultureStory({
  event,
  language,
}: {
  event: EventInfo;
  language: Language;
}) {
  const en = language === "en";
  return (
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
            ? "Every River Life sailing aboard UNICORN CRUISE includes an on-board concert. Explore the programme for your chosen sailing."
            : "ทุกรอบล่องเรือ River Life บน UNICORN CRUISE มีคอนเสิร์ตบนเรือ ชมโปรแกรมของรอบที่สนใจก่อนเลือกจอง"}
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
  );
}
