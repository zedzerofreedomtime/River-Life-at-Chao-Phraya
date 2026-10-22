import type { Language } from "../../data/i18n";
import PhotoGallery, { type CruisePhoto } from "../shared/PhotoGallery";
import { editorialPhotos } from "../../data/editorialPhotos";
export const deckPhotos: readonly CruisePhoto[] = [
  {
    ...editorialPhotos.exterior,
    th: "Unicorn Cruise ยามค่ำคืน",
    en: "Unicorn Cruise after dark",
    detailTh:
      "ตัวเรือสีเงินและไฟเส้นสีฟ้า เอกลักษณ์ของเรือที่ใช้จัดงาน River Life",
    detailEn:
      "The silver hull and signature cyan lights of the vessel hosting River Life.",
  },
  {
    src: "/images/boat/unicorn-official-stern.webp",
    position: "50% 81%",
    th: "อีกมุมของเรือและพื้นที่มีหลังคา",
    en: "The covered deck and stern",
    detailTh: "ภาพจริงด้านข้างเรือ ให้เห็นส่วนหลังคาชั้นบนและห้องอาหารชั้นล่าง",
    detailEn:
      "A real side view of the upper canopy and enclosed lower dining deck.",
  },
  {
    src: "/images/boat/unicorn-supplied-upper-layout.webp",
    th: "พื้นที่นั่งชั้นบน",
    en: "Upper-deck seating",
    detailTh: "โต๊ะยาวกลางลำ โต๊ะแยกสองฝั่ง และทางเดินสองแนวจากภาพอ้างอิง",
    detailEn:
      "A central long-table run, separate side tables and two aisles in the reference photo.",
  },
  {
    src: "/images/boat/unicorn-supplied-lower-layout.webp",
    th: "พื้นที่นั่งชั้นล่าง",
    en: "Lower-deck seating",
    detailTh: "ห้องอาหารปรับอากาศ ไลน์บุฟเฟต์ยาวตรงกลาง และโต๊ะสองฝั่ง",
    detailEn:
      "An indoor dining room with a long central buffet island and tables on both sides.",
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
              ? "Your evening aboard Unicorn Cruise"
              : "ค่ำคืนของคุณบน Unicorn Cruise"}
          </h2>
          <p>
            {en
              ? "Real vessel photos: open-air views, covered spaces and indoor dining. River Life hosts the event; table arrangements are announced for each sailing."
              : "ชมเรือจริง ทั้งพื้นที่รับวิวกลางแจ้ง ส่วนมีหลังคา และห้องอาหาร โดย River Life เป็นผู้จัดงานและประกาศการจัดโต๊ะสำหรับแต่ละรอบ"}
          </p>
        </div>
      </div>
      <PhotoGallery
        photos={deckPhotos}
        language={language}
        className="cruise-deck-gallery"
      />
    </div>
  );
}
