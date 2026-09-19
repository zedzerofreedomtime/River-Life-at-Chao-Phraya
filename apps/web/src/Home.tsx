import { ArrowRight, CalendarDays, MapPin, Music2 } from "lucide-react";
import type { EventInfo } from "./api";
import type { Language } from "./i18n";

export default function Home({
  event,
  language,
  onOpenConcert,
}: {
  event: EventInfo;
  language: Language;
  onOpenConcert: () => void;
}) {
  const en = language === "en";
  return (
    <section className="concert-home">
      <div
        className="concert-home-hero"
        style={{
          backgroundImage: "url(/images/boat/unicorn-night-hero-gold.png)",
        }}
      >
        <div className="concert-home-hero-copy">
          <h1>
            {en ? "Concerts on the Chao Phraya" : "คอนเสิร์ตบนแม่น้ำเจ้าพระยา"}
          </h1>
          <p>
            {en
              ? "Live music, great food, and Bangkok's iconic river view."
              : "ดนตรีสด อาหารพิเศษ และวิวแม่น้ำของกรุงเทพฯ"}
          </p>
          <button onClick={onOpenConcert}>
            {en ? "Explore the concert" : "ดูรายละเอียดคอนเสิร์ต"}
            <ArrowRight aria-hidden="true" size={20} />
          </button>
        </div>
      </div>
      <section
        className="concert-home-featured"
        aria-labelledby="featured-concert"
      >
        <div>
          <p>{en ? "Featured concert" : "คอนเสิร์ตแนะนำ"}</p>
          <h2 id="featured-concert">{event.title}</h2>
        </div>
        <article className="concert-home-card">
          <img
            src="/images/boat/unicorn-night-exterior.jpg"
            alt={event.title}
          />
          <div>
            <span>{en ? "Concert ticket" : "บัตรคอนเสิร์ต"}</span>
            <h3>{event.title}</h3>
            <p>
              <CalendarDays aria-hidden="true" size={17} />
              {event.date ||
                (en ? "Date to be announced" : "รอยืนยันวันจัดงาน")}
            </p>
            <p>
              <MapPin aria-hidden="true" size={17} /> {event.pier}
            </p>
            <p>
              <Music2 aria-hidden="true" size={17} />{" "}
              {en
                ? "Live concert on Unicorn Cruise"
                : "คอนเสิร์ตบนเรือ Unicorn Cruise"}
            </p>
            <button onClick={onOpenConcert}>
              {en ? "View concert details" : "ดูรายละเอียดและซื้อบัตร"}
              <ArrowRight aria-hidden="true" size={18} />
            </button>
          </div>
        </article>
      </section>
    </section>
  );
}
