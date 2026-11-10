import type { Language } from "../../data/i18n";
export default function PolicyLinks({ language }: { language: Language }) {
  const en = language === "en";
  return (
    <p className="policy-links">
      <a href="/help/privacy">
        {en ? "Privacy information" : "การใช้ข้อมูลส่วนบุคคล"}
      </a>
      {" · "}
      <a href="/help/tickets">{en ? "Booking terms" : "เงื่อนไขการจอง"}</a>
      {" · "}
      <a href="/help/refunds">
        {en ? "Cancellation & refunds" : "ยกเลิก / เลื่อนรอบ / คืนเงิน"}
      </a>
    </p>
  );
}
