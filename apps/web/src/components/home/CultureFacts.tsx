import { CalendarDays, MapPin, Clock3, Ticket } from "lucide-react";
import { formatEventDate, formatPier, money, type EventInfo } from "../../data/api";
import type { Language } from "../../data/i18n";

export default function CultureFacts({ event, language }: { event: EventInfo; language: Language }) {
  const en = language === "en";
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

  return (
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
  );
}
