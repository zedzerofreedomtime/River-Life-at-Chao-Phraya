import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { Language } from "../../data/i18n";
import "../../ExperienceCarousel.css";

export default function ExperienceCarousel({
  children,
  language,
  suspended,
  motion,
}: {
  children: ReactNode;
  language: Language;
  suspended: boolean;
  motion: string;
}) {
  const en = language === "en";
  const slides = Children.toArray(children);
  const labels = en
    ? ["Dining", "Hanuman", "Live music", "Riverside dining"]
    : ["มื้ออาหาร", "หนุมาน", "คอนเสิร์ต", "มื้อค่ำพร้อมวิว"];
  const root = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [tabVisible, setTabVisible] = useState(!document.hidden);
  const playing =
    !paused &&
    !hovered &&
    visible &&
    tabVisible &&
    !suspended &&
    motion !== "off";
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.25 },
    );
    if (root.current) observer.observe(root.current);
    const update = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(
      () => setCurrent((value) => (value + 1) % slides.length),
      3000,
    );
    return () => clearTimeout(timer);
  }, [playing, current, slides.length]);
  const choose = (index: number) => {
    setPaused(true);
    setCurrent((index + slides.length) % slides.length);
  };
  return (
    <div
      className="mj-experience-carousel"
      ref={root}
      data-mj-reveal
      role="region"
      aria-roledescription={en ? "carousel" : "สไลด์"}
      aria-label={en ? "Onboard experiences" : "ประสบการณ์บนเรือ"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setPaused(true)}
      onPointerDown={(event) => {
        if (event.pointerType === "touch") touchStart.current = event.clientX;
      }}
      onPointerCancel={() => {
        touchStart.current = null;
      }}
      onPointerUp={(event) => {
        if (
          touchStart.current !== null &&
          Math.abs(event.clientX - touchStart.current) > 50
        )
          choose(current + (event.clientX < touchStart.current ? 1 : -1));
        touchStart.current = null;
      }}
    >
      <div
        className="mj-carousel-categories"
        role="group"
        aria-label={en ? "Choose experience" : "เลือกประสบการณ์"}
      >
        {labels.map((label, index) => (
          <button
            key={label}
            type="button"
            aria-pressed={current === index}
            onClick={() => choose(index)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="mj-gallery mj-card-slider"
        aria-live={paused || motion === "off" ? "polite" : "off"}
      >
        {slides.map((slide, index) => (
          <div
            key={index}
            className="mj-carousel-slide"
            hidden={current !== index}
            inert={current !== index}
            role="group"
            aria-roledescription={en ? "slide" : "รายการ"}
            aria-label={`${index + 1} / ${slides.length}: ${labels[index]}`}
          >
            {slide}
          </div>
        ))}
      </div>
      <div className="mj-carousel-controls">
        <span>
          {String(current + 1).padStart(2, "0")} /{" "}
          {String(slides.length).padStart(2, "0")}
        </span>
        <div>
          <button
            type="button"
            onClick={() => choose(current - 1)}
            aria-label={en ? "Previous experience" : "ประสบการณ์ก่อนหน้า"}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            disabled={motion === "off"}
            onClick={() => setPaused((value) => !value)}
            aria-label={
              en
                ? paused
                  ? "Play slideshow"
                  : "Pause slideshow"
                : paused
                  ? "เล่นสไลด์"
                  : "หยุดสไลด์"
            }
          >
            {paused || motion === "off" ? (
              <Play size={18} />
            ) : (
              <Pause size={18} />
            )}
          </button>
          <button
            type="button"
            onClick={() => choose(current + 1)}
            aria-label={en ? "Next experience" : "ประสบการณ์ถัดไป"}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
