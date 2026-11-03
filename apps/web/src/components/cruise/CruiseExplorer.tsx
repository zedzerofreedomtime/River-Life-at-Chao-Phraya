import type { Vessel as Boat } from "../../data/cruises";
import CruiseBooking from "./CruiseBooking";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Search,
  MapPin,
  Clock,
  Users,
  Ship,
  Images,
} from "lucide-react";
import type { Language } from "../../data/i18n";
import { api } from "../../data/api";
import ExperiencePhotoGallery from "../home/ExperiencePhotoGallery";

export function BoatPhoto({ boat }: { boat: Boat }) {
  return (
    <svg
      viewBox={boat.crop}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={boat.name}
    >
      <image
        href="/images/boat/river-life-four-vessels.png"
        width="1259"
        height="829"
      />
    </svg>
  );
}
function RiverMap({ onPier }: { onPier: (pier: string) => void }) {
  const node = useRef<HTMLDivElement>(null);
  const callback = useRef(onPier);
  callback.current = onPier;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!node.current) return;
    const map = L.map(node.current, { scrollWheelZoom: false }).setView(
      [13.713, 100.508],
      13,
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    })
      .on("tileerror", () => setFailed(true))
      .addTo(map);
    for (const [name, lat, lng] of [
      ["ICONSIAM", 13.7265, 100.5105],
      ["Asiatique", 13.7044, 100.5031],
    ] as const) {
      L.marker([lat, lng], {
        title: name,
        icon: L.divIcon({
          className: "rx-pier-marker",
          html: `<span>${name}</span>`,
          iconSize: [100, 32],
        }),
      })
        .addTo(map)
        .on("click", () => callback.current(name));
    }
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(node.current);
    return () => {
      resize.disconnect();
      map.remove();
    };
  }, []);
  return (
    <div className="rx-map-wrap">
      <div ref={node} className="rx-map" aria-label="Departure piers map" />
      {failed && (
        <p className="rx-map-error">
          แผนที่โหลดไม่ครบ · เลือกท่าเรือจากตัวกรองด้านบนได้
        </p>
      )}
      <span className="rx-map-caption">จุดขึ้นเรือ · Departure piers</span>
    </div>
  );
}
export default function CruiseExplorer({
  language,

  savedOnly,
  authenticated,
  onLogin,
  onOrders,
  onContact,
}: {
  language: Language;

  savedOnly: boolean;
  authenticated: boolean;
  onLogin: () => void;
  onOrders: () => void;
  onContact: () => void;
}) {
  const en = language === "en";
  const [boats, setBoats] = useState<Boat[]>([]);
  const [catalogError, setCatalogError] = useState("");
  useEffect(() => {
    let alive = true;
    api<Boat[]>("/cruises")
      .then((data) => {
        if (alive) {
          setBoats(data);
          setSelected(
            data.find(
              (b) => b.id === new URLSearchParams(location.search).get("boat"),
            ) ?? null,
          );
        }
      })
      .catch(() => {
        if (alive)
          setCatalogError(
            en
              ? "Unable to load cruises. Please refresh."
              : "โหลดรายชื่อเรือไม่ได้ กรุณารีเฟรช",
          );
      });
    return () => {
      alive = false;
    };
  }, [en]);
  const readBoat = () =>
    boats.find(
      (b) => b.id === new URLSearchParams(location.search).get("boat"),
    ) ?? null;
  const [selected, setSelected] = useState<Boat | null>(readBoat);
  const [availability, setAvailability] = useState(false);
  const [query, setQuery] = useState("");
  const [pier, setPier] = useState("");

  const [tab, setTab] = useState("about");
  const [gallery, setGallery] = useState<
    "food" | "hanuman" | "music" | "riverside" | null
  >(null);
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      const v = JSON.parse(
        localStorage.getItem("riverlife.saved-boats") || "[]",
      );
      return Array.isArray(v)
        ? v.filter((x: unknown) => typeof x === "string")
        : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    const pop = () => {
      setSelected(readBoat());
      setAvailability(false);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  const choose = (boat: Boat | null) => {
    setSelected(boat);
    setAvailability(false);
    setTab("about");
    history.pushState(
      null,
      "",
      `${location.pathname}${boat ? `?boat=${boat.id}` : ""}`,
    );
    window.scrollTo(0, 0);
  };
  const toggle = (id: string) =>
    setSaved((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      localStorage.setItem("riverlife.saved-boats", JSON.stringify(next));
      return next;
    });
  const filtered = boats.filter(
    (b) =>
      (!savedOnly || saved.includes(b.id)) &&
      (!pier || b.pier === pier) &&
      `${b.name} ${b.th} ${b.pier}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  if (selected)
    return (
      <section className="rx-detail">
        <div className="rx-detail-top">
          <button
            onClick={() =>
              availability ? setAvailability(false) : choose(null)
            }
            aria-label={en ? "Back" : "กลับ"}
          >
            <ArrowLeft />
          </button>
          <span>
            {availability
              ? en
                ? "Find a sailing"
                : "เลือกรอบล่องเรือ"
              : selected.name}
          </span>
          <button
            onClick={() => toggle(selected.id)}
            aria-label={en ? "Save cruise" : "บันทึกเรือ"}
            aria-pressed={saved.includes(selected.id)}
          >
            <Heart
              fill={saved.includes(selected.id) ? "currentColor" : "none"}
            />
          </button>
        </div>
        {!availability ? (
          <>
            <div className="rx-detail-hero">
              <BoatPhoto boat={selected} />
            </div>
            <div className="rx-detail-body">
              <h1>{selected.name}</h1>
              <p className="rx-meta">
                <MapPin size={16} />
                {selected.pier ||
                  (en ? "Pier to be confirmed" : "รอยืนยันท่าเรือ")}{" "}
                <Clock size={16} />
                {selected.time ||
                  (en ? "Time to be confirmed" : "รอยืนยันเวลา")}
              </p>
              {selected.id === "unicorn" && (
                <div className="rx-gallery-shortcuts">
                  {(
                    [
                      [
                        "food",
                        "อาหาร",
                        "Dining",
                        "/images/food-gallery/buffet-01-v2.webp",
                      ],
                      [
                        "hanuman",
                        "การแสดง",
                        "Shows",
                        "/images/hanuman-gallery/hanuman-01.webp",
                      ],
                      [
                        "music",
                        "ดนตรีสด",
                        "Live music",
                        "/images/music-gallery/singer.webp",
                      ],
                      [
                        "riverside",
                        "บรรยากาศ",
                        "Atmosphere",
                        "/images/editorial/riverside-table-original.jpg",
                      ],
                    ] as const
                  ).map(([kind, th, eng, src]) => (
                    <button key={kind} onClick={() => setGallery(kind)}>
                      <img src={src} alt="" />
                      <span>
                        <Images size={13} />
                        {en ? eng : th}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className="rx-tabs" role="tablist">
                <button
                  role="tab"
                  aria-selected={tab === "about"}
                  onClick={() => setTab("about")}
                >
                  {en ? "About" : "เกี่ยวกับเรือ"}
                </button>
                <button
                  role="tab"
                  aria-selected={tab === "details"}
                  onClick={() => setTab("details")}
                >
                  {en ? "Before you book" : "ก่อนจอง"}
                </button>
              </div>
              <div className="rx-info" role="tabpanel">
                {tab === "about" ? (
                  <>
                    <h2>
                      {en
                        ? "Your evening on the river"
                        : "ค่ำคืนของคุณบนสายน้ำ"}
                    </h2>
                    <p>{en ? selected.english : selected.description}</p>
                    <div className="rx-features">
                      <span>
                        <Ship />
                        {en ? "River cruise" : "ล่องเรือชมวิว"}
                      </span>
                      <span>
                        <Clock />
                        {selected.time || (en ? "Enquire" : "สอบถามรอบ")}
                      </span>
                      <span>
                        <Users />
                        {en ? "Table booking" : "จองเป็นโต๊ะ"}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <h2>{en ? "Booking information" : "ข้อมูลก่อนจอง"}</h2>
                    <p>
                      {en
                        ? "Please check the sailing date, departure pier, guest count and package with River Life. Artist lineups and menus depend on the sailing."
                        : "ตรวจสอบวันเดินทาง ท่าเรือ จำนวนผู้ร่วมเดินทาง และแพ็กเกจกับ River Life รายชื่อศิลปินและเมนูอาหารขึ้นอยู่กับรอบเรือ"}
                    </p>
                    <p>
                      {en
                        ? "Only published sailings can be reserved. Online payments and boarding tickets are not available yet."
                        : "สำรองโต๊ะได้เฉพาะรอบที่เปิดรับจอง ยังไม่เปิดรับชำระเงินออนไลน์และยังไม่ออกบัตรขึ้นเรือ"}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="rx-bookbar">
              <span>
                {en ? "Your next evening" : "เลือกค่ำคืนของคุณ"}
                <small>
                  {en
                    ? "Sailing prices to be confirmed"
                    : "ราคาจริงรอประกาศตามรอบ"}
                </small>
              </span>
              <button
                className="rx-primary"
                onClick={() => setAvailability(true)}
              >
                {en ? "Find a sailing" : "เลือกรอบเรือ"}
                <ArrowRight size={18} />
              </button>
            </div>
          </>
        ) : (
          <CruiseBooking
            vessel={selected.id}
            language={language}
            authenticated={authenticated}
            onLogin={onLogin}
            onContact={onContact}
            onOrders={onOrders}
          />
        )}
        {gallery && (
          <ExperiencePhotoGallery
            language={language}
            kind={gallery}
            onClose={() => setGallery(null)}
          />
        )}
      </section>
    );
  return (
    <section className="rx-explorer">
      {catalogError && <p role="alert">{catalogError}</p>}
      <div className="rx-searchbar">
        <div>
          <h1>
            {savedOnly
              ? en
                ? "Saved cruises"
                : "เรือที่บันทึกไว้"
              : en
                ? "Find your night on the river"
                : "คืนนี้…ล่องเรือลำไหนดี"}
          </h1>
          <p>
            {en
              ? "Explore the Chao Phraya. Find a cruise. Make it your night."
              : "ค้นหาเรือที่ใช่ แล้วเลือกค่ำคืนบนเจ้าพระยาในแบบคุณ"}
          </p>
        </div>
        <label className="rx-search">
          <Search size={20} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              en ? "Search cruises or piers" : "ค้นหาชื่อเรือ หรือท่าเรือ"
            }
            aria-label={en ? "Search cruises" : "ค้นหาเรือ"}
          />
        </label>
        <div className="rx-filters">
          {["", "ICONSIAM", "Asiatique"].map((p) => (
            <button
              key={p}
              aria-pressed={pier === p}
              onClick={() => setPier(p)}
            >
              {p || (en ? "All cruises" : "เรือทั้งหมด")}
            </button>
          ))}
        </div>
      </div>
      <div className="rx-discovery">
        <RiverMap onPier={setPier} />
        <div className="rx-results">
          <div className="rx-results-heading">
            <h2>{en ? "Dinner cruises" : "เรือล่องเจ้าพระยา"}</h2>
            <span aria-live="polite">
              {filtered.length} {en ? "cruises" : "ลำ"}
            </span>
          </div>
          {filtered.length === 0 && (
            <div className="rx-empty">
              <Ship size={32} />
              <h2>{en ? "No cruises found" : "ยังไม่มีเรือในรายการนี้"}</h2>
              <p>
                {en
                  ? "Try another search or save a cruise with the heart icon."
                  : "ลองเปลี่ยนคำค้นหาหรือท่าเรือ หรือกดรูปหัวใจเพื่อบันทึกเรือ"}
              </p>
              <button
                onClick={() => {
                  setQuery("");
                  setPier("");
                }}
              >
                {en ? "Clear filters" : "ล้างตัวกรอง"}
              </button>
            </div>
          )}
          {filtered.map((boat) => (
            <article key={boat.id} className="rx-boat-card">
              <button className="rx-card-main" onClick={() => choose(boat)}>
                <BoatPhoto boat={boat} />
                <span>
                  <strong>{boat.name}</strong>
                  <small>
                    <MapPin size={13} />
                    {boat.pier ||
                      (en ? "Pier to be confirmed" : "รอยืนยันท่าเรือ")}
                  </small>
                  <small>
                    <Clock size={13} />
                    {boat.time ||
                      (en ? "Time to be confirmed" : "รอยืนยันเวลา")}
                  </small>
                  <em>
                    {boat.id === "unicorn"
                      ? en
                        ? "View sailings"
                        : "ดูรอบล่องเรือ"
                      : en
                        ? "Enquire about sailings"
                        : "สอบถามรอบล่องเรือ"}
                  </em>
                </span>
                <ArrowRight size={18} />
              </button>
              <button
                className="rx-save"
                aria-label={`${en ? "Save" : "บันทึก"} ${boat.name}`}
                aria-pressed={saved.includes(boat.id)}
                onClick={() => toggle(boat.id)}
              >
                <Heart
                  size={19}
                  fill={saved.includes(boat.id) ? "currentColor" : "none"}
                />
              </button>
            </article>
          ))}
          <p className="rx-results-note">
            {en
              ? "Map shows departure locations, not live boat positions. Confirm details with River Life."
              : "หมุดแสดงจุดขึ้นเรือ ไม่ใช่ตำแหน่งเรือสด กรุณายืนยันรายละเอียดรอบกับ River Life"}
          </p>
        </div>
      </div>
    </section>
  );
}
