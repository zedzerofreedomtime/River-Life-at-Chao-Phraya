import { Play } from "lucide-react";
import type { Language } from "../../data/i18n";

export default function SignatureExperience({
  language,
}: {
  language: Language;
}) {
  const en = language === "en";
  return (
    <section
      className="signature-experience culture-container"
      aria-labelledby="signature-title"
    >
      <div className="signature-intro">
        <div>
          <h2 id="signature-title">
            {en ? (
              <>
                An evening beyond
                <br />
                <em>the ordinary.</em>
              </>
            ) : (
              <>
                ให้ค่ำคืนนี้
                <br />
                <em>พิเศษกว่าที่เคย</em>
              </>
            )}
          </h2>
          <p>
            {en
              ? "An on-board concert on every River Life sailing. Thai performances, dining and the lights of Bangkok, all in one evening."
              : "คอนเสิร์ตบนเรือในทุกรอบ River Life พร้อมการแสดงไทย มื้ออาหาร และแสงเมืองกรุงเทพฯ ในค่ำคืนเดียว"}
          </p>
        </div>
        <p className="signature-side-note">
          {en
            ? "Real moments. Our boat. Your evening."
            : "ภาพจริงจากเรือของเรา\nเพื่อค่ำคืนของคุณ"}
        </p>
      </div>
      <div className="signature-media">
        <figure className="signature-performance">
          <video
            controls
            playsInline
            preload="none"
            poster="/images/experiences/hanuman.jpg"
            aria-label={
              en
                ? "Hanuman and Thai performances on board"
                : "การแสดงหนุมานและการแสดงไทยบนเรือ"
            }
          >
            <source src="/videos/riverlife-performances.mp4" type="video/mp4" />
          </video>
          <figcaption>
            <span>
              {en ? "Hanuman & Thai performances" : "หนุมานและการแสดงไทย"}
            </span>
            <Play size={18} aria-hidden="true" />
          </figcaption>
        </figure>
        <figure className="signature-dinner">
          <img
            src="/images/experiences/dining.jpg"
            loading="lazy"
            width="1200"
            height="624"
            alt={
              en
                ? "Guests dining with Wat Arun in the background"
                : "ผู้โดยสารรับประทานอาหารพร้อมวิววัดอรุณ"
            }
          />
          <figcaption>
            {en ? "A front-row view of the river" : "มื้อค่ำกับวิวเจ้าพระยา"}
          </figcaption>
        </figure>
      </div>
      <div className="signature-rail">
        {[
          {
            image: "seafood",
            th: "รสชาติของค่ำคืน",
            en: "A world of flavours",
            href: "#cinema-dining",
          },
          {
            image: "river-view",
            th: "เสียงเพลงบนสายน้ำ",
            en: "A concert on every sailing",
            href: "#life-on-board",
          },
          {
            image: "cruise",
            th: "กรุงเทพฯ ในอีกมุมมอง",
            en: "Bangkok from the water",
            href: "#river-highlights",
          },
        ].map((item) => (
          <a key={item.image} href={item.href}>
            <img
              src={`/images/experiences/${item.image}.jpg`}
              loading="lazy"
              width="1200"
              height="624"
              alt=""
            />
            <h3>{en ? item.en : item.th}</h3>
          </a>
        ))}
      </div>
    </section>
  );
}
