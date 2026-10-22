import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@mui/material/Button";
import { ArrowDown, ArrowRight, Pause, Play } from "lucide-react";
import type { Language } from "../../data/i18n";

const poster = "/images/boat/riverlife-cinematic-hq-poster.webp";

export default function MotionOpening({
  language,
  motion,
  suspended,
  onExplore,
  onBook,
}: {
  language: Language;
  motion: "full" | "soft" | "off";
  suspended: boolean;
  onExplore: () => void;
  onBook: () => void;
}) {
  const en = language === "en";
  const player = useRef<HTMLVideoElement>(null);
  const section = useRef<HTMLElement>(null);
  const loader = useRef<HTMLDialogElement>(null);
  const visible = useRef(true);
  const manualPause = useRef(false);
  const [paused, setPaused] = useState(true);
  const [frameReady, setFrameReady] = useState(false);
  const [entered, setEntered] = useState(false);
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<"loading" | "revealing" | "ready">(
    "loading",
  );
  const phaseRef = useRef(phase);
  const firstVisit = useRef(true);
  const saveData = Boolean(
    (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData,
  );
  const dismiss = useCallback(() => {
    if (phaseRef.current !== "loading") return;
    phaseRef.current = "revealing";
    setPhase("revealing");
  }, []);
  useEffect(() => {
    // Replay on every homepage mount; repeat visits use a shorter media-ready wait.
    try {
      firstVisit.current = !sessionStorage.getItem("riverlife.arrival.seen");
    } catch {
      /* Private mode. */
    }
    if (motion === "off" || saveData) {
      phaseRef.current = "ready";
      setPhase("ready");
      return;
    }
    const dialog = loader.current;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let disposed = false;
    const began = performance.now();
    let minimum: ReturnType<typeof setTimeout> | undefined;
    const ready = () => {
      if (disposed) return;
      minimum = setTimeout(
        dismiss,
        Math.max(
          0,
          (firstVisit.current ? 1800 : 500) - (performance.now() - began),
        ),
      );
    };
    const video = player.current;
    const image = new Image();
    image.src = poster;
    const imageReady = image.decode().catch(() => undefined);
    const mediaReady = new Promise<void>((resolve) => {
      if (!video || video.readyState >= 2 || video.error) return resolve();
      const done = () => {
        video?.removeEventListener("loadeddata", done);
        video?.removeEventListener("error", done);
        resolve();
      };
      video.addEventListener("loadeddata", done, { once: true });
      video.addEventListener("error", done, { once: true });
      video.preload = "auto";
      video.load();
    });
    void Promise.all([imageReady, mediaReady]).then(ready);
    const timeout = setTimeout(dismiss, 4500);
    return () => {
      disposed = true;
      clearTimeout(timeout);
      clearTimeout(minimum);
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
    // Lifecycle deliberately independent of language and live motion preferences.
  }, [dismiss]);
  useEffect(() => {
    if (phase !== "revealing") return;
    const timeout = setTimeout(
      () => {
        loader.current?.close();
        document.body.style.overflow = "";
        phaseRef.current = "ready";
        setPhase("ready");
        try {
          sessionStorage.setItem("riverlife.arrival.seen", "1");
        } catch {
          /* Private mode. */
        }
      },
      motion === "off" ? 0 : 850,
    );
    return () => clearTimeout(timeout);
  }, [phase, motion]);
  useEffect(() => {
    if (motion === "off") dismiss();
  }, [motion, dismiss]);
  useEffect(() => {
    if (phase === "loading") return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setEntered(visible.current));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [phase]);
  useEffect(() => {
    const video = player.current;
    if (!video || !section.current) return;
    const sync = () => {
      if (
        motion !== "off" &&
        !saveData &&
        !suspended &&
        !document.querySelector('.MuiModal-root:not([aria-hidden="true"])') &&
        phase !== "loading" &&
        visible.current &&
        !manualPause.current &&
        !document.hidden &&
        !failed
      ) {
        void video.play().catch(() => setPaused(true));
      } else video.pause();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting;
        setEntered(entry.isIntersecting && phase !== "loading");
        sync();
      },
      { threshold: 0.15 },
    );
    observer.observe(section.current);
    document.addEventListener("visibilitychange", sync);
    // Pause while any MUI modal (including login) is open; don't override manual pause.
    const modalObserver = new MutationObserver(() => {
      const modal = document.querySelector(
        '.MuiModal-root:not([aria-hidden="true"])',
      );
      if (modal) video.pause();
      else sync();
    });
    modalObserver.observe(document.body, { childList: true });
    sync();
    return () => {
      observer.disconnect();
      modalObserver.disconnect();
      document.removeEventListener("visibilitychange", sync);
      video.pause();
    };
  }, [motion, phase, suspended, failed, saveData]);
  const toggle = async () => {
    const video = player.current;
    if (!video) return;
    if (video.paused) {
      manualPause.current = false;
      try {
        await video.play();
      } catch {
        setPaused(true);
      }
    } else {
      manualPause.current = true;
      video.pause();
    }
  };
  const presented = () => {
    const video = player.current;
    if (!video) return;
    if ("requestVideoFrameCallback" in video)
      video.requestVideoFrameCallback(() => setFrameReady(true));
    else setFrameReady(true);
    setPaused(false);
  };
  return (
    <>
      <dialog
        className={`mj-loader ${phase === "revealing" ? "is-leaving" : ""}`}
        ref={loader}
        aria-labelledby="mj-loading-title"
        onCancel={(event) => {
          event.preventDefault();
          dismiss();
        }}
      >
        <div>
          <p id="mj-loading-title">RIVER LIFE</p>
          <p>Symphony of the Chao Phraya</p>
          <div className="mj-loading-river" aria-hidden="true">
            <svg className="mj-loading-boat" viewBox="0 0 184 78">
              <path d="M12 49h155l-12 15H32c-9 0-15-6-20-15Z M25 49V30h119l13 19 M43 30V18h72l14 12 M53 18v-6h44v6 M34 36h16v8H34zm24 0h16v8H58zm24 0h16v8H82zm24 0h16v8h-16zm24 0h11l7 8h-18Z M23 54h135 M106 12V4l10 4-10 3 M5 64H-14m26 6H-24" />
            </svg>
            <span />
          </div>
          <p role="status">
            {en
              ? "Preparing your journey on the river"
              : "กำลังเตรียมการเดินทางบนสายน้ำ"}
          </p>
          <Button onClick={dismiss} endIcon={<ArrowRight size={16} />}>
            {en ? "Enter website" : "ข้ามเข้าสู่เว็บไซต์"}
          </Button>
        </div>
      </dialog>
      <section
        className={`mj-opening ${entered || motion === "off" ? "is-entered" : ""}`}
        data-home-section="hero"
        ref={section}
        aria-labelledby="mj-title"
      >
        <div className="mj-opening-stage">
          <div
            className={`mj-hero-media ${frameReady && !failed ? "has-frame" : ""}`}
          >
            <video
              ref={player}
              muted
              loop
              playsInline
              preload={motion === "off" || saveData ? "none" : "metadata"}
              poster={poster}
              onPlaying={presented}
              onPause={() => setPaused(true)}
              onError={() => {
                setFailed(true);
                setFrameReady(false);
                dismiss();
              }}
              aria-label={
                en
                  ? "Cruise, dining, Hanuman and live music on the Chao Phraya"
                  : "เรือ อาหาร หนุมาน และคอนเสิร์ตบนเจ้าพระยา"
              }
            >
              <source
                src="/videos/riverlife-cinematic-hq.mp4"
                type="video/mp4"
                onError={() => {
                  setFailed(true);
                  dismiss();
                }}
              />
            </video>
            <img
              className="mj-poster"
              src={poster}
              alt=""
              aria-hidden="true"
              fetchPriority="high"
            />
          </div>
          <div className="mj-hero-edge" />
          <div className="mj-hero-copy mj-gutter">
            <h1 id="mj-title" className="font-semibold" lang="en">
              <span>
                <span>Symphony of</span>
              </span>
              <span>
                <span>the Chao Phraya</span>
              </span>
            </h1>
            <p lang="en">A River of Culture. A Night of Music.</p>
            <div className="mj-hero-actions">
              <Button
                className="mj-outline"
                onClick={onExplore}
                endIcon={<ArrowDown size={19} />}
              >
                {en ? "Begin the journey" : "สำรวจประสบการณ์"}
              </Button>
              <Button
                className="mj-outline"
                onClick={onBook}
                endIcon={<ArrowRight size={19} />}
              >
                {en ? "Cruise & book" : "ดูรอบและจอง"}
              </Button>
            </div>
          </div>
          <div className="mj-hero-bottom mj-gutter">
            <span>01 / {en ? "ARRIVAL" : "เริ่มการเดินทาง"}</span>
            <button onClick={onExplore} className="mj-scroll-cue">
              {en ? "Scroll to discover" : "เลื่อนเพื่อสำรวจ"}
              <ArrowDown size={16} />
            </button>
            <button
              className="mj-play"
              onClick={() => void toggle()}
              disabled={failed}
            >
              {paused
                ? en
                  ? "Play film"
                  : "เล่นคลิป"
                : en
                  ? "Pause film"
                  : "พักคลิป"}
              {paused ? <Play size={17} /> : <Pause size={17} />}
            </button>
          </div>
          {failed ? (
            <p className="mj-film-status" role="status">
              {en
                ? "Film unavailable. You can still explore the cruise below."
                : "คลิปไม่พร้อมใช้งาน สามารถชมรายละเอียดและจองด้านล่างได้"}
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}
