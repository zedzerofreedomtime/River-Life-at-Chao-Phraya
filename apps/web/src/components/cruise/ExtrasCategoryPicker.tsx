import {
  CakeSlice,
  Check,
  Gift,
  MessageSquareText,
  PartyPopper,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import type { Language } from "../../data/i18n";

export const extraCategories = [
  {
    id: "food",
    th: "อาหารพิเศษ",
    en: "Special dishes",
    hint: "เพิ่มมื้อพิเศษ",
    hintEn: "Something extra",
    icon: UtensilsCrossed,
  },
  {
    id: "wine",
    th: "ไวน์",
    en: "Wine",
    hint: "เลือกเครื่องดื่ม",
    hintEn: "Pair your dinner",
    icon: Wine,
  },
  {
    id: "cake",
    th: "เค้กและของหวาน",
    en: "Cake & dessert",
    hint: "สอบถามรายการ",
    hintEn: "Enquire about options",
    icon: CakeSlice,
  },
  {
    id: "celebration",
    th: "ฉลองโอกาสพิเศษ",
    en: "Celebrations",
    hint: "วันเกิด · วันครบรอบ",
    hintEn: "Birthday · Anniversary",
    icon: PartyPopper,
  },
  {
    id: "decoration",
    th: "ตกแต่งโต๊ะ",
    en: "Table decorations",
    hint: "สอบถามการจัดเตรียม",
    hintEn: "Ask about arrangements",
    icon: Gift,
  },
  {
    id: "request",
    th: "คำขอเพิ่มเติม",
    en: "Special requests",
    hint: "แจ้งสิ่งที่ต้องการ",
    hintEn: "Tell us your wishes",
    icon: MessageSquareText,
  },
] as const;
export default function ExtrasCategoryPicker({
  language,
  selected,
  counts,
  requests,
  onSelect,
}: {
  language: Language;
  selected: string;
  counts: Record<string, number>;
  requests: string[];
  onSelect: (id: string) => void;
}) {
  const en = language === "en";
  return (
    <div className="bp-category-picker">
      <div className="bp-category-heading">
        <h2>{en ? "What would you like to add?" : "อยากเพิ่มอะไรบนเรือ?"}</h2>
        <button
          className="bp-text-button"
          aria-pressed={selected === "all"}
          onClick={() => onSelect("all")}
        >
          {en ? "All items" : "ทั้งหมด"}
        </button>
      </div>
      <div
        className="bp-category-grid"
        aria-label={en ? "Extra categories" : "หมวดบริการเสริม"}
      >
        {extraCategories.map(({ icon: Icon, ...item }) => (
          <button
            key={item.id}
            aria-label={en ? item.en : item.th}
            aria-pressed={selected === item.id}
            onClick={() => onSelect(item.id)}
          >
            <Icon size={25} strokeWidth={1.6} />
            <strong>{en ? item.en : item.th}</strong>
            <small>{en ? item.hintEn : item.hint}</small>
            {!!counts[item.id] && (
              <span className="bp-category-count">{counts[item.id]}</span>
            )}
            {requests.includes(item.id) && (
              <span className="bp-category-count">
                <Check size={12} />
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
