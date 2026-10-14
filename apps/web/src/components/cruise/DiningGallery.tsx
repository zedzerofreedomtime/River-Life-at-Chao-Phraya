import type { Language } from "../../data/i18n";
import PhotoGallery from "../shared/PhotoGallery";

const photos = [
  {
    src: "/images/experiences/seafood.jpg",
    th: "ซีฟู้ดบนเรือ",
    en: "Seafood on board",
    detailTh: "ภาพอาหารจริงจากคลิปของเรือ",
    detailEn: "Real food captured in the cruise film.",
  },
  {
    src: "/images/experiences/buffet.jpg",
    th: "ไลน์อาหารบนเรือ",
    en: "On-board buffet",
    detailTh: "ชมการจัดไลน์อาหารและพื้นที่ให้บริการ",
    detailEn: "A closer look at the buffet and serving area.",
  },
  {
    src: "/images/boat/unicorn-table-spread.jpg",
    th: "อาหารบนโต๊ะมื้อค่ำ",
    en: "Dinner at your table",
    detailTh: "ตัวอย่างอาหารและการจัดโต๊ะจากภาพของเรือ",
    detailEn: "A sample of dishes and table setting in the cruise photos.",
  },
  {
    src: "/images/boat/unicorn-dining-dishes.jpg",
    th: "รายละเอียดมื้ออาหาร",
    en: "A closer look at dining",
    detailTh: "ดูภาพใหญ่ประกอบเมนูต้นฉบับที่เรือส่งให้",
    detailEn: "Explore the photo alongside the cruise-supplied menu.",
  },
  {
    src: "/images/experiences/dining.jpg",
    th: "มื้ออาหารพร้อมวิวเจ้าพระยา",
    en: "Dining with Chao Phraya views",
    detailTh: "บรรยากาศริมราวเรือระหว่างรับประทานอาหาร",
    detailEn: "The riverside atmosphere during dinner.",
  },
];

export default function DiningGallery({ language }: { language: Language }) {
  return <PhotoGallery photos={photos} language={language} />;
}
