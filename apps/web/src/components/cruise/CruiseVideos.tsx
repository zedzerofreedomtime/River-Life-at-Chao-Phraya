import { useRef, useState } from "react";
import { Play } from "lucide-react";
import type { Language } from "../../data/i18n";
import "../../CruiseGallery.css";

const clips = [
  {
    id: "cruise-highlights",
    src: "/videos/unicorn-cruise-highlights-25s.mp4",
    poster: "/videos/unicorn-dinner-film-poster.jpg",
    width: 1280,
    height: 720,
    th: "ไฮไลต์ประสบการณ์บนเรือ · 25 วินาที",
    en: "Your cruise in 25 seconds",
    guideTh: "เรือ วิวเจ้าพระยา อาหาร มื้อค่ำ และการแสดงพื้นฐานบนเรือ",
    guideEn:
      "Discover the cruise, river views, food, dinner and regular on-board performances.",
  },
  {
    id: "dinner-film",
    src: "/videos/unicorn-dinner-film-web.mp4",
    poster: "/videos/unicorn-dinner-film-poster.jpg",
    width: 1920,
    height: 1080,
    th: "สัมผัสค่ำคืนบน UNICORN CRUISE",
    en: "A night aboard UNICORN CRUISE",
    guideTh: "ชมเรือ วิวเจ้าพระยา ไลน์อาหาร และบรรยากาศการแสดงจากคลิปของเรือ",
    guideEn:
      "Explore the vessel, river views, dining and entertainment in our cruise film.",
  },
  {
    id: "cruise-pier",
    src: "/videos/unicorn-pier4-promo.mp4",
    poster: "/videos/unicorn-pier4-poster.jpg",
    width: 720,
    height: 1280,
    th: "รู้จักเรือและท่าเรือที่ 4",
    en: "The cruise & Pier 4",
    guideTh: "ชมเรือ จุดเช็กอิน และทางไปท่าเรือ ICONSIAM ท่าที่ 4",
    guideEn: "See the vessel, check-in area and the route to ICONSIAM Pier 4.",
  },
  {
    id: "dining",
    src: "/videos/unicorn-dining-promo.mp4",
    poster: "/videos/unicorn-dining-poster.jpg",
    width: 720,
    height: 1280,
    th: "บรรยากาศไลน์อาหาร",
    en: "Dining on board",
    guideTh: "ชมไลน์อาหารจริงที่เป็นส่วนหนึ่งของประสบการณ์บนเรือ",
    guideEn: "Explore the real buffet that is part of the on-board experience.",
  },
];

export default function CruiseVideos({ language }: { language: Language }) {
  const en = language === "en";
  const players = useRef<(HTMLVideoElement | null)[]>([]);
  const [started, setStarted] = useState(() => clips.map(() => false));
  const [error, setError] = useState<string | null>(null);
  const [featured, setFeatured] = useState(0);
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
  const renderClip = (clip: (typeof clips)[number], index: number) => (
    <CruiseVideoCard
      key={clip.id}
      clip={clip}
      en={en}
      started={started[index]}
      playerRef={(player) => {
        players.current[index] = player;
      }}
      onStart={() => play(index)}
      onPlay={() => {
        setStarted((current) =>
          current.map((value, item) => (item === index ? true : value)),
        );
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
    />
  );
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
              ? "Explore the boat, dining and performances in real cruise footage. Every River Life sailing includes an on-board concert; artist lineups are announced by sailing."
              : "ชมเรือ อาหาร และการแสดงจากคลิปจริง ทุกรอบ River Life มีคอนเสิร์ตบนเรือ โดยรายชื่อศิลปินจะประกาศตามรอบ"}
          </p>
          <span className="culture-video-origin">
            {en
              ? "Cruise footage · Press play to explore"
              : "คอนเทนต์จากเรือ · กดเล่นเพื่อรับชม"}
          </span>
        </div>
        <div className="culture-video-gallery">
          <div className="culture-video-feature">
            <div
              className="cruise-video-categories"
              role="group"
              aria-label={en ? "Choose video category" : "เลือกหมวดคลิป"}
            >
              {[
                { index: 0, th: "เรือและวิว", en: "Cruise & views" },
                { index: 3, th: "อาหารบนเรือ", en: "Dining" },
                {
                  index: 1,
                  th: "การแสดงและค่ำคืนบนเรือ",
                  en: "Performances & evening",
                },
              ].map((category) => (
                <button
                  key={category.index}
                  type="button"
                  aria-pressed={featured === category.index}
                  onClick={() => {
                    players.current.forEach((player) => player?.pause());
                    setError(null);
                    setFeatured(category.index);
                  }}
                >
                  {en ? category.en : category.th}
                </button>
              ))}
            </div>
            {renderClip(clips[featured], featured)}
          </div>
          <details
            className="culture-video-extras"
            onToggle={(event) => {
              if (!event.currentTarget.open)
                players.current.forEach((player, index) => {
                  if (index !== featured) player?.pause();
                });
            }}
          >
            <summary>
              {en
                ? "More footage & the Pier 4 guide"
                : "คลิปเพิ่มเติมและทางไปท่าเรือที่ 4"}
            </summary>
            <div className="culture-video-shorts">
              {clips.map((clip, index) =>
                index !== featured ? renderClip(clip, index) : null,
              )}
            </div>
          </details>
        </div>
        <p className="cruise-media-note">
          {en
            ? "See more recent cruise content on "
            : "ชมคอนเทนต์ล่าสุดเพิ่มเติมได้ที่ "}
          <a
            href="https://www.facebook.com/cruiseunicorn/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Unicorn Cruise Facebook ↗
          </a>
          {en
            ? ". Photos and videos show the atmosphere; food, performances and inclusions may vary by sailing."
            : " · ภาพและคลิปแสดงบรรยากาศ อาหาร การแสดง และสิ่งที่รวมในแพ็กเกจอาจแตกต่างตามรอบ"}
        </p>
        {error ? (
          <p className="culture-video-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function CruiseVideoCard({
  clip,
  en,
  started,
  playerRef,
  onStart,
  onPlay,
  onError,
}: {
  clip: (typeof clips)[number];
  en: boolean;
  started: boolean;
  playerRef: (player: HTMLVideoElement | null) => void;
  onStart: () => void;
  onPlay: () => void;
  onError: () => void;
}) {
  return (
    <figure id={"video-" + clip.id}>
      <div className="culture-video-frame">
        <video
          ref={playerRef}
          controls={started}
          playsInline
          preload="none"
          poster={clip.poster}
          width={clip.width}
          height={clip.height}
          style={{ aspectRatio: `${clip.width} / ${clip.height}` }}
          aria-label={en ? clip.en : clip.th}
          onPlay={onPlay}
          onError={onError}
        >
          <source src={clip.src} type="video/mp4" />
          {clip.id === "cruise-pier" || clip.id === "cruise-highlights" ? (
            <track
              kind="subtitles"
              src={
                clip.id === "cruise-highlights"
                  ? "/videos/unicorn-highlights-en.vtt"
                  : "/videos/unicorn-pier4-en.vtt"
              }
              srcLang="en"
              label="English (on-screen text)"
              default={en}
            />
          ) : null}
          {en
            ? "Your browser does not support video playback."
            : "เบราว์เซอร์นี้ไม่รองรับวิดีโอ"}
        </video>
        {!started ? (
          <button
            type="button"
            className="culture-video-play"
            aria-label={en ? "Play " + clip.en : "เล่นคลิป" + clip.th}
            onClick={onStart}
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
  );
}
