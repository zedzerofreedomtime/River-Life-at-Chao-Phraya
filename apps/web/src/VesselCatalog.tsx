import { MapPin, Search, Ship, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { Vessel } from "./vessels";

export default function VesselCatalog({
  vessels,
  onOpen,
}: {
  vessels: Vessel[];
  onOpen: (vessel: Vessel) => void;
}) {
  const [query, setQuery] = useState("");
  const matchingVessels = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("th-TH");
    if (!normalized) return vessels;
    return vessels.filter((vessel) =>
      [vessel.name, vessel.nameEn, vessel.pier].some((value) =>
        value.toLocaleLowerCase("th-TH").includes(normalized),
      ),
    );
  }, [query, vessels]);

  return (
    <section className="vessel-catalog" aria-labelledby="fleet-heading">
      <div className="vessel-catalog-hero">
        <div>
          <h1 id="fleet-heading">เลือกเรือของคุณ</h1>
          <p>เลือกเรือและรอบล่องที่ต้องการ แล้วจึงเลือกโซนบัตรบนเรือ</p>
        </div>
        <label className="vessel-search">
          <Search aria-hidden="true" size={21} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อเรือ หรือท่าเรือ"
            aria-label="ค้นหาเรือหรือท่าเรือ"
          />
        </label>
      </div>

      <div className="vessel-catalog-content">
        <div className="vessel-list-heading">
          <h2>เรือที่เปิดให้จอง</h2>
          <span>{matchingVessels.length} ลำ</span>
        </div>
        {matchingVessels.length ? (
          <div className="vessel-grid">
            {matchingVessels.map((vessel) => (
              <article className="vessel-card" key={vessel.id}>
                <img src={vessel.image} alt={`เรือ ${vessel.name}`} />
                <div className="vessel-card-body">
                  <div className="vessel-card-title">
                    <span>{vessel.nameEn}</span>
                    <h3>{vessel.name}</h3>
                  </div>
                  <p>{vessel.summary}</p>
                  <dl>
                    <div>
                      <dt>
                        <MapPin aria-hidden="true" size={17} /> จุดขึ้นเรือ
                      </dt>
                      <dd>{vessel.pier}</dd>
                    </div>
                    <div>
                      <dt>
                        <UsersRound aria-hidden="true" size={17} /> ความจุ
                      </dt>
                      <dd>{vessel.capacity} ท่าน</dd>
                    </div>
                  </dl>
                  <button
                    className="vessel-open-button"
                    onClick={() => onOpen(vessel)}
                    disabled={vessel.availability !== "open"}
                  >
                    <Ship aria-hidden="true" size={19} />
                    {vessel.availability === "open"
                      ? "ดูรอบล่องเรือ"
                      : "เร็ว ๆ นี้"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="vessel-empty">
            <Ship aria-hidden="true" size={32} />
            <strong>ไม่พบเรือที่ตรงกับคำค้นหา</strong>
            <span>ลองค้นหาด้วยชื่อเรือหรือ “ICONSIAM”</span>
          </div>
        )}
      </div>
    </section>
  );
}
