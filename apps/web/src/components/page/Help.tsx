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
        "เลือกโซนและเก้าอี้ตามจำนวนผู้เดินทาง เพิ่มอาหารหรือไวน์ได้ตามต้องการ เข้าสู่ระบบและตรวจสอบรายการก่อนชำระเงิน",
        "หลังระบบยืนยันรายการแล้ว ดูประวัติได้ที่คำสั่งซื้อของฉัน และเปิด QR Ticket ได้ที่บัตรของฉัน การเปิดหน้าชำระเงินอย่างเดียวยังไม่ถือว่าชำระสำเร็จ",
      ],
      en: [
        "Choose your deck and individual seats, optionally add food or wine, then sign in and review your reservation before paying.",
        "After confirmation, view your history in My bookings and QR tickets in My tickets. Merely opening checkout does not mean payment succeeded.",
      ],
    },
    payment: {
      th: [
        "เลือกช่องทางที่มีให้ในหน้าชำระเงินของ Omise เช่น PromptPay หรือบัตร ช่องทางที่ใช้ได้ขึ้นอยู่กับบัญชีร้านค้า ระบบจะแสดงยอดและเวลาหมดอายุให้ตรวจสอบ",
        "หลังชำระเงิน ระบบตรวจสอบผลจากผู้ให้บริการก่อนออกตั๋ว ไม่ต้องแนบสลิป หากปิดหน้าไปสามารถกลับมาชำระต่อหรือตรวจสถานะจากรายการจองของฉัน",
      ],
      en: [
        "Choose an available Omise payment method, such as PromptPay or card. Availability depends on the merchant account. Check the total and expiry before paying.",
        "Tickets are issued after the provider confirms payment. No slip upload is needed. Resume payment or check its status from My reservations.",
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
        {demo && topic === "payment" && (
          <p>
            {en
              ? "Sandbox payments use test details only; do not transfer real money."
              : "หากหน้าชำระเงินแสดง Sandbox ให้ใช้ข้อมูลทดสอบเท่านั้น ไม่โอนเงินจริง"}
          </p>
        )}
        {content[topic][language].map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </article>
    </section>
  );
}
