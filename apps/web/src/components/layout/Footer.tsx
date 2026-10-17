import type { Language } from "../../data/i18n";

export default function Footer({ language }: { language: Language }) {
  const en = language === "en";
  return (
    <footer>
      <span className="footer-brand">RIVER LIFE</span>
      <span>{en ? "Chao Phraya cruises · A concert on every sailing" : "ล่องเรือเจ้าพระยา · คอนเสิร์ตบนเรือทุกรอบ"}</span>
      <span>{en ? "Prices and event details are pending confirmation" : "ราคาและรายละเอียดงานรอยืนยัน"}</span>
    </footer>
  );
}
