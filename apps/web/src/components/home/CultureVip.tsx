import { ArrowRight } from "lucide-react";
import type { Language } from "../../data/i18n";

export default function CultureVip({ language, onOpenContact }: { language: Language; onOpenContact: () => void }) {
  const en = language === "en";
  return (
    <section className="culture-vip" aria-labelledby="culture-vip-title">
      <div className="culture-container">
        <div>
          <h2 id="culture-vip-title">
            {en ? "A table for your group?" : "อยากได้โต๊ะสำหรับกลุ่มของคุณ?"}
          </h2>
          <p>
            {en
              ? "For VIP tables, prepare your sailing date, guest count and preferred seating. Table availability and prices must be confirmed before payment."
              : "สำหรับโต๊ะ VIP เตรียมวันล่องเรือ จำนวนผู้ร่วมเดินทาง และพื้นที่ที่ต้องการ โดยต้องยืนยันโต๊ะว่างและราคาก่อนชำระเงิน"}
          </p>
        </div>
        <div>
          <button
            className="culture-button culture-button-outline"
            type="button"
            onClick={onOpenContact}
          >
            {en ? "Booking & VIP enquiries" : "ข้อมูลติดต่อและสอบถามโต๊ะ VIP"}
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
