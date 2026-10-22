import type { Language } from "../../data/i18n";
import "../../Contact.css";
import ContactPage from "../contact/ContactPage";

import { helpTitle, visibleHelpTopics, type HelpTopic } from "../../data/help";
export { helpTitle, helpTopics, type HelpTopic } from "../../data/help";

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
  if (topic === "contact") return <ContactPage language={language} />;
  const content: Record<HelpTopic, { th: string[]; en: string[] }> = {
    contact: {
      th: [
        "สำหรับการสอบถามโต๊ะ VIP โปรดระบุวันล่องเรือ จำนวนผู้ร่วมเดินทาง และพื้นที่ที่ต้องการ โต๊ะว่างและราคาต้องได้รับการยืนยันก่อนชำระเงิน",
        "หากมีปัญหาเกี่ยวกับคำสั่งซื้อ โปรดเตรียมรหัสคำสั่งซื้อและอีเมลที่ใช้จองก่อนติดต่อผู้จัดงาน",
      ],
      en: [
        "For VIP table enquiries, prepare the sailing date, guest count and preferred seating. Table availability and pricing must be confirmed before payment.",
        "For booking questions, have your order ID and booking email ready when contacting the organizer.",
      ],
    },
    faq: {
      th: [
        "ต้องเข้าสู่ระบบก่อนซื้อบัตร จากนั้นเลือกโซน จำนวนบัตร และตรวจสอบยอดชำระเงิน",
        "หลังระบบยืนยันรายการแล้ว ดูประวัติได้ที่คำสั่งซื้อของฉัน และเปิด QR Ticket ได้ที่บัตรของฉัน การเปิดหน้าชำระเงินอย่างเดียวยังไม่ถือว่าชำระสำเร็จ",
      ],
      en: [
        "Log in before buying, then select a zone and ticket quantity and review the total.",
        "After confirmation, view your history in My bookings and QR tickets in My tickets. Merely opening checkout does not mean payment succeeded.",
      ],
    },
    payment: {
      th: [
        "ใช้ช่องทางที่หน้า 'ชำระเงิน' แสดง หากเป็น Stripe ให้ดำเนินการบนหน้า Checkout แล้วกลับมาตรวจสอบสถานะ หากเป็นโหมดแนบหลักฐาน ให้ใช้ไฟล์ PNG หรือ JPG ไม่เกิน 5 MB",
        "การแนบสลิปเป็นการส่งหลักฐาน ระบบยังไม่ได้ตรวจสอบธุรกรรมธนาคารโดยอัตโนมัติ จึงไม่ควรถือว่า QR Ticket เป็นหลักฐานว่ามีการรับเงินจริง",
      ],
      en: [
        "Use the method shown on the payment page. For Stripe, complete Checkout and return to check your status. If receipt upload is enabled instead, use PNG or JPG up to 5 MB.",
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
        {visibleHelpTopics.map((item) => (
          <button key={item} type="button" onClick={() => onSelect(item)}>
            {helpTitle(item, language)}
          </button>
        ))}
      </nav>
      <article className="help-article">
        {(demo && (topic === "payment" || topic === "faq")
          ? en
            ? [
                "This is a demo. Do not transfer real money or use a real card. If the payment page shows Stripe Sandbox, use Stripe test payment details. Only upload a sample PNG/JPG (up to 5 MB) when the page explicitly offers sample uploads.",
                "View booking history in My bookings. In My tickets, Available and Used tabs separate unused and checked-in tickets. A checked-in ticket cannot be used again. Demo tickets are not valid for actual boarding.",
              ]
            : [
                "เว็บไซต์นี้เป็นระบบทดลอง ห้ามโอนเงินจริงหรือใช้บัตรจริง หากหน้าชำระเงินแสดง Stripe Sandbox ให้ใช้ข้อมูลชำระเงินทดสอบของ Stripe เท่านั้น ส่วนการแนบ PNG/JPG ตัวอย่างไม่เกิน 5 MB ใช้เมื่อหน้านั้นเปิดให้แนบภาพตัวอย่าง",
                "ดูประวัติที่คำสั่งซื้อของฉัน และเปิดบัตรที่บัตรของฉัน แท็บบัตรใช้งานได้กับใช้แล้วจะแยกบัตรที่ยังไม่เช็กอินออกจากบัตรที่เช็กอินแล้ว บัตรใช้แล้วใช้ซ้ำไม่ได้ บัตรทดลองไม่ใช่สิทธิ์ขึ้นเรือจริง",
              ]
          : content[topic][language]
        ).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </article>
    </section>
  );
}
