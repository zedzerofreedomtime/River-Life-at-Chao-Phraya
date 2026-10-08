import type { Language } from "./i18n";

const photos = [
  {
    src: "/images/experiences/seafood.jpg",
    th: "ซีฟู้ดบนเรือ",
    en: "Seafood on board",
  },
  {
    src: "/images/experiences/buffet.jpg",
    th: "ไลน์อาหารบนเรือ",
    en: "On-board buffet",
  },
  {
    src: "/images/experiences/dining.jpg",
    th: "มื้ออาหารพร้อมวิวเจ้าพระยา",
    en: "Dining with Chao Phraya views",
  },
];

export default function DiningGallery({ language }: { language: Language }) {
  return (
    <div className="dining-gallery">
      {photos.map((photo) => (
        <figure key={photo.src}>
          <img
            src={photo.src}
            alt={language === "en" ? photo.en : photo.th}
            width={1200}
            height={624}
            loading="lazy"
          />
          <figcaption>{language === "en" ? photo.en : photo.th}</figcaption>
        </figure>
      ))}
    </div>
  );
}
