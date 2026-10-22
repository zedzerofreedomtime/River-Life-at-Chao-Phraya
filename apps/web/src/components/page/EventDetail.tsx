import { ArrowRight, CalendarDays, Clock3, MapPin, Ticket } from "lucide-react";
import {
  formatEventDate,
  formatPier,
  localizeEventTitle,
  type EventInfo,
} from "../../data/api";
import type { Language } from "../../data/i18n";
export default function EventDetail({
  event,
  onStartCheckout,
  language,
}: {
  event: EventInfo;
  onStartCheckout: () => void;
  language: Language;
}) {
  const en = language === "en";
  const date = event.date_is_preview
    ? en
      ? "Date to be announced"
      : "วันล่องเรือรอประกาศ"
    : formatEventDate(event.date, language);
  const details = [
    {
      icon: CalendarDays,
      label: en ? "Sailing date" : "วันที่ล่องเรือ",
      value: date,
    },
    {
      icon: Clock3,
      label: en ? "Boarding and departure" : "ขึ้นเรือและออกเรือ",
      value: en
        ? `Board ${event.boarding} · depart ${event.departure}`
        : `ขึ้นเรือ ${event.boarding} · ออกเรือ ${event.departure}`,
    },
    {
      icon: Ticket,
      label: en ? "Table pricing" : "ราคาจองโต๊ะ",
      value: en ? "To be announced by River Life" : "รอประกาศจาก River Life",
    },
    {
      icon: Ticket,
      label: en ? "Table plan" : "ผังโต๊ะ",
      value: en
        ? "Proposed layout · pending approval"
        : "แบบเสนอ · รอเรือรับรอง",
    },
    {
      icon: MapPin,
      label: en ? "Boarding point" : "จุดขึ้นเรือ",
      value: formatPier(event.pier, event.pier_number, language),
    },
  ];

  return (
    <>
      <section className="event-purchase-hero">
        <div className="event-purchase-container">
          <p className="event-breadcrumb">
            {en ? "Home / Cruise experiences" : "หน้าแรก / ประสบการณ์ล่องเรือ"}
          </p>
          <article className="event-purchase-card">
            <div className="event-poster">
              <img
                src="/images/boat/unicorn-night-hero-gold.webp"
                alt={
                  en
                    ? "UNICORN CRUISE on the Chao Phraya at night"
                    : "เรือ UNICORN CRUISE ล่องแม่น้ำเจ้าพระยายามค่ำคืน"
                }
              />
              <span>{en ? "LIVE ON THE RIVER" : "LIVE ON THE RIVER"}</span>
            </div>
            <div className="event-purchase-info">
              <h1>{localizeEventTitle(event.title, language)}</h1>
              <p className="event-purchase-summary">
                {en
                  ? "A concert evening hosted by River Life aboard UNICORN CRUISE."
                  : "ค่ำคืนคอนเสิร์ตที่ River Life จัดขึ้นบนเรือ UNICORN CRUISE"}
              </p>
              <dl className="event-key-details">
                {details.map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <dt>
                      <Icon aria-hidden="true" size={20} />
                    </dt>
                    <dd>
                      <strong>{label}</strong>
                      <span>{value}</span>
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="booking-before-you-book">
                <h2>{en ? "Before you book" : "รายละเอียดก่อนจอง"}</h2>
                <p>
                  {en
                    ? "Included: river cruise and on-board concert. Final dining and drink inclusions will be confirmed for each sailing."
                    : "สิ่งที่รวม: ล่องเรือและคอนเสิร์ตบนเรือ รายละเอียดอาหารและเครื่องดื่มที่รวมในบัตรจะยืนยันตามรอบ"}
                </p>
                <p>
                  {en
                    ? "Children: age limits, admission and child prices are pending announcement. No child pricing is confirmed yet."
                    : "เด็ก: เกณฑ์อายุ การเข้าร่วม และราคาสำหรับเด็กรอประกาศ ยังไม่มีอัตราราคาเด็กที่ยืนยัน"}
                </p>
                <p>
                  {en
                    ? "Choose tables directly. The proposed layout places the stage at the bow; the operator must approve the actual plan before sales open."
                    : "เลือกจองเป็นโต๊ะโดยตรง ผังเสนอให้เวทีอยู่ด้านหัวเรือ ต้องให้ผู้ประกอบการรับรองผังจริงก่อนเปิดขาย"}
                </p>
                {event.date_is_preview && (
                  <p>
                    {en
                      ? "Boarding time and pier above are demonstration details, pending confirmation for the published sailing."
                      : "เวลาและท่าเรือที่แสดงเป็นข้อมูลประกอบการสาธิต รอยืนยันสำหรับรอบที่ประกาศจริง"}
                  </p>
                )}
              </div>
              <p className="event-price-note">
                {event.date_is_preview
                  ? en
                    ? "Preview only: date and ticket prices are examples, not a live event announcement. Do not make a real payment."
                    : "ตัวอย่างเท่านั้น: วันงานและราคาบัตรยังไม่ใช่ประกาศขายจริง กรุณาอย่าชำระเงินจริง"
                  : en
                    ? "Check the event terms and ticket inclusions before purchasing."
                    : "ตรวจสอบเงื่อนไขงานและสิ่งที่รวมในบัตรก่อนซื้อ"}
              </p>
              <button
                className="event-buy-button"
                onClick={() => onStartCheckout()}
              >
                {en ? "Choose tables · demo" : "เลือกโต๊ะ · ทดลอง"}
                <ArrowRight aria-hidden="true" size={21} />
              </button>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
