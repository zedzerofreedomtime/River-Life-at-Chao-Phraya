import { ArrowRight } from "lucide-react";
import type { Language } from "../../data/i18n";

export default function CultureVip({ language, onOpenContact }: { language: Language; onOpenContact: () => void }) {
  const en = language === "en";
  return (
    <section className="culture-vip" aria-labelledby="culture-vip-title">
      <div className="culture-container">
        <div>
          <h2 id="culture-vip-title">
            {en ? "Planning a group concert cruise?" : "วางแผนล่องเรือชมคอนเสิร์ตเป็นกลุ่ม?"}
          </h2>
          <p>
            {en
              ? "Prepare your preferred sailing and guest count. Bookings currently reserve a zone and guest count; specific tables are not confirmed."
              : "เตรียมรอบที่สนใจและจำนวนผู้ร่วมเดินทาง ปัจจุบันจองแบบโซนและจำนวนคน ยังไม่มีการยืนยันโต๊ะเฉพาะ"}
          </p>
        </div>
        <div>
          <button
            className="culture-button culture-button-outline"
            type="button"
            onClick={onOpenContact}
          >
            {en ? "Group booking enquiries" : "สอบถามการจองเป็นกลุ่ม"}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <p className="culture-caption">
            {en
              ? "Our contact details are pending confirmation."
              : "ช่องทางติดต่อของเรารอยืนยัน"}
          </p>
        </div>
      </div>
    </section>
  );
}
