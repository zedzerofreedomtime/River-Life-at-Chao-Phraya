import { useState } from "react";
import { ArrowUpRight, Clock3, MapPin, Ship } from "lucide-react";
import type { Language } from "../../data/i18n";
import "../../GettingThere.css";

const vessels = [
  {
    id: "alangka",
    th: "อลังกา",
    name: "Alangka Cruise",
    position: "top-left",
    pierTh: "ไอคอนสยาม",
    pierEn: "ICONSIAM",
    hours: "19:15–21:15",
    map: "ICONSIAM Bangkok",
  },
  {
    id: "viva",
    th: "วีว่า",
    name: "VIVA Alangka Cruise",
    position: "top-right",
    pierTh: "เอเชียทีค",
    pierEn: "Asiatique The Riverfront",
    hours: "19:45–21:45",
    map: "Asiatique The Riverfront Bangkok",
  },
  {
    id: "unicorn",
    th: "ยูนิคอน",
    name: "Unicorn Cruise",
    position: "bottom-left",
    pierTh: "ไอคอนสยาม",
    pierEn: "ICONSIAM",
    hours: "19:00–21:00",
    map: "ICONSIAM Bangkok",
  },
  {
    id: "legacy",
    th: "เดอะเลกาซี่",
    name: "The Legacy Yacht",
    position: "bottom-right",
    pierTh: "รอยืนยันท่าเรือ",
    pierEn: "Pier to be confirmed",
    hours: null,
    map: null,
  },
] as const;

function VesselPhoto({ position, name }: { position: string; name: string }) {
  return (
    <span className="vessel-photo" role="img" aria-label={name}>
      <svg
        viewBox={
          (
            {
              "top-left": "0 0 660 459",
              "top-right": "660 0 599 459",
              "bottom-left": "0 459 660 370",
              "bottom-right": "660 459 599 370",
            } as Record<string, string>
          )[position]
        }
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <image
          href="/images/boat/river-life-four-vessels.png"
          width="1259"
          height="829"
        />
      </svg>
    </span>
  );
}

export default function GettingThere({
  language,
  onContact,
}: {
  language: Language;
  onContact: () => void;
}) {
  const en = language === "en";
  const [selected, setSelected] =
    useState<(typeof vessels)[number]["id"]>("alangka");
  const boat = vessels.find((vessel) => vessel.id === selected)!;
  return (
    <section className="getting-there" aria-labelledby="getting-there-title">
      <header className="getting-there-heading">
        <span>YOUR WAY TO THE RIVER</span>
        <h1 id="getting-there-title">{en ? "Getting there" : "การเดินทาง"}</h1>
        <p>
          {en
            ? "Choose your vessel to find its departure pier and sailing time."
            : "เลือกเรือของคุณ เพื่อดูท่าเรือและเวลาล่องเรือให้ตรงกับรอบที่จอง"}
        </p>
      </header>
      <div
        className="vessel-picker"
        role="group"
        aria-label={en ? "Choose your vessel" : "เลือกเรือ"}
      >
        {vessels.map((vessel, index) => (
          <button
            key={vessel.id}
            type="button"
            className="vessel-choice"
            aria-pressed={selected === vessel.id}
            onClick={() => setSelected(vessel.id)}
          >
            <VesselPhoto position={vessel.position} name={vessel.name} />
            <span className="vessel-choice-label">
              <small>0{index + 1}</small>
              <span>
                <strong>{en ? vessel.name : vessel.th}</strong>
                <span>{en ? vessel.th : vessel.name}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
      <article
        className="vessel-arrival"
        aria-labelledby="vessel-arrival-title"
      >
        <VesselPhoto position={boat.position} name={boat.name} />
        <div className="vessel-arrival-info">
          <span className="vessel-eyebrow">
            <Ship size={17} aria-hidden="true" />{" "}
            {en ? "YOUR DEPARTURE" : "ข้อมูลการเดินทางของคุณ"}
          </span>
          <h2 id="vessel-arrival-title">{en ? boat.name : boat.th}</h2>
          <p className="vessel-arrival-name">{en ? boat.th : boat.name}</p>
          <dl>
            <div>
              <dt>
                <MapPin size={20} aria-hidden="true" />
                {en ? "Departure pier" : "จุดขึ้นเรือ"}
              </dt>
              <dd>{en ? boat.pierEn : boat.pierTh}</dd>
            </div>
            <div>
              <dt>
                <Clock3 size={20} aria-hidden="true" />
                {en ? "Sailing time · Bangkok" : "เวลาล่องเรือ · เวลาไทย"}
              </dt>
              <dd>
                {boat.hours ?? (en ? "Time to be confirmed" : "รอยืนยันเวลา")}
                {boat.hours && (
                  <small>
                    {en ? "Departure – return" : "ออกเรือ – กลับถึงท่า"}
                  </small>
                )}
              </dd>
            </div>
          </dl>
          {boat.map ? (
            <a
              className="vessel-map-link"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(boat.map)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {en ? "Open directions" : "เปิดแผนที่การเดินทาง"}
              <ArrowUpRight size={19} aria-hidden="true" />
            </a>
          ) : (
            <button
              className="vessel-map-link"
              type="button"
              onClick={onContact}
            >
              {en ? "Ask about the pier and time" : "สอบถามท่าเรือและเวลา"}
              <ArrowUpRight size={19} aria-hidden="true" />
            </button>
          )}
          <p className="vessel-arrival-note">
            {en
              ? "Check your booking confirmation for the check-in time and exact boarding point."
              : "ตรวจสอบเวลาเช็กอินและจุดนัดพบจากรายละเอียดการจองของคุณอีกครั้ง"}
          </p>
        </div>
      </article>
    </section>
  );
}
