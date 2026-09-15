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
      <div className="boat-scene">
        <div className="boat-hull">
          <img
            className="boat-profile-image"
            src="/images/boat/unicorn-night-exterior.jpg"
            alt="เรือ Unicorn Cruise มุมมองด้านข้าง"
          />
          <div className="boat-upper-deck" aria-label="ดาดฟ้าชั้นบน">
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
      className={`boat-zone ${lowerDeck ? "boat-zone-lower" : ""} ${zone.id === selected ? "selected" : ""}`}
    >
      <span className="seat-pattern" aria-hidden="true">
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
