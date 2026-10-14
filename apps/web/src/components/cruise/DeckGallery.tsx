import type { Language } from "../../data/i18n";
import PhotoGallery, { type CruisePhoto } from "../shared/PhotoGallery";
const photos: readonly CruisePhoto[] = [
  {
    src: "/images/boat/unicorn-upper-deck.jpg",
    th: "พื้นที่นั่งชั้นบน",
    en: "Upper-deck seating",
    detailTh: "พื้นที่เปิดรับวิวแม่น้ำ พร้อมมุมมองโต๊ะและเวทีจากภาพจริง",
    detailEn: "Open-air river views, with a real look at the tables and stage.",
  },
  {
    src: "/images/boat/unicorn-lower-deck-dining.jpg",
    th: "พื้นที่นั่งชั้นล่าง",
    en: "Lower-deck seating",
    detailTh: "ชมพื้นที่ภายในเรือ โต๊ะริมหน้าต่าง และไลน์บริการอาหาร",
    detailEn: "Explore the indoor deck, window-side tables and buffet area.",
  },
];
export default function DeckGallery({ language }: { language: Language }) {
  const en = language === "en";
  return (
    <div aria-labelledby="cruise-decks-title">
      <div className="culture-section-heading">
        <div>
          <h2 id="cruise-decks-title">
            {en
              ? "Find your favourite view"
              : "รู้จักพื้นที่นั่งก่อนเลือกค่ำคืนของคุณ"}
          </h2>
          <p>
            {en
              ? "Explore both decks in real cruise photos. These are atmosphere photos, not a live seating plan; available zones depend on your selected sailing."
              : "ดูพื้นที่สองชั้นจากภาพจริงของเรือ ภาพนี้แสดงบรรยากาศ ไม่ใช่ผังที่นั่งว่าง โซนที่เลือกได้ขึ้นอยู่กับรอบล่องเรือ"}
          </p>
        </div>
      </div>
      <PhotoGallery
        photos={photos}
        language={language}
        className="cruise-deck-gallery"
      />
    </div>
  );
}
