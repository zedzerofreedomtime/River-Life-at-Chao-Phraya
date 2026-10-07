import type { Language } from "./i18n";

export type HelpTopic = "contact" | "faq" | "payment" | "refunds" | "tickets";

export const helpTopics: HelpTopic[] = [
  "contact",
  "faq",
  "payment",
  "refunds",
  "tickets",
];

export function helpTitle(topic: HelpTopic, language: Language) {
  const titles = {
    contact: ["ติดต่อเรา", "Contact us"],
    faq: ["ช่วยเหลือ / คำถามที่พบบ่อย", "Help & FAQ"],
    payment: ["การชำระเงินและแนบสลิป", "Payments & slip upload"],
    refunds: ["การเลื่อนงาน / คืนเงิน", "Postponement & refunds"],
    tickets: ["เงื่อนไขการใช้บัตร", "Ticket terms"],
  };
  return titles[topic][language === "en" ? 1 : 0];
}

export default function Help({
  topic,
  language,
  onSelect,
  demo,
}: {
  topic: HelpTopic;
  language: Language;
  onSelect: (topic: HelpTopic) => void;
  demo: boolean;
}) {
  const en = language === "en";
  const content: Record<HelpTopic, { th: string[]; en: string[] }> = {
    contact: {
      th: [
        "สำหรับการสอบถามโต๊ะ VIP โปรดระบุวันล่องเรือ จำนวนผู้ร่วมเดินทาง และพื้นที่ที่ต้องการ โต๊ะว่างและราคาต้องได้รับการยืนยันก่อนชำระเงิน",
        "หากมีปัญหาเกี่ยวกับคำสั่งซื้อ โปรดเตรียมรหัสคำสั่งซื้อและอีเมลที่ใช้จองก่อนติดต่อผู้จัดงาน",
        "ช่องทางติดต่อสาธารณะของผู้จัดยังรอยืนยัน เราจะเพิ่มข้อมูลที่ตรวจสอบแล้วในหน้านี้ก่อนเปิดขายจริง",
      ],
      en: [
        "For VIP table enquiries, prepare the sailing date, guest count and preferred seating. Table availability and pricing must be confirmed before payment.",
        "For booking questions, have your order ID and booking email ready when contacting the organizer.",
        "The organizer's public contact channel is pending confirmation. Verified details will be added here before ticket sales open.",
      ],
    },
    faq: {
      th: [
        "ต้องเข้าสู่ระบบก่อนซื้อบัตร จากนั้นเลือกโซน จำนวนบัตร และตรวจสอบยอดชำระเงิน",
        "หลังส่งหลักฐานการชำระเงิน ระบบจะแสดง QR Ticket ในหน้าบัตรของฉัน โปรดตรวจสอบสถานะรายการก่อนเดินทาง",
      ],
      en: [
        "Log in before buying, then select a zone and ticket quantity and review the total.",
        "After submitting payment evidence, the system displays a QR ticket in My Tickets. Check your booking status before travelling.",
      ],
    },
    payment: {
      th: [
        "ชำระตามยอดคำสั่งซื้อผ่าน PromptPay QR และแนบสลิป PNG หรือ JPG ขนาดไม่เกิน 5 MB ก่อนเวลาพักบัตรหมด",
        "การแนบสลิปเป็นการส่งหลักฐาน ระบบยังไม่ได้ตรวจสอบธุรกรรมธนาคารโดยอัตโนมัติ จึงไม่ควรถือว่า QR Ticket เป็นหลักฐานว่ามีการรับเงินจริง",
      ],
      en: [
        "Pay the order total via PromptPay QR and upload a PNG or JPG receipt (up to 5 MB) before the reservation expires.",
        "A receipt upload is evidence submission, not automatic bank verification. A QR ticket alone does not prove that funds were received.",
      ],
    },
    refunds: {
      th: [
        "การยกเลิกรายการในระบบไม่ทำให้เกิดการคืนเงินอัตโนมัติ",
        "นโยบายเลื่อนงานและคืนเงินของงานนี้ยังรอผู้จัดยืนยัน โปรดอย่าใช้หน้านี้เป็นคำรับประกันการคืนเงินก่อนมีประกาศอย่างเป็นทางการ",
      ],
      en: [
        "Cancelling a booking in the system does not automatically trigger a refund.",
        "The event's postponement and refund policy is pending organizer confirmation. This page is not a refund guarantee until the official policy is published.",
      ],
    },
    tickets: {
      th: [
        "QR Ticket ใช้สำหรับรายการจองที่ระบุเท่านั้น โปรดแสดงบัตรเมื่อเจ้าหน้าที่ขอตรวจ",
        "ผู้มาหลังเวลาขึ้นเรือที่กำหนดอาจถูกจัดเป็น No-show ตามเงื่อนไขที่แสดงก่อนซื้อ โปรดตรวจสอบเวลาจากรายละเอียดงานอีกครั้ง",
      ],
      en: [
        "A QR ticket is valid only for its booking. Present it when staff ask to check it.",
        "Arriving after the stated boarding time may be treated as a no-show under the terms shown before purchase. Please recheck the time on the event page.",
      ],
    },
  };
  return (
    <section className="help-page" aria-labelledby="help-title">
      <div className="help-page-heading">
        <span>RIVER LIFE · {en ? "SUPPORT" : "ช่วยเหลือ"}</span>
        <h1 id="help-title">{helpTitle(topic, language)}</h1>
      </div>
      <nav
        className="help-topic-nav"
        aria-label={en ? "Help topics" : "หัวข้อความช่วยเหลือ"}
      >
        {helpTopics.map((item) => (
          <button
            key={item}
            type="button"
            className={item === topic ? "active" : ""}
            aria-current={item === topic ? "page" : undefined}
            onClick={() => onSelect(item)}
          >
            {helpTitle(item, language)}
          </button>
        ))}
      </nav>
      <article className="help-article">
        {(demo && (topic === "payment" || topic === "faq")
          ? (en ? ["This website is a demo. Do not transfer real money. Select tickets, then upload a sample PNG or JPG (up to 5 MB) before the reservation expires.", "A QR ticket created in this demo is for testing only. It is not proof of payment or a valid ticket for a real event."] : ["เว็บไซต์นี้อยู่ในโหมดทดลอง ห้ามโอนเงินจริง เลือกบัตรแล้วแนบภาพตัวอย่าง PNG หรือ JPG ขนาดไม่เกิน 5 MB ก่อนเวลาสำรองบัตรหมด", "QR Ticket ที่สร้างในโหมดทดลองใช้ทดสอบเท่านั้น ไม่ใช่หลักฐานการชำระเงินหรือบัตรเข้างานจริง"])
          : content[topic][language]).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </article>
    </section>
  );
}
