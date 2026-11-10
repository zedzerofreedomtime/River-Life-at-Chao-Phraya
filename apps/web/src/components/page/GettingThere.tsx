import { ArrowUpRight, Clock3, MapPin, Ship } from "lucide-react";
import { type EventInfo } from "../../data/api";
import type { Language } from "../../data/i18n";
import "../../GettingThere.css";

const boat = {
  th: "ยูนิคอน",
  name: "Unicorn Cruise",
  position: "bottom-left",
  pierTh: "ไอคอนสยาม",
  pierEn: "ICONSIAM",
  hours: "19:00–21:00",
  map: "ICONSIAM Bangkok",
};

function VesselPhoto({ position, name }: { position: string; name: string }) {
  return (
    <span className="vessel-photo" role="img" aria-label={name}>
      <svg
        viewBox={
          (
            {
              "top-left": "0 0 660 459",
              "top-right": "660 0 599 459",
              "bottom-left": "0 459 660 370",
              "bottom-right": "660 459 599 370",
            } as Record<string, string>
          )[position]
        }
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <image
          href="/images/boat/river-life-four-vessels.png"
          width="1259"
          height="829"
        />
      </svg>
    </span>
  );
}

export default function GettingThere({
  language,
  onContact,
  event,
}: {
  event: EventInfo | null;
  language: Language;
  onContact: () => void;
}) {
  const en = language === "en";
  return (
    <section className="getting-there" aria-labelledby="getting-there-title">
      <header className="getting-there-heading">
        <span>YOUR WAY TO THE RIVER</span>
        <h1 id="getting-there-title">{en ? "Getting there" : "การเดินทาง"}</h1>
        <p>
          {en
            ? "Departure pier and sailing time for Unicorn Cruise."
            : "ข้อมูลท่าเรือและเวลาล่องเรือ Unicorn Cruise ตรวจสอบรอบที่จองก่อนเดินทาง"}
        </p>
      </header>
      <article
        className="vessel-arrival"
        aria-labelledby="vessel-arrival-title"
      >
        <VesselPhoto position={boat.position} name={boat.name} />
        <div className="vessel-arrival-info">
          <span className="vessel-eyebrow">
            <Ship size={17} aria-hidden="true" />{" "}
            {en ? "YOUR DEPARTURE" : "ข้อมูลการเดินทางของคุณ"}
          </span>
          <h2 id="vessel-arrival-title">{en ? boat.name : boat.th}</h2>
          <p className="vessel-arrival-name">{en ? boat.th : boat.name}</p>
          <dl>
            <div>
              <dt>
                <MapPin size={20} aria-hidden="true" />
                {en ? "Departure pier" : "จุดขึ้นเรือ"}
              </dt>
              <dd>{en ? "ICONSIAM, Pier 4" : "ไอคอนสยาม ท่าเรือที่ 4"}</dd>
            </div>
            <div>
              <dt>
                <Clock3 size={20} aria-hidden="true" />
                {en ? "Sailing time · Bangkok" : "เวลาล่องเรือ · เวลาไทย"}
              </dt>
              <dd>
                {en
                  ? "Check-in 18:45 · Cruise 19:00–21:00"
                  : "เช็กอิน 18:45 น. · ล่องเรือ 19:00–21:00 น."}
                {event?.sailing_id && (
                  <small>
                    {en
                      ? "Times apply to the listed sailing only"
                      : "เวลาสำหรับรอบที่แสดงเท่านั้น"}
                  </small>
                )}
              </dd>
            </div>
          </dl>
          {boat.map ? (
            <a
              className="vessel-map-link"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(boat.map)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {en ? "Open directions" : "เปิดแผนที่การเดินทาง"}
              <ArrowUpRight size={19} aria-hidden="true" />
            </a>
          ) : (
            <button
              className="vessel-map-link"
              type="button"
              onClick={onContact}
            >
              {en ? "Ask about the pier and time" : "สอบถามท่าเรือและเวลา"}
              <ArrowUpRight size={19} aria-hidden="true" />
            </button>
          )}
          <p className="vessel-arrival-note">
            {en
              ? "The map locates ICONSIAM. Head to riverside Pier 4 for Unicorn Cruise and check in 15 minutes before departure."
              : "แผนที่ระบุตำแหน่ง ICONSIAM ให้ไปยังท่าเรือที่ 4 ริมแม่น้ำ เพื่อขึ้น Unicorn Cruise และเช็กอินก่อนเรือออก 15 นาที"}
          </p>
        </div>
      </article>
    </section>
  );
}
