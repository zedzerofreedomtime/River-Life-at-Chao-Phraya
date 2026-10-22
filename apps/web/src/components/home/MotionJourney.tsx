import { useEffect, useRef, useState, type ReactNode } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import { ArrowDown, ArrowRight, Pause, Play, X } from "lucide-react";
import type { Language } from "../../data/i18n";
import MotionOpening from "./MotionOpening";
import ExperienceCarousel from "./ExperienceCarousel";
import RiverJourneyScene from "./RiverJourneyScene";
import { editorialPhotos } from "../../data/editorialPhotos";
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
  const performance = useRef<HTMLVideoElement>(null);
  const [filmOpen, setFilmOpen] = useState(false);
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
  const closeFilm = () => {
    performance.current?.pause();
    setFilmOpen(false);
  };
  return (
    <div className="motion-journey" ref={root} data-motion={effectiveMode}>
      <MotionOpening
        language={language}
        motion={effectiveMode}
        suspended={filmOpen}
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
            suspended={filmOpen}
            motion={effectiveMode}
          >
            <figure id="mj-gallery-0" className="mj-dining">
              <div className="mj-frame">
                <img
                  src={editorialPhotos.seafood.src}
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
              </div>
              <figcaption>
                <span>01 / {en ? "Dining" : "มื้ออาหาร"}</span>
                <p>
                  {en ? "A taste of the evening." : "เติมรสชาติให้ค่ำคืนพิเศษ"}
                </p>
                <a href="/#spaces-on-board">
                  {en ? "View onboard photos" : "ดูภาพบรรยากาศบนเรือ"}
                  <ArrowRight size={16} />
                </a>
              </figcaption>
            </figure>
            <figure id="mj-gallery-1" className="mj-hanuman">
              <button
                className="mj-frame mj-portrait"
                onClick={() => setFilmOpen(true)}
                aria-label={
                  en ? "Watch Hanuman performance" : "ชมคลิปการแสดงหนุมาน"
                }
              >
                <img
                  src="/images/experiences/hanuman-hq.webp"
                  style={{ objectPosition: "50% 34%" }}
                  alt={
                    en
                      ? "Hanuman performer entertaining guests"
                      : "การแสดงหนุมานท่ามกลางผู้ร่วมเดินทาง"
                  }
                  width="1280"
                  height="640"
                  loading="lazy"
                />
                <span className="mj-watch">
                  <Play size={18} />
                  {en ? "Watch performance" : "ชมการแสดง"}
                </span>
              </button>
              <figcaption>
                <span>02 / {en ? "Hanuman" : "หนุมาน"}</span>
                <p>
                  {en
                    ? "Culture, brought to life."
                    : "สีสันแห่งวัฒนธรรมที่มีชีวิต"}
                </p>
              </figcaption>
            </figure>
            <figure id="mj-gallery-2" className="mj-music">
              <div className="mj-frame">
                <img
                  src={editorialPhotos.evening.src}
                  alt={
                    en
                      ? "Evening tables and the stage on the upper deck"
                      : "โต๊ะและเวทีบนดาดฟ้าเรือยามค่ำ"
                  }
                  width={editorialPhotos.evening.width}
                  height={editorialPhotos.evening.height}
                  style={{ objectPosition: editorialPhotos.evening.position }}
                  loading="lazy"
                />
              </div>
              <figcaption>
                <span>03 / {en ? "Live music" : "คอนเสิร์ตบนเรือ"}</span>
                <p>
                  {en ? "The river has a rhythm." : "ให้เสียงเพลงพาคุณล่องไป"}
                </p>
                <Button onClick={onBook} endIcon={<ArrowRight size={16} />}>
                  {en ? "Explore the sailing" : "ดูรายละเอียดรอบล่องเรือ"}
                </Button>
              </figcaption>
            </figure>
            <figure className="mj-detail">
              <div className="mj-frame">
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
              </div>
              <figcaption>
                <span>04 / {en ? "Riverside dining" : "มื้อค่ำพร้อมวิว"}</span>
                <p>
                  {en
                    ? "One unforgettable night."
                    : "อีกหนึ่งค่ำคืนที่อยากจดจำ"}
                </p>
                <Button onClick={onBook} endIcon={<ArrowRight size={16} />}>
                  {en ? "Explore the sailing" : "ดูรายละเอียดรอบล่องเรือ"}
                </Button>
              </figcaption>
            </figure>
          </ExperienceCarousel>
        </section>
        <RiverJourneyScene language={language} motion={effectiveMode} />
      </section>
      <Dialog
        open={filmOpen}
        onClose={closeFilm}
        fullWidth
        maxWidth="lg"
        aria-labelledby="mj-film-title"
      >
        <div className="mj-film-heading">
          <h2 id="mj-film-title">
            {en ? "Onboard performances" : "การแสดงบนเรือ"}
          </h2>
          <IconButton
            onClick={closeFilm}
            aria-label={en ? "Close film" : "ปิดวิดีโอ"}
          >
            <X />
          </IconButton>
        </div>
        {filmOpen ? (
          <video
            ref={performance}
            className="mj-performance"
            src="/videos/riverlife-performances-hq.mp4"
            poster="/images/experiences/hanuman-hq.webp"
            controls
            playsInline
            preload="metadata"
          />
        ) : null}
      </Dialog>
    </div>
  );
}
