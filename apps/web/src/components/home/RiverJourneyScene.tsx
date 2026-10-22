import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Ship, X } from "lucide-react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import type { Language } from "../../data/i18n";
import { landmarkSide, riverLandmarks } from "../../data/riverLandmarks";
import "../../RiverJourneyScene.css";

export default function RiverJourneyScene({
  language,
  motion,
}: {
  language: Language;
  motion: "full" | "soft" | "off";
}) {
  const en = language === "en";
  const scene = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [reading, setReading] = useState<number | null>(null);
  const readingPlace = reading === null ? null : riverLandmarks[reading];
  const [shortViewport, setShortViewport] = useState(
    () => matchMedia("(max-height: 650px)").matches,
  );
  const place = riverLandmarks[active];
  const side = landmarkSide(place.bank, "upstream");
  const pinned = motion !== "off" && !shortViewport;

  useEffect(() => {
    const query = matchMedia("(max-height: 650px)");
    const update = () => setShortViewport(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!pinned || reading !== null) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!scene.current || !stage.current) return;
      const bounds = scene.current.getBoundingClientRect();
      if (bounds.top > innerHeight || bounds.bottom < 0) return;
      const distance = Math.max(1, bounds.height - stage.current.offsetHeight);
      const progress = Math.max(0, Math.min(1, -bounds.top / distance));
      setActive(
        Math.min(
          riverLandmarks.length - 1,
          Math.floor(progress * riverLandmarks.length),
        ),
      );
      stage.current.style.setProperty("--rj-progress", String(progress));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
    };
  }, [pinned, reading]);

  useEffect(() => {
    const nav = track.current;
    const button = nav?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!nav || !button) return;
    const offset =
      button.getBoundingClientRect().left - nav.getBoundingClientRect().left;
    nav.scrollTo({
      left:
        nav.scrollLeft + offset - (nav.clientWidth - button.offsetWidth) / 2,
      behavior: motion === "off" ? "instant" : "smooth",
    });
  }, [active, motion]);

  const choose = (index: number) => {
    const next = Math.max(0, Math.min(index, riverLandmarks.length - 1));
    if (pinned && scene.current && stage.current) {
      const distance = scene.current.offsetHeight - stage.current.offsetHeight;
      window.scrollTo({
        top:
          scrollY +
          scene.current.getBoundingClientRect().top +
          distance * ((next + 0.35) / riverLandmarks.length),
        behavior: "smooth",
      });
    } else {
      setActive(next);
    }
  };
  const skip = () =>
    document.getElementById("spaces-on-board")?.scrollIntoView({
      behavior: motion === "off" ? "instant" : "smooth",
      block: "start",
    });
  const sideText =
    side === "crossing"
      ? en
        ? "Across the river · ahead / overhead"
        : "สะพานข้ามแม่น้ำ · ด้านหน้า / เหนือศีรษะ"
      : en
        ? `When heading upstream · ${side === "left" ? "on your left" : "on your right"}`
        : `เมื่อทวนน้ำ · ${side === "left" ? "ซ้ายมือ" : "ขวามือ"}`;

  return (
    <>
      <div className="rj-mobile-intro mj-gutter">
        <h2>{en ? "The river. The city." : "สายน้ำและแสงเมือง"}</h2>
        <p>
          {en ? "Discover 11 riverside places" : "ชม 11 สถานที่ริมเจ้าพระยา"}
        </p>
      </div>
      <section
        id="river-journey"
        ref={scene}
        className={`mj-river rj-scene ${pinned ? "rj-pinned" : "rj-manual"}`}
        aria-labelledby="mj-river-title"
        style={
          pinned
            ? { height: `${100 + riverLandmarks.length * 65}svh` }
            : undefined
        }
      >
        <span id="river-landmark-guide" className="rj-anchor" />
        <div className="mj-river-stage rj-stage" ref={stage}>
          <div className="mj-river-images rj-images" aria-hidden="true">
            {riverLandmarks.map((item, index) => (
              <img
                key={item.id}
                src={item.image}
                alt=""
                loading="lazy"
                decoding="async"
                className={index === active ? "is-active" : ""}
                style={{ objectPosition: item.position }}
              />
            ))}
          </div>
          <div className="mj-river-edge rj-shade" />
          <div className="rj-content mj-gutter">
            <div className="rj-topline">
              <span className="rj-eyebrow">
                RIVERSIDE STORIES{" "}
                <span> / {String(active + 1).padStart(2, "0")} — 11</span>
              </span>
              <button className="rj-skip" type="button" onClick={skip}>
                {en ? "Continue down the page" : "ข้ามไปส่วนถัดไป"}
                <ArrowDown size={15} aria-hidden="true" />
              </button>
            </div>
            <div className="rj-heading">
              <h2 id="mj-river-title">
                {en ? "The river. The city." : "สายน้ำและแสงเมือง"}
              </h2>
              <p>
                {en
                  ? "Eleven places. Their stories, in full view."
                  : "11 สถานที่ เรื่องราวสองฝั่งเจ้าพระยา"}
              </p>
            </div>
            <div className="rj-story-area">
              <div className="mj-river-copy rj-copy" key={place.id}>
                <span className="rj-era">{en ? place.eraEn : place.eraTh}</span>
                <h3>{en ? place.en : place.th}</h3>
                <span className="rj-side" data-side={side}>
                  {side === "left" ? (
                    <ArrowLeft size={17} aria-hidden="true" />
                  ) : side === "right" ? (
                    <ArrowRight size={17} aria-hidden="true" />
                  ) : (
                    <Ship size={17} aria-hidden="true" />
                  )}
                  {sideText}
                </span>
                <p className="rj-history">
                  {en ? place.historyEn : place.historyTh}
                </p>
                <button
                  type="button"
                  className="rj-read-more"
                  aria-haspopup="dialog"
                  onClick={() => setReading(active)}
                >
                  {en ? "Place information" : "ข้อมูลสถานที่"}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
                <p className="rj-view">{en ? place.viewEn : place.viewTh}</p>
                <a
                  className="rj-source"
                  href={place.source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {en ? "History source" : "แหล่งข้อมูลประวัติ"}:{" "}
                  {place.sourceLabel}
                  <ArrowRight size={14} aria-hidden="true" />
                </a>
              </div>
            </div>
            <div className="mj-river-bottom rj-bottom">
              <div className="rj-navigation">
                <button
                  type="button"
                  className="rj-arrow"
                  disabled={active === 0}
                  onClick={() => choose(active - 1)}
                  aria-label={en ? "Previous landmark" : "สถานที่ก่อนหน้า"}
                >
                  <ArrowLeft size={20} />
                </button>
                <span
                  className="rj-mobile-count"
                  aria-live="polite"
                  aria-atomic="true"
                  aria-label={
                    en
                      ? `Landmark ${active + 1} of 11`
                      : `สถานที่ ${active + 1} จาก 11`
                  }
                >
                  {String(active + 1).padStart(2, "0")} / 11
                </span>
                <div
                  className="mj-tabs rj-track"
                  ref={track}
                  role="group"
                  aria-label={
                    en ? "All 11 river landmarks" : "สถานที่ริมแม่น้ำครบ 11 จุด"
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "ArrowLeft" ||
                      event.key === "ArrowRight"
                    ) {
                      event.preventDefault();
                      const next = Math.max(
                        0,
                        Math.min(
                          active + (event.key === "ArrowRight" ? 1 : -1),
                          riverLandmarks.length - 1,
                        ),
                      );
                      choose(next);
                      track.current
                        ?.querySelector<HTMLElement>(`[data-index="${next}"]`)
                        ?.focus({ preventScroll: true });
                    }
                  }}
                >
                  {riverLandmarks.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      data-index={index}
                      aria-label={en ? item.en : item.th}
                      aria-pressed={index === active}
                      onClick={() => choose(index)}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <span>{en ? item.en : item.th}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="rj-arrow"
                  disabled={active === riverLandmarks.length - 1}
                  onClick={() => choose(active + 1)}
                  aria-label={en ? "Next landmark" : "สถานที่ถัดไป"}
                >
                  <ArrowRight size={20} />
                </button>
              </div>
              <div className="rj-progress" aria-hidden="true">
                <span
                  style={{
                    width: `${((active + 1) / riverLandmarks.length) * 100}%`,
                  }}
                />
                <Ship
                  className="rj-progress-boat"
                  size={18}
                  style={{
                    left: `calc(${((active + 1) / riverLandmarks.length) * 100}% - 9px)`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <Dialog
        open={readingPlace !== null}
        onClose={() => setReading(null)}
        className="rj-detail-dialog"
        aria-labelledby="rj-detail-title"
        maxWidth="sm"
        fullWidth
      >
        {readingPlace ? (
          <>
            <div className="rj-detail-heading">
              <div>
                <span>{en ? readingPlace.eraEn : readingPlace.eraTh}</span>
                <h2 id="rj-detail-title">
                  {en ? readingPlace.en : readingPlace.th}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setReading(null)}
                aria-label={en ? "Close history" : "ปิดประวัติ"}
              >
                <X size={22} />
              </button>
            </div>
            <DialogContent className="rj-detail-content">
              <p className="rj-detail-side">{sideText}</p>
              <p className="rj-detail-history">
                {en ? readingPlace.historyEn : readingPlace.historyTh}
              </p>
              <h3>{en ? "Viewing from the cruise" : "การชมจากบนเรือ"}</h3>
              <p>{en ? readingPlace.viewEn : readingPlace.viewTh}</p>
              <a
                href={readingPlace.source}
                target="_blank"
                rel="noopener noreferrer"
              >
                {en ? "History source" : "แหล่งข้อมูลประวัติ"}:{" "}
                {readingPlace.sourceLabel}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </DialogContent>
          </>
        ) : null}
      </Dialog>
    </>
  );
}
