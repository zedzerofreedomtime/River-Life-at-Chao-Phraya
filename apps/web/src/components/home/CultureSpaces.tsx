import type { Language } from "../../data/i18n";
import { onboardExperiences } from "../cruise/OnboardExperiences";
import { deckPhotos } from "../cruise/DeckGallery";
import PhotoGallery, { type CruisePhoto } from "../shared/PhotoGallery";

// Six distinct real views: vessel, both decks, dining, performance and river.
const onboardPhotos: readonly CruisePhoto[] = [
  deckPhotos[0],
  deckPhotos[2],
  deckPhotos[3],
  ...onboardExperiences
    .filter((experience) =>
      ["buffet", "entertainment", "river-view"].includes(experience.image),
    )
    .map((experience) => ({
      ...experience.photo,
      th: experience.th,
      en: experience.en,
      detailTh: experience.textTh,
      detailEn: experience.textEn,
    })),
];

export default function CultureSpaces({ language }: { language: Language }) {
  const en = language === "en";
  return (
    <section
      id="spaces-on-board"
      data-home-section="gallery"
      className="culture-spaces culture-container"
      aria-labelledby="culture-spaces-title"
    >
      <div className="culture-section-heading">
        <div>
          <p className="home-section-label">CRUISE GALLERY</p>
          <h2 id="culture-spaces-title">
            {en
              ? "Life aboard Unicorn Cruise"
              : "บรรยากาศจริงบนเรือ Unicorn Cruise"}
          </h2>
          <p>
            {en
              ? "Explore the open-air upper deck, indoor dining and the moments on board — food, Thai performances, music and Chao Phraya views, brought together by River Life."
              : "รู้จักพื้นที่ชั้นบนกลางแจ้งและห้องอาหารชั้นล่าง พร้อมมื้ออาหาร การแสดงไทย เสียงเพลง และวิวเจ้าพระยา ในประสบการณ์เดียวของ River Life"}
          </p>
        </div>
      </div>
      <PhotoGallery
        photos={onboardPhotos}
        language={language}
        className="cruise-onboard-gallery"
        viewerLabel={
          en
            ? "Unicorn Cruise spaces and experiences"
            : "ภาพพื้นที่และประสบการณ์บนเรือ Unicorn Cruise"
        }
      />
      <p className="onboard-experience-origin">
        {en
          ? "Real photographs and film stills supplied by the cruise. Table arrangements, menus and performances depend on the selected sailing."
          : "ภาพถ่ายและภาพจากคลิปที่เรือจัดส่งให้ การจัดโต๊ะ เมนู และการแสดงขึ้นอยู่กับรอบล่องเรือที่เลือก"}
      </p>
      <details className="culture-river-context">
        <summary>
          {en
            ? "Read more about the Chao Phraya"
            : "ข้อมูลประกอบเกี่ยวกับแม่น้ำเจ้าพระยา"}
        </summary>
        <p>
          {en
            ? "For context, the Marine Department reported 7,264,336 passengers on Chao Phraya express boats in fiscal 2024. This is public-boat ridership, not a count of tourists or dinner-cruise guests."
            : "กรมเจ้าท่ารายงานผู้โดยสารเรือด่วนเลียบฝั่งแม่น้ำเจ้าพระยา 7,264,336 คนในปีงบประมาณ 2567 ตัวเลขนี้เป็นผู้โดยสารเรือด่วน ไม่ใช่จำนวนนักท่องเที่ยวหรือผู้โดยสารเรือดินเนอร์"}
        </p>
        <a
          href="https://www.tourismthailand.org/Articles/vijit-chao-phraya-2025-en"
          target="_blank"
          rel="noopener noreferrer"
        >
          {en ? "Tourism Authority of Thailand" : "การท่องเที่ยวแห่งประเทศไทย"}
        </a>
        {" · "}
        <a
          href="https://md.go.th/wp-content/uploads/2025/06/%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%AA%E0%B8%96%E0%B8%B4%E0%B8%95%E0%B8%B4%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%A1%E0%B8%B9%E0%B8%A5%E0%B8%9B%E0%B8%B5%E0%B8%87%E0%B8%9A%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%A1%E0%B8%B2%E0%B8%93-2567.pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          {en
            ? "Marine Department statistics, table 15"
            : "สถิติกรมเจ้าท่า ตารางที่ 15"}
        </a>
      </details>
    </section>
  );
}
