import type { Language } from "../../data/i18n";
import "../../OnboardExperiences.css";
import { editorialPhotos } from "../../data/editorialPhotos";

export const onboardExperiences = [
  {
    image: "cruise",
    photo: editorialPhotos.exterior,
    th: "ล่องเรือ UNICORN CRUISE",
    en: "Cruise aboard UNICORN",
    textTh: "ชมกรุงเทพฯ จากสายน้ำบนเรือของเรา",
    textEn: "Discover Bangkok from the water aboard our cruise.",
  },
  {
    image: "buffet",
    photo: editorialPhotos.food,
    th: "มื้ออาหารบนเรือ",
    en: "On-board dining",
    textTh: "อาหารหลากหลาย ซีฟู้ด และของหวานตามเมนูของเรือ",
    textEn: "A selection of dishes, seafood and desserts from the cruise menu.",
  },
  {
    image: "dining",
    photo: editorialPhotos.covered,
    th: "มื้ออาหารพร้อมวิวแม่น้ำ",
    en: "Dine beside the river",
    textTh: "รับประทานอาหารและเก็บภาพบรรยากาศริมฝั่งจากโต๊ะบนเรือ",
    textEn: "Enjoy your meal and capture riverside moments from on board.",
  },
  {
    image: "entertainment",
    photo: {
      src: "/images/experiences/hanuman-hq.webp",
      width: 1632,
      height: 832,
      position: "50% 34%",
    },
    th: "การแสดงและเสียงเพลง",
    en: "Thai performances & music",
    textTh: "สัมผัสการแสดงไทยและความบันเทิงที่เป็นส่วนหนึ่งของค่ำคืนบนเรือ",
    textEn:
      "Experience Thai performances and entertainment throughout your evening on board.",
  },
  {
    image: "river-view",
    photo: editorialPhotos.table,
    th: "ชมวิวและถ่ายภาพเจ้าพระยา",
    en: "River views & photo moments",
    textTh: "ชมวัดสำคัญ สะพาน และแสงเมืองริมแม่น้ำจากบนเรือ",
    textEn:
      "Take in riverside temples, bridges and city lights from the cruise.",
  },
];

export default function OnboardExperiences({
  language,
}: {
  language: Language;
}) {
  const en = language === "en";
  return (
    <div className="onboard-experiences">
      <div className="culture-section-heading">
        <div>
          <h2 id="culture-spaces-title">
            {en ? "Your experience on board" : "ประสบการณ์ที่คุณจะได้รับบนเรือ"}
          </h2>
          <p>
            {en
              ? "Enjoy river views, dining and an on-board concert on every sailing. Artist lineups are announced for each sailing."
              : "สัมผัสวิวเจ้าพระยา มื้ออาหาร และคอนเสิร์ตบนเรือในทุกรอบ รายชื่อศิลปินจะประกาศตามรอบล่องเรือ"}
          </p>
        </div>
      </div>
      <div className="onboard-experience-grid">
        {onboardExperiences.map((experience) => (
          <article className="onboard-experience-card" key={experience.image}>
            <img
              src={experience.photo.src}
              alt={en ? experience.en : experience.th}
              width={experience.photo.width}
              height={experience.photo.height}
              style={{ objectPosition: experience.photo.position }}
              decoding="async"
              loading="lazy"
            />
            <div>
              <h3>{en ? experience.en : experience.th}</h3>
              <p>{en ? experience.textEn : experience.textTh}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="onboard-experience-origin">
        {en
          ? "Real photographs and film stills supplied by the cruise. Menus and event arrangements vary by sailing."
          : "ภาพถ่ายและภาพจากคลิปที่เรือจัดส่งให้ เมนูและการจัดงานขึ้นอยู่กับรอบล่องเรือ"}
      </p>
    </div>
  );
}
