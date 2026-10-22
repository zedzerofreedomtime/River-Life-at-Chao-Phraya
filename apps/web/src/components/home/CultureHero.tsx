import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, Pause, Play } from "lucide-react";
import type { Language } from "../../data/i18n";

export default function CultureHero({ language }: { language: Language }) {
  const en = language === "en";
  const video = useRef<HTMLVideoElement>(null);
  const section = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(true);
  const [error, setError] = useState(false);
  const manuallyPaused = useRef(false);
  const [autoAllowed, setAutoAllowed] = useState(() =>
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
  );
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const allowed = !preference.matches && !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
      setAutoAllowed(allowed);
      if (!allowed) video.current?.pause();
    };
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const player = video.current;
    const target = section.current;
    if (!player || !target) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) player.pause();
      else if (autoAllowed && !manuallyPaused.current && !document.hidden) void player.play().catch(() => setPaused(true));
    }, { threshold: 0.15 });
    const visibility = () => { if (document.hidden) player.pause(); };
    observer.observe(target);
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, [autoAllowed]);
  const toggle = async () => {
    const player = video.current;
    if (!player) return;
    if (!player.paused) { manuallyPaused.current = true; player.pause(); }
    else { manuallyPaused.current = false; try { await player.play(); } catch { setError(true); } }
  };
  return (
    <section ref={section} className="cinema-hero" aria-labelledby="culture-home-title">
      <video ref={video} className="cinema-hero-film" muted loop playsInline
        preload={autoAllowed ? "metadata" : "none"}
        poster="/images/boat/unicorn-night-exterior-enhanced-v1.webp"
        onPlay={() => setPaused(false)} onPause={() => setPaused(true)} onError={() => setError(true)}
        aria-label={en ? "Cruise, dining, Hanuman performance and Chao Phraya views" : "เรือ อาหาร การแสดงหนุมาน และวิวเจ้าพระยา"}>
        <source src="/videos/riverlife-cinematic-30s.mp4" type="video/mp4" />
      </video>
      <div className="cinema-hero-shade" />
      <div className="cinema-hero-copy">
        <h1 id="culture-home-title" lang="en">Symphony of<br className="cinema-mobile-break" /> the Chao Phraya</h1>
        <p className="cinema-tagline" lang="en">A River of Culture. A Night of Music.</p>
        <div className="cinema-actions">
          <a className="cinema-button" href="#life-on-board">{en ? "Explore the experience" : "สำรวจประสบการณ์"}<ArrowDown size={18} /></a>
          <a className="cinema-button cinema-button-outline" href="#cruise-calendar">{en ? "Cruises & Booking" : "ดูรอบและจอง"}<ArrowRight size={18} /></a>
        </div>
      </div>
      <div className="cinema-hero-controls">
        <a href="#life-on-board">{en ? "Watch the full film" : "ชมคลิปพร้อมเสียง"}<Play size={15} /></a>
        <button type="button" onClick={() => void toggle()} disabled={error} aria-label={paused ? (en ? "Play opening film" : "เล่นวิดีโอเปิดหน้าเว็บ") : (en ? "Pause opening film" : "หยุดวิดีโอเปิดหน้าเว็บ")}>
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </button>
      </div>
      {error ? <p className="cinema-film-error" role="status">{en ? "Video unavailable. Explore the cruise below." : "วิดีโอไม่พร้อมใช้งาน ชมรายละเอียดเรือด้านล่างได้เลย"}</p> : null}
    </section>
  );
}
