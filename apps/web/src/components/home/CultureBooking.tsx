import type { Language } from "../../data/i18n";

export default function CultureBooking({ language }: { language: Language }) {
  const en = language === "en";
  const steps = en
    ? [
        [
          "Choose sailing & seats",
          "Choose a sailing, deck and individual seats. Buffet is included; food and wine extras are optional.",
        ],
        [
          "Review & confirm",
          "Check the sailing, seat codes, extras and total. Your account name is filled in for you.",
        ],
        [
          "Pay",
          "Select an available Omise method. Sandbox uses test payment only; do not transfer real money.",
        ],
        [
          "Receive your tickets",
          "Tickets follow provider confirmation. Test tickets are marked and are not valid for travel.",
        ],
      ]
    : [
        [
          "เลือกรอบและเก้าอี้",
          "เลือกรอบ โซน และเก้าอี้ บุฟเฟต์รวมในค่าที่นั่ง อาหารพิเศษและไวน์เลือกเพิ่มได้",
        ],
        [
          "ตรวจสอบและคอนเฟิร์ม",
          "ตรวจรอบ รหัสที่นั่ง บริการเสริม และยอดรวม ระบบกรอกชื่อจากบัญชีให้",
        ],
        [
          "ชำระเงิน",
          "เลือกช่องทาง Omise ที่มีให้ โหมด Sandbox ใช้ชำระทดสอบเท่านั้น ไม่โอนเงินจริง",
        ],
        [
          "รับตั๋ว",
          "รับตั๋วหลังระบบยืนยันการชำระเงิน ตั๋วทดสอบมีข้อความกำกับและใช้เดินทางจริงไม่ได้",
        ],
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
