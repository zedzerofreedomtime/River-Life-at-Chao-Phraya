import type { Language } from "../../data/i18n";
import PhotoGallery, { type CruisePhoto } from "../shared/PhotoGallery";
import "../../RiverNightGallery.css";

const photos: readonly CruisePhoto[] = [
  {
    src: "/images/river-atmosphere/iconsiam-night-alangka.jpg",
    th: "ICONSIAM ในแสงไฟยามค่ำคืน",
    en: "ICONSIAM after dark",
    detailTh:
      "ภาพวิวริมแม่น้ำและเรือ Alangka Cruise ใช้ประกอบบรรยากาศ ไม่ใช่เรือ UNICORN CRUISE ที่ให้บริการสำหรับการจองนี้",
    detailEn:
      "A riverside scene featuring Alangka Cruise, not the UNICORN CRUISE vessel provided for this booking.",
  },
  {
    src: "/images/river-atmosphere/pinklao-night-alangka.jpg",
    th: "สะพานสมเด็จพระปิ่นเกล้ายามค่ำคืน",
    en: "Somdet Phra Pinklao Bridge at night",
    detailTh:
      "ภาพสะพานและเรือ Alangka Cruise ใช้ประกอบบรรยากาศ ไม่ใช่เรือที่ให้บริการ และไม่ยืนยันว่าเป็นเส้นทางของรอบที่จอง",
    detailEn:
      "A bridge scene featuring Alangka Cruise, not our service vessel. This photo does not confirm the route of your booked sailing.",
  },
];

export default function RiverNightGallery({
  language,
}: {
  language: Language;
}) {
  const en = language === "en";
  return (
    <section
      id="river-night-atmosphere"
      className="river-night-gallery culture-container"
      aria-labelledby="river-night-title"
    >
      <div className="culture-section-heading">
        <div>
          <h2 id="river-night-title">
            {en ? "The Chao Phraya after dark" : "บรรยากาศยามค่ำคืนบนเจ้าพระยา"}
          </h2>
          <p>
            {en
              ? "City lights and reflections along Bangkok’s riverfront. Explore the atmosphere in these riverside photographs."
              : "แสงเมืองและเงาสะท้อนบนสายน้ำ ชมบรรยากาศริมฝั่งกรุงเทพฯ ผ่านภาพถ่ายยามค่ำคืน"}
          </p>
        </div>
      </div>
      <p className="river-night-notice">
        {en
          ? "Riverside atmosphere only: the vessel shown is Alangka Cruise, not UNICORN CRUISE. These photos do not confirm the route of your booked sailing."
          : "ภาพประกอบบรรยากาศริมแม่น้ำ: เรือในภาพคือ Alangka Cruise ไม่ใช่ UNICORN CRUISE และภาพนี้ไม่ใช่การยืนยันเส้นทางของรอบที่จอง"}
      </p>
      <PhotoGallery
        photos={photos}
        language={language}
        className="river-night-photo-grid"
        viewerLabel={en ? "River night photo viewer" : "ภาพบรรยากาศริมแม่น้ำ"}
      />
    </section>
  );
}
