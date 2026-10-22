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
          "Choose your tables",
          "Select tables on the deck plan and enter your party size. The current layout is a demonstration, not a reservation.",
        ],
        [
          "Review your selection",
          "Review tables and guest count. Real payment is not enabled for this prototype.",
        ],
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
        [
          "เลือกโต๊ะและจำนวนคน",
          "เลือกโต๊ะจากผังเรือและระบุจำนวนผู้ร่วมเดินทาง ขณะนี้เป็นผังสาธิต ยังไม่ใช่การจองจริง",
        ],
        [
          "ตรวจสอบรายการโต๊ะ",
          "ตรวจโต๊ะและจำนวนคน ต้นแบบนี้ยังไม่เปิดรับชำระเงินจริง",
        ],
        ["พบกันที่ท่าเรือ", "นำ QR Ticket มาแสดงตามเวลาขึ้นเรือของรอบที่จอง"],
      ];

  return (
    <section
      className="culture-booking culture-container"
      aria-labelledby="culture-booking-title"
    >
      <h2 id="culture-booking-title">
        {en ? (
          "Your journey, step by step."
        ) : (
          <>
            จองล่องเรือกับเรา{" "}
            <span className="booking-step-count">ใน 4 ขั้นตอน</span>
          </>
        )}
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
