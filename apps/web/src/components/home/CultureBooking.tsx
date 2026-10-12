import type { Language } from "../../data/i18n";

export default function CultureBooking({ language }: { language: Language }) {
  const en = language === "en";
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
  );
}
