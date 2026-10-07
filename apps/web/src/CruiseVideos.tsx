import { useRef, useState } from "react";
import { Play } from "lucide-react";
import type { Language } from "./i18n";

const clips = [
  {
    id: "cruise-pier",
    src: "/videos/unicorn-pier4-promo.mp4",
    poster: "/videos/unicorn-pier4-poster.jpg",
    th: "รู้จักเรือและท่าเรือที่ 4",
    en: "The cruise & Pier 4",
    guideTh: "ชมเรือ จุดเช็กอิน และทางไปท่าเรือ ICONSIAM ท่าที่ 4",
    guideEn: "See the vessel, check-in area and the route to ICONSIAM Pier 4.",
  },
  {
    id: "dining",
    src: "/videos/unicorn-dining-promo.mp4",
    poster: "/videos/unicorn-dining-poster.jpg",
    th: "บรรยากาศไลน์อาหาร",
    en: "Dining on board",
    guideTh: "ชมคอนเทนต์อาหารของเรือ รายการที่รวมในราคาขึ้นอยู่กับรอบล่องเรือ",
    guideEn:
      "Explore our cruise food content. Meal inclusions depend on the sailing package.",
  },
];

export default function CruiseVideos({ language }: { language: Language }) {
  const en = language === "en";
  const players = useRef<(HTMLVideoElement | null)[]>([]);
  const [started, setStarted] = useState<boolean[]>([false, false]);
  const [error, setError] = useState<string | null>(null);
  const markStarted = (index: number) =>
    setStarted((current) =>
      current.map((value, item) => (item === index ? true : value)),
    );
  const play = (index: number) => {
    setError(null);
    void players.current[index]
      ?.play()
      .catch(() =>
        setError(
          en
            ? "Unable to play the clip. Please use the video controls to try again."
            : "เปิดคลิปไม่ได้ กรุณาลองใหม่ด้วยปุ่มควบคุมวิดีโอ",
        ),
      );
  };
  return (
    <section
      id="life-on-board"
      className="culture-videos"
      aria-labelledby="culture-videos-title"
    >
      <div className="culture-container culture-videos-layout">
        <div className="culture-videos-copy">
          <h2 id="culture-videos-title">
            {en ? (
              <>
                Life on the river,
                <br />
                <em>for real.</em>
              </>
            ) : (
              <>
                ชมบรรยากาศจริง
                <br />
                <em>ก่อนเลือกค่ำคืนของคุณ</em>
              </>
            )}
          </h2>
          <p>
            {en
              ? "Watch our cruise and the dining experience before choosing your sailing."
              : "ชมคลิปเรือ ท่าเรือ และอาหารจากคอนเทนต์จริง ก่อนตัดสินใจเลือกรอบล่องเรือ"}
          </p>
          <span className="culture-video-origin">
            {en
              ? "Original cruise footage · Thai narration"
              : "คอนเทนต์จริงของเรือ · เสียงพากย์ภาษาไทย"}
          </span>
        </div>
        <div className="culture-video-gallery">
          {clips.map((clip, index) => (
            <figure key={clip.id} id={"video-" + clip.id}>
              <div className="culture-video-frame">
                <video
                  ref={(player) => {
                    players.current[index] = player;
                  }}
                  controls={started[index]}
                  playsInline
                  preload="none"
                  poster={clip.poster}
                  width={720}
                  height={1280}
                  aria-label={en ? clip.en : clip.th}
                  onPlay={() => {
                    markStarted(index);
                    players.current.forEach((player, other) => {
                      if (other !== index) player?.pause();
                    });
                  }}
                  onError={() =>
                    setError(
                      en
                        ? "This clip is unavailable. Please try again later."
                        : "คลิปนี้ไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง",
                    )
                  }
                >
                  <source src={clip.src} type="video/mp4" />
                  {index === 0 ? (
                    <track
                      kind="subtitles"
                      src="/videos/unicorn-pier4-en.vtt"
                      srcLang="en"
                      label="English (on-screen text)"
                      default={en}
                    />
                  ) : null}
                  {en
                    ? "Your browser does not support video playback."
                    : "เบราว์เซอร์นี้ไม่รองรับวิดีโอ"}
                </video>
                {!started[index] ? (
                  <button
                    type="button"
                    className="culture-video-play"
                    aria-label={en ? "Play " + clip.en : "เล่นคลิป" + clip.th}
                    onClick={() => play(index)}
                  >
                    <Play size={26} fill="currentColor" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              <figcaption>
                <strong>{en ? clip.en : clip.th}</strong>
                <p>{en ? clip.guideEn : clip.guideTh}</p>
              </figcaption>
            </figure>
          ))}
        </div>
        {error ? (
          <p className="culture-video-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
