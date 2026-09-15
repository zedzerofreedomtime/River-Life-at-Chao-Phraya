import type { Zone } from "./api";

const deckLabel: Record<string, string> = {
  A: "UPPER DECK • FRONT",
  B: "UPPER DECK • REAR",
  C: "LOWER DECK",
};

export default function BoatMap({
  zones,
  selected,
  onSelect,
}: {
  zones: Zone[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const upperDeckZones = zones.filter((z) => z.id === "A" || z.id === "B");
  const lowerDeckZone = zones.find((z) => z.id === "C");
  return (
    <section className="map-panel">
      <h2>เลือกโซนที่นั่งบนเรือ</h2>
      <p className="muted">เลือกพื้นที่บนผังเพื่อดูราคาและจำนวนคงเหลือ</p>
      <div className="vessel-side" aria-label="ผังเรือด้านข้าง">
        <svg
          className="vessel-outline"
          viewBox="0 0 900 440"
          aria-hidden="true"
        >
          <path d="M42 405 H858" stroke="#d9e7ef" strokeWidth="2" />
          <path
            d="M72 418 H290 M340 418 H740"
            stroke="#e5edf3"
            strokeWidth="2"
          />
          <path
            d="M190 103 L224 57 H311 L334 103"
            fill="#edf3f7"
            stroke="#8190a0"
            strokeWidth="3"
          />
          <path
            d="M228 68 L208 94 H248 V68 Z M260 68 H302 L320 94 H260 Z"
            fill="#c7dbe8"
            stroke="#9fb7c9"
          />
          <path d="M575 90 V61 M565 61 H585" stroke="#8190a0" strokeWidth="3" />
          <path
            d="M155 108 H818 L849 147 V335 H112 V219 L155 205 Z"
            fill="#f3f6f9"
            stroke="#8190a0"
            strokeWidth="3"
          />
          <path
            d="M132 105 H830 M128 204 H853 M112 215 H853"
            stroke="#8190a0"
            strokeWidth="3"
          />
          <path
            d="M350 80 H810 Q830 80 837 102"
            fill="none"
            stroke="#8190a0"
            strokeWidth="4"
          />
          <path
            d="M356 82 V103 M440 82 V103 M525 82 V103 M610 82 V103 M695 82 V103 M780 82 V103"
            stroke="#a6b6c5"
            strokeWidth="2"
          />
          <path
            d="M32 319 L118 333 H858 L838 373 Q832 386 806 388 H183 Q110 386 75 362 Z"
            fill="#e1eaf1"
            stroke="#8190a0"
            strokeWidth="3"
          />
          <path d="M92 355 H847" stroke="#b99453" strokeWidth="3" />
          <circle cx="151" cy="357" r="7" fill="#b4c8d8" />
          <circle cx="183" cy="357" r="7" fill="#b4c8d8" />
        </svg>
        <div className="vessel-upper" aria-label="ดาดฟ้าชั้นบน">
          {upperDeckZones.map((zone, index) => (
            <ZoneButton
              key={zone.id}
              zone={zone}
              index={index}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </div>
        {lowerDeckZone && (
          <ZoneButton
            zone={lowerDeckZone}
            index={2}
            selected={selected}
            onSelect={onSelect}
            lowerDeck
          />
        )}
      </div>
      <div className="map-caption">
        <span>← หัวเรือ</span>
        <span>มุมมองด้านข้าง • ดาดฟ้าบน 250 ใบ</span>
        <span>ท้ายเรือ →</span>
      </div>
      <p className="map-note">
        เลือกดาดฟ้าบน (หัวเรือ/ท้ายเรือ) หรือชั้นล่าง 100 ใบ
        ภาพใช้ระบุตำแหน่งโซนโดยประมาณ ไม่ใช่ผังเลขที่นั่ง
      </p>
    </section>
  );
}

function ZoneButton({
  zone,
  index,
  selected,
  onSelect,
  lowerDeck = false,
}: {
  zone: Zone;
  index: number;
  selected: string;
  onSelect: (id: string) => void;
  lowerDeck?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(zone.id)}
      aria-pressed={zone.id === selected}
      className={`vessel-zone ${lowerDeck ? "vessel-lower" : ""} ${zone.id === selected ? "selected" : ""}`}
    >
      <span className="vessel-windows" aria-hidden="true">
        {Array.from({ length: 6 }, (_, seat) => (
          <i key={seat} />
        ))}
      </span>
      <strong>{zone.name}</strong>
      <small>{deckLabel[zone.id] ?? `ZONE ${index + 1}`}</small>
      <span className="zone-count">{zone.available} ที่ว่าง</span>
    </button>
  );
}
