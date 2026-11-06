import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Dialog from "@mui/material/Dialog";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  ChevronRight,
  Expand,
  Info,
  List,
  Map,
  Minus,
  Plus,
  Users,
  X,
} from "lucide-react";
import type { Language } from "../../data/i18n";
import {
  previewTables,
  type PreviewDeck,
  type PreviewTable,
} from "../../data/bookingPreviewPlan";
import "../../DetailedDeckPlan.css";

const UnicornBooking3D = lazy(() => import("./UnicornBooking3D"));

// A failed optional 3D chunk must not remove the guest's booking form or selection.
class VesselViewBoundary extends Component<
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

export default function DetailedDeckPlan({
  deck,
  language,
  selected,
  onToggle,
  inventory,
  seatMode = false,
}: {
  deck: PreviewDeck;
  language: Language;
  selected: string[];
  onToggle: (id: string) => void;
  inventory?: PreviewTable[];
  seatMode?: boolean;
}) {
  const en = language === "en";
  const t = (th: string, english: string) => (en ? english : th);
  const [view, setView] = useState<"map" | "list" | "3d">("map");
  const [zoom, setZoom] = useState(1);
  const [detail, setDetail] = useState<PreviewTable | null>(null);
  const [width, setWidth] = useState(760);
  const viewport = useRef<HTMLDivElement>(null);
  const dragging = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      // Ignore subpixel changes and height-only notifications. The viewport reserves
      // its scrollbar gutter so canvas sizing cannot toggle that gutter in a loop.
      const nextWidth = Math.floor(entry.contentRect.width);
      setWidth((previous) => (previous === nextWidth ? previous : nextWidth));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [view]);
  useEffect(() => {
    setDetail(null);
  }, [deck]);
  const isSelected = (id: string) =>
    selected.includes(id) || selected.some((seat) => seat.startsWith(id + ":"));
  const tables = (inventory ?? previewTables).filter(
    (table) => table.deck === deck,
  );
  const displayWidth = Math.max(width, 720) * zoom;
  const fit = () => {
    setZoom(width / Math.max(width, 720));
    viewport.current?.scrollTo({ left: 0, top: 0 });
  };
  const price = (value: number) =>
    new Intl.NumberFormat(en ? "en-GB" : "th-TH", {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 0,
    }).format(value);
  const position = (table: PreviewTable) =>
    `${table.side === "port" ? t("ริมกราบซ้าย", "Port side") : t("ริมกราบขวา", "Starboard side")} · ${table.nearStage ? t("ใกล้เวที", "Near the stage") : table.x >= 700 ? t("ใกล้ทางเข้า", "Near the entrance") : t("ช่วงกลางลำ", "Midship")}`;
  return (
    <div className={`deck-plan dp-deck-${deck}`}>
      <div className="dp-deck-banner">
        <div>
          <span className="dp-deck-eyebrow">UNICORN CRUISE</span>
          <h3>
            {deck === "upper"
              ? t("ชั้นบน · ดาดฟ้ากลางแจ้ง", "Upper deck · Open air")
              : t("ชั้นล่าง · ห้องปรับอากาศ", "Lower deck · Air-conditioned")}
          </h3>
          <p>
            {seatMode
              ? t(
                  "กดหมายเลขเก้าอี้เพื่อเลือกที่นั่ง · แตะโต๊ะเพื่อดูรายละเอียด",
                  "Select a numbered chair · Tap a table for details",
                )
              : t("แตะโต๊ะเพื่อดูรายละเอียด", "Tap a table for details")}
          </p>
        </div>
        <div className="dp-availability">
          <strong>
            {seatMode
              ? tables.reduce(
                  (sum, table) =>
                    sum +
                    (table.unavailable || !table.seatPrice
                      ? 0
                      : (table.availableSeats?.length ?? table.seats)),
                  0,
                )
              : tables.filter((table) => !table.unavailable).length}
            <small>
              {" "}
              /{" "}
              {seatMode
                ? tables.reduce((sum, table) => sum + table.seats, 0)
                : tables.length}
            </small>
          </strong>
          <span>
            {seatMode
              ? t("ที่นั่งว่างในชั้นนี้", "seats available on this deck")
              : t("โต๊ะว่างในชั้นนี้", "tables available on this deck")}
          </span>
        </div>
      </div>
      <div className="dp-toolbar">
        <div className="dp-view" aria-label={t("รูปแบบผังโต๊ะ", "Table view")}>
          <button aria-pressed={view === "map"} onClick={() => setView("map")}>
            <Map size={16} />
            {t("ผังละเอียด", "Deck plan")}
          </button>
          <button
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <List size={16} />
            {t("รายการโต๊ะ", "Table list")}
          </button>
          <button aria-pressed={view === "3d"} onClick={() => setView("3d")}>
            <Box size={16} />
            {t("เรือ 3D", "Vessel 3D")}
          </button>
        </div>
        {view === "map" && (
          <div className="dp-zoom">
            <button
              aria-label={t("ย่อผัง", "Zoom out")}
              disabled={zoom <= 0.45}
              onClick={() => setZoom((v) => Math.max(0.4, v - 0.2))}
            >
              <Minus size={17} />
            </button>
            <output aria-label={t("ระดับการซูม", "Zoom level")}>
              {Math.round(zoom * 100)}%
            </output>
            <button
              aria-label={t("ขยายผัง", "Zoom in")}
              disabled={zoom >= 2}
              onClick={() => setZoom((v) => Math.min(2, v + 0.2))}
            >
              <Plus size={17} />
            </button>
            <button
              className="dp-fit"
              aria-label={t("ดูเรือทั้งลำ", "Fit entire vessel")}
              onClick={fit}
            >
              <Expand size={16} />
            </button>
          </div>
        )}
      </div>
      {view === "map" ? (
        <>
          <div className="dp-orientation">
            <span>
              <ArrowLeft size={14} />
              {t("หัวเรือ · เวที", "Bow · stage")}
            </span>
            <span>
              {t("ท้ายเรือ · ทางเข้า", "Stern · entrance")}
              <ArrowRight size={14} />
            </span>
          </div>
          <div
            className="dp-viewport"
            ref={viewport}
            tabIndex={0}
            role="region"
            aria-label={t(
              "ผังเรือ เลื่อนเพื่อดูโต๊ะทั้งหมด",
              "Deck plan, scroll to explore all tables",
            )}
            onPointerDown={(e) => {
              if (
                e.pointerType !== "mouse" ||
                (e.target as HTMLElement).closest("button")
              )
                return;
              const el = e.currentTarget;
              dragging.current = {
                x: e.clientX,
                y: e.clientY,
                left: el.scrollLeft,
                top: el.scrollTop,
              };
              el.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const start = dragging.current;
              if (!start) return;
              e.currentTarget.scrollLeft = start.left - (e.clientX - start.x);
              e.currentTarget.scrollTop = start.top - (e.clientY - start.y);
            }}
            onPointerUp={() => {
              dragging.current = null;
            }}
            onPointerCancel={() => {
              dragging.current = null;
            }}
          >
            <div
              className="dp-canvas"
              style={{ width: displayWidth, height: displayWidth * 0.58 }}
            >
              <svg
                viewBox="0 0 1000 580"
                className="dp-drawing"
                aria-hidden="true"
              >
                <defs>
                  <pattern
                    id={`dp-floor-${deck}`}
                    width="28"
                    height="28"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M28 0H0V28"
                      fill="none"
                      stroke="#e1e7ec"
                      strokeWidth=".6"
                    />
                  </pattern>
                </defs>
                <path
                  d="M28 290 Q65 45 235 40 H875 Q947 40 947 110 V470 Q947 540 875 540 H235 Q65 535 28 290Z"
                  fill="#f9fbfc"
                  stroke="#657d8c"
                  strokeWidth="3"
                />
                <path
                  d="M43 290 Q78 61 237 55 H875 Q932 55 932 110 V470 Q932 525 875 525 H237 Q78 519 43 290Z"
                  fill={`url(#dp-floor-${deck})`}
                  stroke="#cad5dd"
                  strokeWidth="1"
                />
                <path
                  d="M248 63H850 M248 517H850"
                  stroke="#7196a7"
                  strokeWidth="7"
                  strokeDasharray={deck === "lower" ? "55 10" : "4 8"}
                />
                <text x="550" y="86" className="dp-drawing-label">
                  {deck === "upper"
                    ? t("ราวเรือ · วิวแม่น้ำ", "RAILING · RIVER VIEW")
                    : t("หน้าต่างพาโนรามา", "PANORAMIC WINDOWS")}
                </text>
                <text x="550" y="506" className="dp-drawing-label">
                  {deck === "upper"
                    ? t("ราวเรือ · วิวแม่น้ำ", "RAILING · RIVER VIEW")
                    : t("หน้าต่างพาโนรามา", "PANORAMIC WINDOWS")}
                </text>
                <rect
                  x="85"
                  y="211"
                  width="98"
                  height="154"
                  rx="12"
                  fill="#f1dfb7"
                  stroke="#b69454"
                  strokeWidth="1.5"
                />
                <path
                  d="M99 244Q135 224 171 244 M99 253Q135 233 171 253"
                  fill="none"
                  stroke="#92723f"
                />
                <text x="134" y="287" className="dp-feature-title">
                  {t("เวที", "STAGE")}
                </text>
                <text x="134" y="312" className="dp-small-label">
                  {t("การแสดง", "LIVE SHOW")}
                </text>
                <rect
                  x="225"
                  y="238"
                  width="574"
                  height="102"
                  rx="6"
                  fill="#edf2f5"
                  stroke="#b8c9d3"
                  strokeDasharray="6 7"
                />
                {deck === "lower" ? (
                  <>
                    <rect
                      x="333"
                      y="253"
                      width="360"
                      height="70"
                      rx="6"
                      fill="#d8e7ec"
                      stroke="#9aaec0"
                    />
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <rect
                        key={i}
                        x={347 + i * 56}
                        y="262"
                        width="43"
                        height="21"
                        rx="4"
                        fill="#8eacba"
                        stroke="#8399ae"
                      />
                    ))}
                    <text x="513" y="307" className="dp-feature-title">
                      {t("ไลน์บุฟเฟ่ต์", "BUFFET LINE")}
                    </text>
                  </>
                ) : (
                  <>
                    <path
                      d="M265 289H760"
                      stroke="#65819c"
                      strokeDasharray="5 8"
                    />
                    <text x="510" y="276" className="dp-feature-title">
                      {t("ทางเดินกลาง", "CENTRAL AISLE")}
                    </text>
                    <text x="510" y="314" className="dp-small-label">
                      {t("พื้นที่เดินไปยังเวที", "WALKWAY TO STAGE")}
                    </text>
                  </>
                )}
                {deck === "lower" && (
                  <>
                    <text x="510" y="226" className="dp-small-label">
                      {t("ทางเดิน", "WALKWAY")}
                    </text>
                    <text x="510" y="356" className="dp-small-label">
                      {t("ทางเดิน", "WALKWAY")}
                    </text>
                  </>
                )}
                {[102, 370].map((y) => (
                  <g key={y}>
                    <rect
                      x="848"
                      y={y}
                      width="60"
                      height="105"
                      rx="4"
                      fill="#e0e9ee"
                      stroke="#92a4b8"
                    />
                    {Array.from({ length: 7 }, (_, n) => (
                      <path
                        key={n}
                        d={`M853 ${y + 12 + n * 13}H903`}
                        stroke="#7b95a5"
                      />
                    ))}
                    <text x="878" y={y + 122} className="dp-small-label">
                      {t("บันได", "STAIRS")}
                    </text>
                    <path
                      d={`M878 ${y + 22}v63m-8-9 8 9 8-9`}
                      fill="none"
                      stroke="#e4c78f"
                    />
                  </g>
                ))}
                <rect
                  x="850"
                  y="262"
                  width="95"
                  height="53"
                  rx="5"
                  fill="#d5eadc"
                  stroke="#6c947d"
                />
                <text x="897" y="292" className="dp-small-label">
                  {t("ทางเข้า", "ENTRY")}
                </text>
                <text x="130" y="391" className="dp-small-label">
                  {t("หน้าเวที", "STAGE FRONT")}
                </text>
                {tables.map((table) => (
                  <g key={table.id} opacity={1}>
                    {Array.from({ length: table.seats }, (_, index) => {
                      const perSide = Math.ceil(table.seats / 2),
                        side = index < perSide ? 0 : 1;
                      const count =
                        side === 0 ? perSide : Math.floor(table.seats / 2);
                      const x =
                          count === 1
                            ? 0
                            : -27 + ((index % perSide) * 54) / (count - 1),
                        y = side === 0 ? -44 : 44;
                      return (
                        <g key={index}>
                          <rect
                            x={table.x + x - 10}
                            y={table.y + y - 8}
                            width="20"
                            height="16"
                            rx="4"
                            fill={
                              (
                                seatMode
                                  ? selected.includes(
                                      `${table.id}:${index + 1}`,
                                    )
                                  : isSelected(table.id)
                              )
                                ? "#d9b879"
                                : "#e0eaf1"
                            }
                            stroke="#94a9bd"
                          />
                          <text
                            x={table.x + x}
                            y={table.y + y + 4}
                            className="dp-seat-number"
                          >
                            {index + 1}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                ))}
              </svg>
              {seatMode &&
                tables.flatMap((table) =>
                  Array.from({ length: table.seats }, (_, index) => {
                    const perSide = Math.ceil(table.seats / 2),
                      side = index < perSide ? 0 : 1;
                    const count =
                      side === 0 ? perSide : Math.floor(table.seats / 2);
                    const x =
                        count === 1
                          ? 0
                          : -27 + ((index % perSide) * 54) / (count - 1),
                      y = side === 0 ? -44 : 44;
                    const id = `${table.id}:${index + 1}`;
                    const available =
                      !table.unavailable &&
                      (table.seatPrice ?? 0) > 0 &&
                      (!table.availableSeats ||
                        table.availableSeats.includes(id));
                    return (
                      <button
                        type="button"
                        className="dp-chair-button"
                        key={id}
                        style={{
                          left: `${(table.x + x) / 10}%`,
                          top: `${(table.y + y) / 5.8}%`,
                        }}
                        aria-label={`${t("เก้าอี้", "Seat")} ${id}`}
                        aria-pressed={selected.includes(id)}
                        disabled={!available}
                        onClick={() => onToggle(id)}
                      >
                        {index + 1}
                      </button>
                    );
                  }),
                )}
              {tables.map((table) => (
                <button
                  className="dp-table"
                  key={table.id}
                  style={{ left: `${table.x / 10}%`, top: `${table.y / 5.8}%` }}
                  disabled={table.unavailable}
                  aria-label={`${t("โต๊ะ", "Table")} ${table.id}`}
                  aria-pressed={isSelected(table.id)}
                  onClick={() => setDetail(table)}
                >
                  <strong>{table.id}</strong>
                  <span>
                    {table.unavailable ? (
                      t("ไม่ว่าง", "Unavailable")
                    ) : isSelected(table.id) ? (
                      <Check size={15} />
                    ) : (
                      `${table.seats} ${t("ที่นั่ง", "seats")}`
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <p className="dp-map-help">
            {t(
              "ลากหรือเลื่อนผัง · กด + เพื่อขยาย · แตะโต๊ะเพื่อดูรายละเอียด",
              "Drag or scroll to explore · + to zoom · Tap a table for details",
            )}
          </p>
        </>
      ) : view === "3d" ? (
        <VesselViewBoundary
          fallback={
            <div className="dp-map-help" role="alert">
              <p>
                {t(
                  "เปิดมุมมอง 3D ไม่สำเร็จ รายการที่เลือกยังอยู่ครบ",
                  "The 3D view could not be opened. Your selections are preserved.",
                )}
              </p>
              <div className="dp-view">
                <button type="button" onClick={() => setView("map")}>
                  <Map size={16} />
                  {t("กลับไปเลือกในผัง", "Use the deck plan")}
                </button>
              </div>
            </div>
          }
        >
          <Suspense
            fallback={
              <p role="status" className="dp-map-help">
                {t("กำลังเปิดมุมมองเรือ 3D…", "Opening the 3D vessel…")}
              </p>
            }
          >
            <UnicornBooking3D
              deck={deck}
              tables={tables}
              selected={selected}
              onToggle={onToggle}
              seatMode={seatMode}
              language={language}
              onFallback={() => setView("map")}
            />
          </Suspense>
        </VesselViewBoundary>
      ) : (
        <div className="dp-list">
          {tables.map((table) => (
            <button
              key={table.id}
              disabled={table.unavailable}
              aria-pressed={isSelected(table.id)}
              aria-label={`${t("โต๊ะ", "Table")} ${table.id}`}
              onClick={() => setDetail(table)}
            >
              <span className="dp-list-id">{table.id}</span>
              <span>
                <strong>{position(table)}</strong>
                <small>
                  {table.seats} {t("ที่นั่ง", "seats")} · {price(table.price)} ·{" "}
                  {table.unavailable
                    ? inventory
                      ? t("ไม่ว่าง", "Unavailable")
                      : t("ไม่ว่าง (ตัวอย่าง)", "Unavailable (sample)")
                    : isSelected(table.id)
                      ? t("เลือกแล้ว", "Selected")
                      : inventory
                        ? t("ว่าง", "Available")
                        : t("ว่าง (ตัวอย่าง)", "Available (sample)")}
                </small>
              </span>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      )}
      <div className="dp-legend">
        <span>
          <i />
          {t("ว่าง", "Available")}
        </span>
        <span>
          <i className="selected" />
          {t("เลือกแล้ว", "Selected")}
        </span>
        <span>
          <i className="unavailable" />
          {t("ไม่ว่าง", "Unavailable")}
        </span>
        <span>
          {inventory
            ? t("อัปเดตสถานะทุก 15 วินาที", "Refreshed every 15 seconds")
            : t("สถานะจำลอง", "Simulated availability")}
        </span>
      </div>
      {selected.length > 0 && (
        <div className="dp-selection">
          <strong>
            {seatMode
              ? t("ที่นั่งที่เลือก", "Selected seats")
              : t("โต๊ะที่เลือก", "Selected tables")}
          </strong>
          {selected.map((id) => (
            <button
              key={id}
              onClick={() => onToggle(id)}
              aria-label={`${t("นำโต๊ะออก", "Remove table")} ${id}`}
            >
              {id}
              <X size={13} />
            </button>
          ))}
        </div>
      )}
      <Dialog
        open={!!detail}
        onClose={() => setDetail(null)}
        aria-labelledby="dp-detail-title"
        maxWidth="xs"
        fullWidth
        className="dp-dialog"
      >
        <div className="dp-detail">
          <button
            className="dp-close"
            aria-label={t("ปิดรายละเอียดโต๊ะ", "Close table details")}
            onClick={() => setDetail(null)}
          >
            <X size={21} />
          </button>
          {detail && (
            <>
              <span className="dp-detail-deck">
                {deck === "upper"
                  ? t("ชั้นบน · กลางแจ้ง", "Upper deck · Open air")
                  : t("ชั้นล่าง · ห้องแอร์", "Lower deck · Air-conditioned")}
              </span>
              <h2 id="dp-detail-title">
                {t("โต๊ะ", "Table")} {detail.id}
              </h2>
              {!seatMode && (
                <div className="dp-seat-preview">
                  {Array.from(
                    { length: Math.ceil(detail.seats / 2) },
                    (_, i) => (
                      <span key={i}>{i + 1}</span>
                    ),
                  )}
                  <div>{detail.id}</div>
                  {Array.from(
                    { length: Math.floor(detail.seats / 2) },
                    (_, i) => (
                      <span key={i}>{Math.ceil(detail.seats / 2) + i + 1}</span>
                    ),
                  )}
                </div>
              )}
              {seatMode && (
                <div
                  className="dp-chair-picker"
                  aria-label={t("เลือกเก้าอี้", "Choose chairs")}
                >
                  <p>
                    {t(
                      "โต๊ะร่วมกับผู้โดยสารท่านอื่นได้ · บุฟเฟ่ต์รวมแล้ว",
                      "Shared table with other passengers · Buffet included",
                    )}
                  </p>
                  {Array.from({ length: detail.seats }, (_, i) => {
                    const id = `${detail.id}:${i + 1}`;
                    const current = (inventory ?? previewTables).find(
                      (table) => table.id === detail.id,
                    );
                    const available =
                      current &&
                      !current.unavailable &&
                      (current.seatPrice ?? 0) > 0 &&
                      (!current.availableSeats ||
                        current.availableSeats.includes(id));
                    return (
                      <button
                        key={id}
                        className="bp-secondary"
                        disabled={!available}
                        aria-pressed={selected.includes(id)}
                        aria-label={`${t("เก้าอี้", "Seat")} ${id}`}
                        onClick={() => onToggle(id)}
                      >
                        {i + 1}{" "}
                        {selected.includes(id)
                          ? "✓"
                          : !available
                            ? t("ไม่ว่าง", "Unavailable")
                            : ""}
                      </button>
                    );
                  })}
                </div>
              )}
              <dl>
                <div>
                  <dt>
                    <Users size={17} />
                    {t("จำนวนที่นั่ง", "Capacity")}
                  </dt>
                  <dd>
                    {detail.seats} {t("คน / โต๊ะ", "guests / table")}
                  </dd>
                </div>
                <div>
                  <dt>
                    {inventory
                      ? t("ตำแหน่งในผัง", "Plan position")
                      : t("ตำแหน่งตัวอย่าง", "Sample position")}
                  </dt>
                  <dd>{position(detail)}</dd>
                </div>
                <div>
                  <dt>{t("การจอง", "Booking")}</dt>
                  <dd>
                    {seatMode
                      ? t("เลือกเป็นรายเก้าอี้", "Individual chairs")
                      : t("จองทั้งโต๊ะ", "Whole table")}
                  </dd>
                </div>
                <div>
                  <dt>{t("บุฟเฟ่ต์", "Buffet")}</dt>
                  <dd>
                    {t("รวมในค่าที่นั่งแล้ว", "Included in the seat price")}
                  </dd>
                </div>
              </dl>
              <div className="dp-detail-price">
                <span>
                  {seatMode
                    ? t("ราคา / เก้าอี้", "Price / chair")
                    : inventory
                      ? t("ราคา / โต๊ะ", "Price / table")
                      : t("ราคาตัวอย่าง / โต๊ะ", "Sample price / table")}
                </span>
                <strong>
                  {price(seatMode ? (detail.seatPrice ?? 0) : detail.price)}
                </strong>
              </div>
              <p>
                <Info size={15} />
                {inventory
                  ? t(
                      "ตำแหน่งและราคาตามรอบที่รับรอง ภาพโครงเรือเป็นแผนผังประกอบ",
                      "Tables and prices follow the approved sailing. Vessel structure is schematic.",
                    )
                  : t(
                      "ตำแหน่ง เก้าอี้ และราคาเป็นตัวอย่าง รอผังจริงจากเรือ",
                      "Position, chairs and prices are illustrative, pending the approved plan.",
                    )}
              </p>
              <button
                className="bp-primary"
                onClick={() => {
                  if (!seatMode) onToggle(detail.id);
                  setDetail(null);
                }}
              >
                {seatMode
                  ? t("เลือกเรียบร้อย", "Done choosing chairs")
                  : selected.includes(detail.id)
                    ? t("นำโต๊ะนี้ออก", "Remove this table")
                    : t("เลือกโต๊ะนี้", "Choose this table")}
                <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}
