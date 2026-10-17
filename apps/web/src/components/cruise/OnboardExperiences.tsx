import type { Language } from "../../data/i18n";
import "../../OnboardExperiences.css";

const experiences = [
  {
    image: "cruise",
    th: "ล่องเรือ UNICORN CRUISE",
    en: "Cruise aboard UNICORN",
    textTh: "ชมกรุงเทพฯ จากสายน้ำบนเรือของเรา",
    textEn: "Discover Bangkok from the water aboard our cruise.",
  },
  {
    image: "buffet",
    th: "ไลน์อาหารบนเรือ",
    en: "On-board dining",
    textTh: "อาหารหลากหลาย ซีฟู้ด และของหวานตามเมนูของเรือ",
    textEn: "A selection of dishes, seafood and desserts from the cruise menu.",
  },
  {
    image: "dining",
    th: "มื้ออาหารพร้อมวิวแม่น้ำ",
    en: "Dine beside the river",
    textTh: "รับประทานอาหารและเก็บภาพบรรยากาศริมฝั่งจากโต๊ะบนเรือ",
    textEn: "Enjoy your meal and capture riverside moments from on board.",
  },
  {
    image: "entertainment",
    th: "การแสดงและเสียงเพลง",
    en: "Thai performances & music",
    textTh: "สัมผัสการแสดงไทยและความบันเทิงที่เป็นส่วนหนึ่งของค่ำคืนบนเรือ",
    textEn:
      "Experience Thai performances and entertainment throughout your evening on board.",
  },
  {
    image: "river-view",
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
        {experiences.map((experience) => (
          <article className="onboard-experience-card" key={experience.image}>
            <img
              src={`/images/experiences/${experience.image}.jpg`}
              alt={en ? experience.en : experience.th}
              width={1200}
              height={624}
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
        {en ? "Real moments from our cruise film." : "ภาพจริงจากคลิปของเรือ"}
      </p>
    </div>
  );
}
