import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Music2,
  Ticket,
} from "lucide-react";
import {
  formatEventDate,
  formatPier,
  localizeEventTitle,
  money,
  type EventInfo,
} from "./api";
import type { Language } from "./i18n";

function utcDate(date: string | null) {
  if (!date) return null;
  const value = new Date(date + "T00:00:00Z");
  return Number.isNaN(value.getTime()) ? null : value;
}

export default function SailingCalendar({
  event,
  language,
  onOpenConcert,
}: {
  event: EventInfo;
  language: Language;
  onOpenConcert: () => void;
}) {
  const en = language === "en";
  const eventDate = utcDate(event.date);
  const today = new Date();
  const [year, setYear] = useState(
    () => eventDate?.getUTCFullYear() ?? today.getFullYear(),
  );
  const [month, setMonth] = useState(
    () => eventDate?.getUTCMonth() ?? today.getMonth(),
  );
  const eventInMonth =
    eventDate?.getUTCFullYear() === year && eventDate?.getUTCMonth() === month;
  const displayYear = en ? year : year + 543;
  const years = [
    ...new Set([
      today.getFullYear(),
      eventDate?.getUTCFullYear() ?? today.getFullYear(),
    ]),
  ].sort((a, b) => a - b);
  const locale = en ? "en-GB" : "th-TH";
  const monthName = (index: number, short = false) =>
    new Intl.DateTimeFormat(locale, {
      month: short ? "short" : "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, index, 1)));
  const weekdays = en
    ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    : ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  const blanks = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);
  const lowestPrice = event.zones.length
    ? Math.min(...event.zones.map((zone) => zone.price))
    : null;
  const available = event.zones.reduce(
    (total, zone) => total + zone.available,
    0,
  );
  const restoreEventMonth = () => {
    if (eventDate) {
      setYear(eventDate.getUTCFullYear());
      setMonth(eventDate.getUTCMonth());
    }
  };
  return (
    <section
      id="cruise-calendar"
      className="culture-calendar culture-container"
      aria-labelledby="culture-calendar-title"
    >
      <div className="culture-section-heading">
        <div>
          <h2 id="culture-calendar-title">
            {en ? "Find your sailing" : "เลือกรอบล่องเรือของคุณ"}
          </h2>
          <p>
            {en
              ? "Choose a month to explore our sailing schedule and special concert programme."
              : "เลือกเดือนเพื่อดูรอบล่องเรือของเราและโปรแกรมคอนเสิร์ตรอบพิเศษ"}
          </p>
        </div>
        <label className="culture-year">
          <span className="culture-sr-only">
            {en ? "Schedule year" : "ปีของตารางงาน"}
          </span>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((value) => (
              <option key={value} value={value}>
                {en ? value : value + 543}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        className="culture-months"
        role="group"
        aria-label={en ? "Choose a month" : "เลือกเดือน"}
      >
        {Array.from({ length: 12 }, (_, index) => (
          <button
            key={index}
            type="button"
            className={month === index ? "active" : ""}
            aria-pressed={month === index}
            onClick={() => setMonth(index)}
          >
            {monthName(index, true)}
            {eventDate?.getUTCFullYear() === year &&
            eventDate.getUTCMonth() === index ? (
              <span
                className="culture-event-dot"
                aria-label={en ? "Has a listed sailing" : "มีข้อมูลรอบล่องเรือ"}
              />
            ) : null}
          </button>
        ))}
      </div>
      <div className="culture-calendar-layout">
        <div className="culture-date-grid">
          <div className="culture-date-heading">
            <button
              type="button"
              disabled={month === 0}
              aria-label={en ? "Previous month" : "เดือนก่อนหน้า"}
              onClick={() => setMonth((value) => value - 1)}
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <h3>
              {monthName(month)} {displayYear}
            </h3>
            <button
              type="button"
              disabled={month === 11}
              aria-label={en ? "Next month" : "เดือนถัดไป"}
              onClick={() => setMonth((value) => value + 1)}
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
          <table aria-label={monthName(month) + " " + displayYear}>
            <thead>
              <tr>
                {weekdays.map((day) => (
                  <th key={day} scope="col">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: cells.length / 7 }, (_, row) => (
                <tr key={row}>
                  {cells.slice(row * 7, row * 7 + 7).map((day, column) => (
                    <td key={column}>
                      {day === null ? null : eventInMonth &&
                        day === eventDate?.getUTCDate() ? (
                        <button
                          type="button"
                          className="culture-event-day"
                          aria-label={
                            formatEventDate(event.date, language) +
                            " · " +
                            (en
                              ? "View sailing details"
                              : "ดูรายละเอียดรอบล่องเรือ")
                          }
                          onClick={onOpenConcert}
                        >
                          {day}
                        </button>
                      ) : (
                        <span className="culture-no-event-day">{day}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="culture-date-legend">
            <span />
            {en
              ? "A sailing is listed on this date"
              : "วันที่มีข้อมูลรอบล่องเรือ"}
          </p>
        </div>
        <div
          className="culture-event-result"
          aria-live="polite"
          aria-atomic="true"
        >
          {eventInMonth ? (
            <article className="culture-event-panel" key={year + "-" + month}>
              <img
                src="/images/boat/unicorn-night-exterior.jpg"
                alt={
                  en
                    ? "Actual UNICORN CRUISE vessel"
                    : "ภาพเรือ UNICORN CRUISE จริง"
                }
                width={1290}
                height={686}
                loading="lazy"
              />
              <div>
                <span className="culture-event-status">
                  {event.date_is_preview || event.demo
                    ? en
                      ? "Concert sailing · Preview"
                      : "รอบล่องเรือพร้อมคอนเสิร์ต · ตัวอย่าง"
                    : available === 0
                      ? en
                        ? "Fully booked"
                        : "เต็มแล้ว"
                      : en
                        ? "Concert sailing · Open for booking"
                        : "รอบล่องเรือพร้อมคอนเสิร์ต · เปิดจอง"}
                </span>
                <h3>{localizeEventTitle(event.title, language)}</h3>
                <ul>
                  <li>
                    <CalendarDays size={18} aria-hidden="true" />
                    {formatEventDate(event.date, language)}
                  </li>
                  <li>
                    <MapPin size={18} aria-hidden="true" />
                    {formatPier(event.pier, event.pier_number, language)}
                  </li>
                  <li>
                    <Music2 size={18} aria-hidden="true" />
                    {event.artists?.length
                      ? event.artists.join(" · ")
                      : en
                        ? "Concert artist lineup to be announced"
                        : "รายชื่อศิลปินของรอบนี้รอประกาศ"}
                  </li>
                  <li>
                    <Ticket size={18} aria-hidden="true" />
                    {lowestPrice === null
                      ? en
                        ? "Price to be announced"
                        : "รอยืนยันราคา"
                      : en
                        ? "From THB " +
                          new Intl.NumberFormat("en-GB").format(
                            lowestPrice / 100,
                          ) +
                          " / guest"
                        : "เริ่มต้น " + money(lowestPrice) + " / ท่าน"}
                  </li>
                </ul>
                {event.date_is_preview ? (
                  <p className="culture-preview-note">
                    {en
                      ? "Preview date and prices. This sailing is not open for real bookings."
                      : "วันและราคาเป็นตัวอย่าง ยังไม่ใช่รอบที่เปิดจองจริง"}
                  </p>
                ) : null}
                <button
                  className="culture-button"
                  type="button"
                  onClick={onOpenConcert}
                >
                  {en ? "View sailing & seating" : "ดูรอบล่องเรือและโซนที่นั่ง"}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            </article>
          ) : (
            <div className="culture-calendar-empty" key={year + "-" + month}>
              <CalendarDays size={36} aria-hidden="true" />
              <h3>
                {en
                  ? "Sailing dates to be announced"
                  : "รอบเดือนนี้ยังรอประกาศ"}
              </h3>
              <p>
                {en
                  ? "No sailings have been announced for " +
                    monthName(month) +
                    " " +
                    displayYear +
                    ". Confirmed dates will appear here."
                  : "ยังไม่มีประกาศรอบล่องเรือสำหรับเดือน" +
                    monthName(month) +
                    " " +
                    displayYear +
                    " เมื่อยืนยันวันแล้วจะแสดงในส่วนนี้"}
              </p>
              {eventDate ? (
                <button
                  className="culture-text-link"
                  type="button"
                  onClick={restoreEventMonth}
                >
                  {en ? "See the listed sailing" : "ดูรอบที่มีข้อมูล"}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
      <p className="culture-caption">
        {en
          ? "The annual schedule will be updated as sailing dates are confirmed. Concerts are included only in the specified sailings."
          : "ตารางตลอดปีจะอัปเดตเมื่อยืนยันรอบล่องเรือ คอนเสิร์ตมีเฉพาะรอบที่ระบุในโปรแกรม"}
      </p>
    </section>
  );
}
