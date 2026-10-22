import { ArrowRight } from "lucide-react";
import type { Language } from "../../data/i18n";

export default function CultureVip({
  language,
  onOpenContact,
}: {
  language: Language;
  onOpenContact: () => void;
}) {
  const en = language === "en";
  return (
    <section className="culture-vip" aria-labelledby="culture-vip-title">
      <div className="culture-container">
        <div>
          <h2 id="culture-vip-title">
            {en
              ? "Planning a group concert cruise?"
              : "วางแผนล่องเรือชมคอนเสิร์ตเป็นกลุ่ม?"}
          </h2>
          <p>
            {en
              ? "Prepare your preferred sailing, party size and table preferences. The proposed bow-stage layout requires operator approval before real table sales."
              : "เตรียมรอบที่สนใจ จำนวนคน และโต๊ะที่ต้องการ ผังเวทีหัวเรือที่เสนอจะต้องให้ผู้ประกอบการรับรองก่อนเปิดขายโต๊ะจริง"}
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
              ? "Talk to River Life on LINE or Facebook."
              : "พูดคุยกับ River Life ผ่าน LINE หรือ Facebook"}
          </p>
        </div>
      </div>
    </section>
  );
}
