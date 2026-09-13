import type { Zone } from "./api";
export default function BoatMap({
  zones,
  selected,
  onSelect,
}: {
  zones: Zone[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="map-panel">
      <h2>เลือกโซนที่นั่งบนเรือ</h2>
      <p className="muted">เลือกพื้นที่บนผังเพื่อดูราคาและจำนวนคงเหลือ</p>
      <div className="boat-scene">
        <div className="boat-hull">
          {zones.map((z, i) => (
            <button
              key={z.id}
              type="button"
              onClick={() => onSelect(z.id)}
              aria-pressed={z.id === selected}
              className={`boat-zone ${z.id === selected ? "selected" : ""}`}
            >
              <span className="seat-pattern" aria-hidden="true">
                {Array.from({ length: 6 }, (_, j) => (
                  <i key={j} />
                ))}
              </span>
              <strong>{z.name}</strong>
              <small>{["FRONT ZONE", "OUTDOOR ZONE", "INDOOR ZONE"][i]}</small>
              <span className="zone-count">{z.available} ที่ว่าง</span>
            </button>
          ))}
        </div>
      </div>
      <div className="map-caption">
        <span>หัวเรือ</span>
        <span>ผังแบ่งโซนเบื้องต้น • ชั้นบน</span>
        <span>ท้ายเรือ</span>
      </div>
      <p className="map-note">
        ตำแหน่งโต๊ะและมุมมองเวทีรอยืนยันจากเรือ
        การเลือกโซนยังไม่ใช่การระบุเลขที่นั่ง
      </p>
    </section>
  );
}
