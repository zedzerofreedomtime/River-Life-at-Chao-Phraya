import { editorialPhotos } from "./editorialPhotos";

// Existing, cruise-supplied photographs; no generated scenery.
export const riversideGalleryPhotos = [
  {
    ...editorialPhotos.table,
    th: "โต๊ะมื้อค่ำริมแม่น้ำ",
    en: "Riverside dinner tables",
  },
  {
    src: "/images/boat/unicorn-upper-deck.jpg",
    width: 1477,
    height: 1108,
    th: "ดาดฟ้าเปิดโล่งยามค่ำ",
    en: "The open deck at night",
  },
  {
    ...editorialPhotos.evening,
    th: "แสงเมืองและบรรยากาศบนดาดฟ้า",
    en: "City lights from the upper deck",
  },
  {
    ...editorialPhotos.covered,
    th: "มื้อค่ำในพื้นที่มีหลังคา",
    en: "Dining in the covered area",
  },
] as const;
