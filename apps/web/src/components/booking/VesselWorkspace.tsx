import { Component, lazy, Suspense, useState, type ReactNode } from "react";
import {
  Box,
  Check,
  Layers3,
  List,
  Maximize,
  Minus,
  MousePointer2,
  Plus,
  RotateCcw,
  Sun,
  Wind,
} from "lucide-react";
import type { PreviewDeck, PreviewTable } from "../../data/tablePreview";
import type { Language } from "../../data/i18n";
import { PreviewTableButton } from "./PreviewDeckMap";

const VesselScene = lazy(() => import("./VesselScene"));

class ModelBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function DeckProfile({ deck }: { deck: PreviewDeck }) {
  return (
    <svg
      className="deck-profile"
      viewBox="0 0 104 45"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 32H97L90 40H16L5 32Z"
        fill="#354b5e"
        stroke="#95a7b5"
        strokeWidth="1.4"
      />
      <path
        d="M16 22H84L93 31H12L16 22Z"
        fill={deck === "lower" ? "#dbb978" : "#172d3d"}
        stroke="#95a7b5"
        strokeWidth="1.3"
      />
      <path
        d="M21 12H72L81 21H19L21 12Z"
        fill={deck === "upper" ? "#dbb978" : "#172d3d"}
        stroke="#95a7b5"
        strokeWidth="1.3"
      />
      <path
        d="M23 11V6M71 11V6M23 7H71M27 23V30M41 23V30M55 23V30M69 23V30M83 25V30"
        stroke="#aab8be"
        strokeWidth="1.3"
      />
      <path d="M11 42H94" stroke="#548ba0" strokeWidth="1.3" />
    </svg>
  );
}

export default function VesselWorkspace({
  deck,
  onDeck,
  tables,
  selected,
  onSelect,
  language,
}: {
  deck: PreviewDeck;
  onDeck: (deck: PreviewDeck) => void;
  tables: PreviewTable[];
  selected: string[];
  onSelect: (id: string) => void;
  language: Language;
}) {
  const en = language === "en";
  const [view, setView] = useState<"3d" | "top" | "list">(() =>
    window.matchMedia("(max-width: 600px)").matches ? "top" : "3d",
  );
  const [zoom, setZoom] = useState(1);
  const [resetKey, setResetKey] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  const deckName =
    deck === "upper"
      ? en
        ? "Upper deck"
        : "ชั้นบน"
      : en
        ? "Lower deck"
        : "ชั้นล่าง";
  const deckType =
    deck === "upper"
      ? en
        ? "Open-air deck"
        : "ดาดฟ้าเปิดโล่ง"
      : en
        ? "Air-conditioned dining"
        : "ห้องปรับอากาศ";
  const list = (
    <div className="preview-table-list">
      {tables.map((table) => (
        <PreviewTableButton
          key={table.id}
          table={table}
          selected={selected.includes(table.id)}
          onSelect={onSelect}
          language={language}
        />
      ))}
    </div>
  );
  return (
    <div className="vessel-workspace">
      <div
        className="vessel-deck-choices"
        role="group"
        aria-label={en ? "Choose deck" : "เลือกชั้นเรือ"}
      >
        {(["upper", "lower"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className="vessel-deck-choice"
            aria-pressed={deck === value}
            onClick={() => onDeck(value)}
          >
            <DeckProfile deck={value} />
            <span>
              <strong>
                {value === "upper"
                  ? en
                    ? "Upper deck"
                    : "ชั้นบน"
                  : en
                    ? "Lower deck"
                    : "ชั้นล่าง"}
              </strong>
              <small>
                {value === "upper"
                  ? en
                    ? "Open-air deck"
                    : "ดาดฟ้าเปิดโล่ง"
                  : en
                    ? "Air-conditioned dining"
                    : "ห้องปรับอากาศ"}
              </small>
            </span>
            {deck === value ? (
              <Check className="deck-choice-check" size={20} />
            ) : (
              <span className="deck-choice-circle" />
            )}
          </button>
        ))}
      </div>
      <div className="vessel-canvas-frame">
        <div className="vessel-view-toolbar">
          <div className="vessel-active-deck" aria-live="polite">
            <Layers3 size={19} />
            <strong>{deckName}</strong>
            <span>· {deckType}</span>
          </div>
          <div
            className="vessel-mode-buttons"
            role="group"
            aria-label={en ? "Display" : "รูปแบบการแสดง"}
          >
            {(["3d", "top", "list"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                disabled={unavailable && mode !== "list"}
                onClick={() => setView(mode)}
              >
                {mode === "3d" ? (
                  <Box size={15} />
                ) : mode === "top" ? (
                  <Layers3 size={15} />
                ) : (
                  <List size={15} />
                )}
                {mode === "3d"
                  ? "3D"
                  : mode === "top"
                    ? en
                      ? "Top view"
                      : "มุมบน"
                    : en
                      ? "List"
                      : "รายการ"}
              </button>
            ))}
          </div>
        </div>
        <p className="vessel-cutaway-note">
          {deck === "upper" ? <Sun size={14} /> : <Wind size={14} />}
          {deck === "upper"
            ? en
              ? "Open deck · proposed stage at the bow"
              : "ดาดฟ้าเปิดโล่ง · เวทีเสนออยู่ด้านหัวเรือ"
            : en
              ? "Upper deck removed to reveal the dining room and central buffet"
              : "เปิดดาดฟ้าบนออก เพื่อให้เห็นห้องอาหารและบุฟเฟต์กลางห้อง"}
        </p>
        {unavailable && (
          <p className="vessel-fallback" role="status">
            {en
              ? "3D is unavailable on this device. You can select every table from the list below."
              : "อุปกรณ์นี้เปิด 3D ไม่ได้ เลือกโต๊ะทั้งหมดจากรายการด้านล่างได้ครับ"}
          </p>
        )}
        {view === "list" ? (
          list
        ) : (
          <ModelBoundary
            fallback={
              <>
                <p className="vessel-fallback" role="status">
                  {en
                    ? "The model could not load. Choose from the table list."
                    : "โหลดโมเดลไม่ได้ กรุณาเลือกจากรายการโต๊ะ"}
                </p>
                {list}
              </>
            }
          >
            <Suspense
              fallback={
                <div className="vessel-loading" role="status">
                  <Box size={30} />
                  <span>
                    {en
                      ? "Preparing the 3D vessel…"
                      : "กำลังเตรียมโมเดลเรือ 3D…"}
                  </span>
                </div>
              }
            >
              <VesselScene
                deck={deck}
                tables={tables}
                selected={selected}
                onSelect={onSelect}
                language={language}
                topView={view === "top"}
                zoom={zoom}
                resetKey={resetKey}
                onUnavailable={() => {
                  setUnavailable(true);
                  setView("list");
                }}
              />
            </Suspense>
          </ModelBoundary>
        )}
        {view !== "list" && (
          <div
            className="vessel-camera-controls"
            role="group"
            aria-label={en ? "Camera controls" : "ควบคุมมุมมอง"}
          >
            <button
              type="button"
              aria-label={en ? "Zoom out" : "ย่อผัง"}
              disabled={zoom <= 0.8}
              onClick={() =>
                setZoom((v) => Math.max(0.8, +(v - 0.2).toFixed(1)))
              }
            >
              <Minus size={18} />
            </button>
            <button
              type="button"
              aria-label={en ? "Zoom in" : "ขยายผัง"}
              disabled={zoom >= 1.8}
              onClick={() =>
                setZoom((v) => Math.min(1.8, +(v + 0.2).toFixed(1)))
              }
            >
              <Plus size={18} />
            </button>
            <button
              type="button"
              aria-label={en ? "Reset camera" : "คืนมุมมองเริ่มต้น"}
              onClick={() => {
                setZoom(1);
                setResetKey((v) => v + 1);
              }}
            >
              <RotateCcw size={17} />
            </button>
            <button
              type="button"
              aria-label={en ? "Fit whole vessel" : "ดูเรือทั้งลำ"}
              onClick={() => {
                setZoom(1);
                setResetKey((v) => v + 1);
              }}
            >
              <Maximize size={17} />
            </button>
          </div>
        )}
        <div className="vessel-interaction-hint">
          <MousePointer2 size={14} />
          <span>
            {view === "list"
              ? en
                ? "Select an available table to add it to your order"
                : "กดโต๊ะว่าง เพื่อเพิ่มลงในรายการของคุณ"
              : en
                ? "Drag to rotate · Tap a table to select · Use Top view for a clearer plan"
                : "ลากเพื่อหมุน · กดโต๊ะเพื่อเลือก · มุมบนช่วยให้เห็นผังชัดขึ้น"}
          </span>
        </div>
      </div>
    </div>
  );
}
