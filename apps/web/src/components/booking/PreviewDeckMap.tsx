import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, X, Pause, Play } from "lucide-react";
import type { Language } from "../../data/i18n";
import {
  previewStatus,
  type PreviewDeck,
  type PreviewTable,
} from "../../data/tablePreview";

export function PreviewTableButton({
  table,
  selected,
  onSelect,
  language,
  map = false,
}: {
  table: PreviewTable;
  selected: boolean;
  onSelect: (id: string) => void;
  language: Language;
  map?: boolean;
}) {
  const en = language === "en";
  const state = selected ? "selected" : table.status;
  return (
    <button
      type="button"
      className={`preview-table state-${state} ${map ? "on-map" : "in-list"} ${table.kind === "banquet" ? "is-banquet" : ""}`}
      style={map ? { left: `${table.x}%`, top: `${table.y}%` } : undefined}
      disabled={table.status !== "available"}
      aria-pressed={selected}
      title={`${en ? "Table" : "โต๊ะ"} ${table.id} · ${table.deck === "upper" ? en ? "Upper deck" : "ชั้นบน" : en ? "Lower deck" : "ชั้นล่าง"} · ${table.seats} ${en ? "guests" : "คน"} · ${previewStatus[state][language]}`}
      aria-label={`${en ? "Table" : "โต๊ะ"} ${table.id}, ${table.seats} ${en ? "guests" : "คน"}, ${table.kind === "banquet" ? (en ? "long-table section (demo), " : "ช่วงโต๊ะยาว (ตัวอย่าง), ") : ""}${previewStatus[state][language]}`}
      onClick={() => onSelect(table.id)}
    >
      {selected ? (
        <Check size={15} aria-hidden="true" />
      ) : table.status !== "available" ? (
        <X size={14} aria-hidden="true" />
      ) : null}
      <span className="preview-table-face">
        <strong>{table.id}</strong>
        <small>
          {table.seats} {en ? "guests" : "คน"}
        </small>
      </span>
    </button>
  );
}

export default function PreviewDeckMap({
  deck,
  tables,
  selected,
  onSelect,
  language,
  zoom,
}: {
  deck: PreviewDeck;
  tables: PreviewTable[];
  selected: string[];
  onSelect: (id: string) => void;
  language: Language;
  zoom: number;
}) {
  const en = language === "en";
  // One coordinate space and one image aspect ratio for both deck views.
  const mapHeight = 1240;
  const mapWidth = 600;
  const sceneRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const [paused, setPaused] = useState(false);
  const [overview, setOverview] = useState(true);
  const focusOffset = overview ? 0 : 280;
  const [active, setActive] = useState(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setFit(Math.max(0.3, Math.min(0.92, (el.clientWidth - 32) / mapWidth))),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const scale = zoom * (overview ? Math.min(fit, 640 / mapHeight) : fit);
  useEffect(() => {
    // Focus by scrolling the full map, never by cropping away the bow.
    scrollRef.current?.scrollTo({
      top: focusOffset * scale,
      left: 0,
      behavior: "instant",
    });
  }, [deck, focusOffset, scale]);
  useEffect(() => {
    let visible = true;
    const update = () => setActive(visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    if (sceneRef.current) observer.observe(sceneRef.current);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return (
    <div
      ref={sceneRef}
      className={`preview-voyage deck-${deck} ${paused || !active ? "is-paused" : ""}`}
    >
      <div className="preview-voyage-bar">
        <span>
          {deck === "upper"
            ? en
              ? "UPPER DECK · CENTRAL LONG TABLE"
              : "ชั้นบน · โต๊ะยาวกลางลำ"
            : en
              ? "LOWER DECK · CENTRAL BUFFET"
              : "ชั้นล่าง · บุฟเฟต์กลางห้อง"}
        </span>
        <div className="preview-scene-actions">
          <button
            type="button"
            aria-pressed={overview}
            onClick={() => setOverview((value) => !value)}
          >
            {overview
              ? en
                ? "Focus tables"
                : "ดูพื้นที่โต๊ะ"
              : en
                ? "View whole boat"
                : "ดูเรือทั้งลำ"}
          </button>
          <button
            type="button"
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
            {paused
              ? en
                ? "Resume water"
                : "เล่นคลื่นน้ำ"
              : en
                ? "Pause water"
                : "พักคลื่นน้ำ"}
          </button>
        </div>
      </div>
      <p className="preview-map-hint">
        {en
          ? "Scroll inside the map to explore the bow and stern · Use + to enlarge tables"
          : "เลื่อนในผังเพื่อดูหัวเรือ–ท้ายเรือ · กด + เพื่อขยายโต๊ะ"}
      </p>
      <div
        ref={scrollRef}
        className="preview-map-scroll"
        tabIndex={0}
        aria-label={
          en
            ? "Illustrative deck map. Scroll to explore or use list view."
            : "ผังตัวอย่าง เลื่อนดูได้ หรือสลับเป็นรายการ"
        }
      >
        <div className="preview-water" aria-hidden="true">
          <svg width="100%" height="100%">
            <filter id="river-surface">
              <feTurbulence
                type="fractalNoise"
                baseFrequency=".025 .14"
                numOctaves="3"
                seed="8"
                stitchTiles="stitch"
              />
              <feDiffuseLighting
                lightingColor="#699fac"
                surfaceScale="2"
                diffuseConstant=".65"
              >
                <feDistantLight azimuth="240" elevation="35" />
              </feDiffuseLighting>
            </filter>
            <rect width="100%" height="100%" filter="url(#river-surface)" />
          </svg>
        </div>
        <div
          className="preview-map-canvas"
          style={{
            width: mapWidth * scale,
            height: mapHeight * scale,
          }}
        >
          <div
            className="preview-map-scaled"
            style={
              {
                transform: `scale(${scale})`,
                height: mapHeight,
                "--preview-scale": scale,
              } as CSSProperties
            }
          >
            <svg
              className="preview-wake"
              viewBox="0 0 600 1240"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="wake-foam" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#d2f4f7" stopOpacity=".8" />
                  <stop offset="1" stopColor="#4d9caf" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2].map((i) => (
                <g key={i} className={`preview-wake-stream wake-${i}`}>
                  <path d="M300 28 C210 110 110 250 65 450 S28 950 8 1220" />
                  <path d="M300 28 C390 110 490 250 535 450 S572 950 592 1220" />
                </g>
              ))}
            </svg>
            <div className="preview-hull" aria-hidden="true" />
            <img
              className="preview-vessel-art"
              src="/images/booking/unicorn-open-deck-v4.png"
              alt=""
              aria-hidden="true"
              decoding="async"
            />
            {deck === "lower" && (
              <div className="preview-lower-room" aria-hidden="true" />
            )}
            <span className="preview-bow">
              {en ? "BOW / FRONT" : "หัวเรือ / ด้านหน้า"}
            </span>
            <div
              className={`preview-service ${deck === "upper" ? "preview-front-stage" : ""}`}
            >
              {deck === "upper"
                ? en
                  ? "PROPOSED BOW STAGE"
                  : "เวทีด้านหัวเรือ"
                : en
                  ? "Air-conditioned room"
                  : "ห้องปรับอากาศ"}
              <small>{en ? "Proposed layout" : "แบบเสนอ"}</small>
            </div>
            {deck === "upper" ? (
              <div className="preview-banquet-run" aria-hidden="true" />
            ) : (
              <div
                className="preview-buffet"
                aria-label={
                  en
                    ? "Central buffet, approximate position"
                    : "ไลน์บุฟเฟต์กลางห้อง ตำแหน่งคร่าว ๆ"
                }
              >
                <span>{en ? "BUFFET" : "ไลน์บุฟเฟต์"}</span>
                <small>{en ? "Centre of room" : "กลางห้อง"}</small>
              </div>
            )}
            <span className="preview-aisle aisle-port">
              {en ? "AISLE" : "ทางเดิน"}
            </span>
            <span className="preview-aisle aisle-starboard">
              {en ? "AISLE" : "ทางเดิน"}
            </span>
            {tables.map((table) => (
              <PreviewTableButton
                key={table.id}
                table={table}
                map
                selected={selected.includes(table.id)}
                onSelect={onSelect}
                language={language}
              />
            ))}
            <div
              className={`preview-stern ${deck === "upper" ? "preview-upper-stern" : ""}`}
            >
              {en ? "Stairs / service" : "บันได / พื้นที่บริการ"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
