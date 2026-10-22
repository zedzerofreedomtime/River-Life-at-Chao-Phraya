import type { Language } from "../../data/i18n";
import PhotoGallery from "../shared/PhotoGallery";
import { editorialPhotos } from "../../data/editorialPhotos";
import "../../EditorialPhotos.css";

const photos = [
  {
    ...editorialPhotos.seafood,
    format: "portrait" as const,
    th: "ซีฟู้ดบนเรือ",
    en: "Seafood on board",
    detailTh: "ภาพอาหารจริงจากเรือ เมนูขึ้นอยู่กับรอบงาน",
    detailEn: "Cruise-supplied food photo. Menus vary by sailing.",
  },
  {
    ...editorialPhotos.food,
    format: "portrait" as const,
    th: "สีสันของมื้ออาหาร",
    en: "Flavours of the evening",
    detailTh: "ตัวอย่างอาหารที่เรือจัดเตรียม",
    detailEn: "A selection photographed on board.",
  },
  {
    ...editorialPhotos.salmon,
    format: "portrait" as const,
    th: "แซลมอนบนโต๊ะอาหาร",
    en: "Salmon, served on board",
    detailTh: "ดูภาพใหญ่ประกอบเมนูของรอบที่เลือก",
    detailEn: "Explore the photo alongside your sailing’s menu.",
  },
  {
    ...editorialPhotos.curry,
    format: "portrait" as const,
    th: "รสชาติอาหารไทย",
    en: "Thai flavours",
    detailTh: "ภาพอาหารจริง ไม่ใช่ภาพจำลอง",
    detailEn: "Real food photography, not an illustration.",
  },
];

export default function DiningGallery({ language }: { language: Language }) {
  return (
    <PhotoGallery
      photos={photos}
      language={language}
      className="cruise-food-gallery"
    />
  );
}
