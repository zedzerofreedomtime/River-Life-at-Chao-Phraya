import type { Language } from "./i18n";

const photos = [
  { src: "/images/boat/unicorn-seafood.jpg", th: "ซีฟู้ดบนเรือ", en: "Seafood on board" },
  { src: "/images/boat/unicorn-dining-dishes.jpg", th: "อาหารหลากหลายบนโต๊ะ", en: "A selection of dishes" },
  { src: "/images/boat/unicorn-table-spread.jpg", th: "บรรยากาศมื้ออาหาร", en: "Dining on the river" },
];

export default function DiningGallery({ language }: { language: Language }) {
  return (
    <div className="dining-gallery">
      {photos.map((photo) => (
        <figure key={photo.src}>
          <img src={photo.src} alt={language === "en" ? photo.en : photo.th} width={1108} height={1477} loading="lazy" />
          <figcaption>{language === "en" ? photo.en : photo.th}</figcaption>
        </figure>
      ))}
    </div>
  );
}
