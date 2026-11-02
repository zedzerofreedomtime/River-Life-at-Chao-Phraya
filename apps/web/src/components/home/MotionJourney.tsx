import { useEffect, useRef, useState, type ReactNode } from "react";
import Button from "@mui/material/Button";
import { ArrowRight, Images } from "lucide-react";
import type { Language } from "../../data/i18n";
import MotionOpening from "./MotionOpening";
import ExperienceCarousel from "./ExperienceCarousel";
import ExperiencePhotoGallery from "./ExperiencePhotoGallery";
import RiverJourneyScene from "./RiverJourneyScene";
import { editorialPhotos } from "../../data/editorialPhotos";
import { foodGalleryPhotos } from "../../data/foodGalleryPhotos";
import { hanumanGalleryPhotos } from "../../data/hanumanGalleryPhotos";
import { musicGalleryPhotos } from "../../data/musicGalleryPhotos";
import "../../EditorialPhotos.css";

export default function MotionJourney({
  language,
  onBook,
  facts,
}: {
  language: Language;
  onBook: () => void;
  facts: ReactNode;
}) {
  const en = language === "en";
  const root = useRef<HTMLDivElement>(null);
  const [showOpen, setShowOpen] = useState(false);
  const [foodOpen, setFoodOpen] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [riversideOpen, setRiversideOpen] = useState(false);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  // The removed controls must not leave visitors stuck with a saved "off" mode.
  // Continue honoring the device's accessibility preference.
  const effectiveMode = reduced ? "off" : "full";
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const jump = (id: string) =>
    document.getElementById(id)?.scrollIntoView({
      behavior: effectiveMode === "off" ? "instant" : "smooth",
      block: "start",
    });
  return (
    <div className="motion-journey" ref={root} data-motion={effectiveMode}>
      <MotionOpening
        language={language}
        motion={effectiveMode}
        suspended={showOpen || foodOpen || musicOpen || riversideOpen}
        onExplore={() => jump("life-on-board")}
        onBook={onBook}
      />
      <section
        data-home-section="experience"
        aria-labelledby="mj-experience-title"
      >
        {facts}
        <section
          className="mj-experience mj-gutter"
          id="life-on-board"
          aria-labelledby="mj-experience-title"
        >
          <div className="mj-intro" data-mj-reveal>
            <h2 id="mj-experience-title">
              {en ? (
                <>
                  An evening.
                  <br />
                  <em>A thousand memories.</em>
                </>
              ) : (
                <>
                  หนึ่งค่ำคืนบนสายน้ำ
                  <br />
                  <em>ความทรงจำนับไม่ถ้วน</em>
                </>
              )}
            </h2>
            <p>
              {en
                ? "Dining, Hanuman and live music. One unforgettable night on the river."
                : "อาหาร การแสดงหนุมาน และคอนเสิร์ตบนเรือ ร่วมเป็นส่วนหนึ่งของค่ำคืนบนเจ้าพระยา"}
            </p>
            <div className="mj-river-line" aria-hidden="true">
              <svg viewBox="0 0 800 100" preserveAspectRatio="none">
                <path d="M0 50 Q400 95 800 50" />
              </svg>
            </div>
          </div>
          <ExperienceCarousel
            language={language}
            suspended={showOpen || foodOpen || musicOpen || riversideOpen}
            motion={effectiveMode}
          >
            <figure id="mj-gallery-0" className="mj-dining">
              <button
                type="button"
                className="mj-frame"
                onClick={() => setFoodOpen(true)}
                aria-label={
                  en ? "Open dining gallery" : "เปิดแกลเลอรีอาหารบนเรือ"
                }
              >
                <img
                  src={foodGalleryPhotos[0].src}
                  alt={
                    en
                      ? "Food photographed on Unicorn Cruise"
                      : "ภาพอาหารจากเรือ Unicorn Cruise"
                  }
                  width={editorialPhotos.seafood.width}
                  height={editorialPhotos.seafood.height}
                  style={{ objectPosition: editorialPhotos.seafood.position }}
                  loading="lazy"
                />
              </button>
              <figcaption>
                <span>01 / {en ? "Dining" : "มื้ออาหาร"}</span>
                <p>
                  {en ? "A taste of the evening." : "เติมรสชาติให้ค่ำคืนพิเศษ"}
                </p>
                <Button onClick={() => setFoodOpen(true)}>
                  {en ? "View onboard dining" : "ดูไลน์อาหารบนเรือ"}
                  <ArrowRight size={16} />
                </Button>
              </figcaption>
            </figure>
            <figure id="mj-gallery-1" className="mj-hanuman">
              <button
                className="mj-frame mj-portrait"
                type="button"
                onClick={() => setShowOpen(true)}
                aria-label={
                  en
                    ? "Open Hanuman photo gallery"
                    : "เปิดแกลเลอรีการแสดงหนุมาน"
                }
              >
                <img
                  src={hanumanGalleryPhotos[0].src}
                  style={{ objectPosition: "50% 34%" }}
                  alt={
                    en
                      ? "Hanuman performer entertaining guests"
                      : "การแสดงหนุมานท่ามกลางผู้ร่วมเดินทาง"
                  }
                  width={hanumanGalleryPhotos[0].width}
                  height={hanumanGalleryPhotos[0].height}
                  loading="lazy"
                />
                <span className="mj-watch">
                  <Images size={18} />
                  {en ? "View 5 performance photos" : "ดูภาพการแสดง 5 รูป"}
                </span>
              </button>
              <figcaption>
                <span>02 / {en ? "Hanuman" : "หนุมาน"}</span>
                <p>
                  {en
                    ? "Culture, brought to life."
                    : "สีสันแห่งวัฒนธรรมที่มีชีวิต"}
                </p>
                <Button
                  onClick={() => setShowOpen(true)}
                  endIcon={<ArrowRight size={16} />}
                >
                  {en ? "View performance photos" : "ดูภาพการแสดง"}
                </Button>
              </figcaption>
            </figure>
            <figure id="mj-gallery-2" className="mj-music">
              <button
                type="button"
                className="mj-frame"
                onClick={() => setMusicOpen(true)}
                aria-label={
                  en ? "Open live music gallery" : "เปิดแกลเลอรีดนตรีบนเรือ"
                }
              >
                <img
                  src={musicGalleryPhotos[0].src}
                  alt={en ? musicGalleryPhotos[0].en : musicGalleryPhotos[0].th}
                  width={musicGalleryPhotos[0].width}
                  height={musicGalleryPhotos[0].height}
                  style={{ objectPosition: "50% 40%" }}
                  loading="lazy"
                />
                <span className="mj-watch">
                  <Images size={18} />
                  {en ? "View music photos" : "ดูภาพดนตรีบนเรือ"}
                </span>
              </button>
              <figcaption>
                <span>03 / {en ? "Live music" : "คอนเสิร์ตบนเรือ"}</span>
                <p>
                  {en ? "The river has a rhythm." : "ให้เสียงเพลงพาคุณล่องไป"}
                </p>
                <Button
                  onClick={() => setMusicOpen(true)}
                  endIcon={<ArrowRight size={16} />}
                >
                  {en ? "View music photos" : "ดูภาพดนตรีบนเรือ"}
                </Button>
                <Button onClick={onBook} endIcon={<ArrowRight size={16} />}>
                  {en ? "Explore the sailing" : "ดูรายละเอียดรอบล่องเรือ"}
                </Button>
              </figcaption>
            </figure>
            <figure className="mj-detail">
              <button
                type="button"
                className="mj-frame"
                onClick={() => setRiversideOpen(true)}
                aria-label={
                  en
                    ? "Open riverside dining gallery"
                    : "เปิดแกลเลอรีมื้อค่ำพร้อมวิว"
                }
              >
                <img
                  src={editorialPhotos.table.src}
                  alt={
                    en
                      ? "Dinner with a riverside view"
                      : "มื้อค่ำพร้อมวิวริมแม่น้ำ"
                  }
                  width={editorialPhotos.table.width}
                  height={editorialPhotos.table.height}
                  style={{ objectPosition: editorialPhotos.table.position }}
                  loading="lazy"
                />
                <span className="mj-watch">
                  <Images size={18} />
                  {en ? "View riverside photos" : "ดูภาพมื้อค่ำพร้อมวิว"}
                </span>
              </button>
              <figcaption>
                <span>04 / {en ? "Riverside dining" : "มื้อค่ำพร้อมวิว"}</span>
                <p>
                  {en
                    ? "One unforgettable night."
                    : "อีกหนึ่งค่ำคืนที่อยากจดจำ"}
                </p>
                <Button
                  onClick={() => setRiversideOpen(true)}
                  endIcon={<ArrowRight size={16} />}
                >
                  {en ? "View riverside photos" : "ดูภาพมื้อค่ำพร้อมวิว"}
                </Button>
                <Button onClick={onBook} endIcon={<ArrowRight size={16} />}>
                  {en ? "Explore the sailing" : "ดูรายละเอียดรอบล่องเรือ"}
                </Button>
              </figcaption>
            </figure>
          </ExperienceCarousel>
        </section>
        <RiverJourneyScene language={language} motion={effectiveMode} />
      </section>
      {foodOpen && (
        <ExperiencePhotoGallery
          kind="food"
          language={language}
          onClose={() => setFoodOpen(false)}
        />
      )}
      {showOpen && (
        <ExperiencePhotoGallery
          kind="hanuman"
          language={language}
          onClose={() => setShowOpen(false)}
        />
      )}
      {musicOpen && (
        <ExperiencePhotoGallery
          kind="music"
          language={language}
          onClose={() => setMusicOpen(false)}
        />
      )}
      {riversideOpen && (
        <ExperiencePhotoGallery
          kind="riverside"
          language={language}
          onClose={() => setRiversideOpen(false)}
        />
      )}
    </div>
  );
}
