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
    privacy: {
      th: [
        "ระบบใช้ชื่อ อีเมล เบอร์โทร (ถ้าระบุ) และรายการจอง เพื่อจัดการบัญชี ติดต่อ ออกตั๋ว และส่งข้อมูลการจอง ฟอร์มติดต่อส่งข้อมูลให้ทีมงานผ่าน Google Sheets",
        "การชำระเงินดำเนินการผ่าน Omise และสามารถเข้าสู่ระบบผ่าน Google ได้ตามที่เลือก หากต้องการสอบถามหรือขอจัดการข้อมูล ให้ติดต่อทีมงานผ่านหน้าติดต่อเรา",
        "ผู้ประกอบการยังต้องยืนยันรายละเอียดผู้ควบคุมข้อมูล ระยะเวลาเก็บข้อมูล และช่องทางใช้สิทธิก่อนเปิดขายจริง ข้อความนี้อธิบายการทำงานปัจจุบัน ยังไม่ใช่นโยบายฉบับอนุมัติ",
      ],
      en: [
        "Name, email, optional phone and reservation details are used for accounts, communication, bookings and ticket delivery. Contact submissions are shared with the team through Google Sheets.",
        "Payments are processed through Omise; Google sign-in is optional. Contact the team via Contact us for questions or data requests.",
        "The operator must confirm the data controller, retention period and rights request process before live sales. This explains current operation and is not an approved privacy policy.",
      ],
    },
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
        "ตรวจสอบวัน เวลาขึ้นเรือ และรหัสเก้าอี้ก่อนยืนยัน บุฟเฟต์รวมในค่าที่นั่ง อาหารพิเศษและไวน์คิดเพิ่มเฉพาะรายการที่เลือก",
        "นโยบายเด็ก การมาสาย การยกเลิก เลื่อนรอบ และสภาพอากาศ ยังต้องได้รับการยืนยันจากผู้จัดก่อนเปิดขายจริง กรุณาสอบถามทีมงาน ไม่มีการรับประกันคืนเงินหรือเลื่อนรอบจากข้อความหน้านี้",
      ],
      en: [
        "A QR ticket is valid only for its booking. Present it when staff ask to check it.",
        "Check the date, boarding time and seat codes before confirming. Buffet is included; optional food and wine are charged only when selected.",
        "Child, late arrival, cancellation, rescheduling and weather policies require organizer approval before live sales. Contact the team. This page does not guarantee refunds or rescheduling.",
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
