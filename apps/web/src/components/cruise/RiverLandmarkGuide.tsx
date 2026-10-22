import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  ExternalLink,
  Ship,
} from "lucide-react";
import type { Language } from "../../data/i18n";
import {
  landmarkSide,
  riverLandmarks,
  type RiverDirection,
} from "../../data/riverLandmarks";
import { riverLandmarkCredits } from "../../data/riverLandmarkCredits";
import "../../RiverLandmarkGuide.css";

export default function RiverLandmarkGuide({
  language,
}: {
  language: Language;
}) {
  const en = language === "en";
  const [direction, setDirection] = useState<RiverDirection>("upstream");
  const sideLabel = (side: string) =>
    en
      ? {
          left: "Left · port",
          right: "Right · starboard",
          crossing: "Across the river",
        }[side]
      : { left: "ซ้ายมือ", right: "ขวามือ", crossing: "พาดข้ามแม่น้ำ" }[side];

  return (
    <section
      id="river-landmark-guide"
      className="landmark-guide culture-container"
      aria-labelledby="landmark-guide-title"
    >
      <div className="landmark-heading">
        <div>
          <span className="landmark-eyebrow">
            RIVERSIDE STORIES / 11 PLACES
          </span>
          <h2 id="landmark-guide-title">
            {en ? "Two riverbanks. Eleven stories." : "สองฝั่งน้ำ 11 เรื่องราว"}
          </h2>
          <p>
            {en
              ? "Know where to look — and the stories behind the landmarks."
              : "รู้ว่าต้องมองฝั่งไหน พร้อมเรื่องราวของแต่ละสถานที่"}
          </p>
        </div>
        <span className="landmark-count">
          11 <span>{en ? "places" : "สถานที่"}</span>
        </span>
      </div>

      <div className="landmark-route-notice">
        <Ship size={22} aria-hidden="true" />
        <p>
          {en
            ? "Complete place list from your VIVA Alangka reference poster — not a confirmed Unicorn Cruise itinerary. Not every sailing reaches all 11 places. Confirm your River Life sailing’s route before booking; these are not shore visits or guaranteed photo stops."
            : "ครบตาม 11 จุดในภาพอ้างอิง VIVA Alangka — ยังไม่ใช่เส้นทางยืนยันของ Unicorn Cruise แต่ละรอบอาจไม่ได้ผ่านครบ ต้องตรวจเส้นทางงาน River Life ก่อนจอง ไม่ใช่โปรแกรมขึ้นฝั่งหรือรับประกันจอดถ่ายภาพ"}
        </p>
      </div>

      <div className="landmark-direction">
        <div>
          <h3>
            {en
              ? "Which way is the boat travelling?"
              : "ตอนนี้เรือกำลังไปทางไหน?"}
          </h3>
          <p>
            {en
              ? "Always face the bow, not the direction your chair faces."
              : "ยืนหันหน้าไปทางหัวเรือ ไม่ใช่ทิศที่เก้าอี้หัน"}
          </p>
        </div>
        <div
          className="landmark-direction-buttons"
          role="group"
          aria-label={en ? "Sailing direction" : "ทิศทางเดินเรือ"}
        >
          <button
            type="button"
            aria-pressed={direction === "upstream"}
            onClick={() => setDirection("upstream")}
          >
            {en ? "Upstream · toward Rama VIII" : "ทวนน้ำ · ไปทางพระราม 8"}
          </button>
          <button
            type="button"
            aria-pressed={direction === "downstream"}
            onClick={() => setDirection("downstream")}
          >
            {en ? "Downstream · toward Rama 3" : "ตามน้ำ · ไปทางพระราม 3"}
          </button>
        </div>
      </div>
      <p className="landmark-direction-result" role="status">
        {direction === "upstream"
          ? en
            ? "Upstream: west / Thonburi bank on your left; east / Phra Nakhon bank on your right."
            : "ทวนน้ำ: ฝั่งธนบุรีอยู่ซ้ายมือ · ฝั่งพระนครอยู่ขวามือ"
          : en
            ? "Downstream: east / Phra Nakhon bank on your left; west / Thonburi bank on your right."
            : "ตามน้ำ: ฝั่งพระนครอยู่ซ้ายมือ · ฝั่งธนบุรีอยู่ขวามือ"}
        <span>
          {en
            ? "General bank-based guide, not live navigation. Turning, bends and the boat’s position affect the viewing angle. Numbering follows the poster, not sailing order."
            : "เป็นแนวดูฝั่งตามทิศทาง ไม่ใช่ระบบนำทางสด ช่วงกลับลำ โค้งน้ำ และตำแหน่งเรือทำให้มุมมองเปลี่ยนได้ หมายเลขอ้างอิงตามภาพ ไม่ใช่ลำดับเรือผ่าน"}
        </span>
      </p>

      <div className="landmark-grid">
        {riverLandmarks.map((place, index) => {
          const side = landmarkSide(place.bank, direction);
          return (
            <article
              className="landmark-card"
              key={place.id}
              data-landmark={place.id}
            >
              <a
                className="landmark-image"
                href={place.image}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${en ? "Open location photo: " : "เปิดภาพสถานที่: "}${en ? place.en : place.th}`}
              >
                <img
                  src={place.image}
                  alt={
                    en
                      ? `${place.en} — location illustration, not a guaranteed boat view`
                      : `${place.th} — ภาพประกอบสถานที่ ไม่ใช่มุมจากเรือทุกรูป`
                  }
                  width={1600}
                  height={1067}
                  loading="lazy"
                  decoding="async"
                  style={{ objectPosition: place.position }}
                />
                <span className="landmark-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="landmark-photo-label">
                  <Camera size={14} aria-hidden="true" />
                  {en ? "Location photo" : "ภาพประกอบสถานที่"}
                </span>
              </a>
              <div className="landmark-card-copy">
                <span className="landmark-side" data-side={side}>
                  {side === "left" ? (
                    <ArrowLeft size={15} aria-hidden="true" />
                  ) : side === "right" ? (
                    <ArrowRight size={15} aria-hidden="true" />
                  ) : (
                    <Ship size={15} aria-hidden="true" />
                  )}
                  {sideLabel(side)}
                </span>
                <h3>{en ? place.en : place.th}</h3>
                <p className="landmark-era">{en ? place.eraEn : place.eraTh}</p>
                <details className="landmark-history">
                  <summary>
                    {en ? "History & where to look" : "ประวัติและจุดที่ควรมอง"}
                  </summary>
                  <p>{en ? place.historyEn : place.historyTh}</p>
                  <p className="landmark-view">
                    <Camera size={17} aria-hidden="true" />
                    {en ? place.viewEn : place.viewTh}
                  </p>
                  <a
                    href={place.source}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {en ? "History source" : "แหล่งข้อมูลประวัติ"}:{" "}
                    {place.sourceLabel}
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </details>
              </div>
            </article>
          );
        })}
      </div>
      <details className="landmark-credits">
        <summary>
          {en
            ? "Photography credits & viewing notes"
            : "เครดิตภาพและหมายเหตุการชม"}
        </summary>
        <p>
          {en
            ? "Real location photos, not AI reconstructions. Some are daytime, interior or land-side views, rather than photographs taken from a cruise. Display crops vary by screen. Modern places have background context, not invented ancient histories."
            : "ใช้ภาพสถานที่จริง ไม่ใช่ภาพ AI จำลอง มีทั้งภาพกลางวัน ภายในวัด และมุมจากบนฝั่ง ไม่ใช่ภาพถ่ายจากเรือทั้งหมด ครอปเพื่อแสดงผลตามหน้าจอ สถานที่ยุคใหม่เล่าที่มา ไม่แต่งให้เป็นโบราณสถาน"}
        </p>
        <ul>
          {riverLandmarkCredits.map((credit) => (
            <li key={credit.id}>
              {
                riverLandmarks.find((place) => place.id === credit.id)?.[
                  en ? "en" : "th"
                ]
              }
              {" — "}
              {credit.author}
              {" · "}
              {credit.url ? (
                <a href={credit.url} target="_blank" rel="noopener noreferrer">
                  {en ? "Photo source" : "ที่มาภาพ"}
                </a>
              ) : en ? (
                "Cruise-supplied film"
              ) : (
                "คลิปที่เรือจัดส่งให้"
              )}
              {" · "}
              {credit.licenseUrl ? (
                <a
                  href={credit.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {credit.license}
                </a>
              ) : (
                credit.license
              )}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
