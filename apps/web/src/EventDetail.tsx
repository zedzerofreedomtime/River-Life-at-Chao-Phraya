import { Clock3, MapPin, ShipWheel, Utensils } from "lucide-react";
import type { EventInfo, Zone } from "./api";

const programme = [
  ["Welcome", "ต้อนรับผู้ร่วมงานบนเรือ 10–15 นาที"],
  ["Live music", "ดนตรีสดเปิดงาน 15 นาที"],
  ["หนุมาน–นางมัจฉา", "การแสดงพิเศษประมาณ 15 นาที"],
  ["Live music", "ดนตรีสดปิดท้ายตลอดช่วงล่องเรือ"],
];

export default function EventDetail({
  event,
  onStartCheckout,
}: {
  event: EventInfo;
  onStartCheckout: (zone?: string) => void;
}) {
  return (
    <>
      <section className="event-hero">
        <img
          src="/images/river-cruise-hero.png"
          alt="เรือคอนเสิร์ตล่องแม่น้ำเจ้าพระยายามค่ำคืน"
        />
        <div className="event-hero-copy">
          <h1>Concert on the River</h1>
          <p>คอนเสิร์ตบนเรือเจ้าพระยา</p>
          <span>วันงานรอยืนยัน</span>
        </div>
      </section>
      <section className="event-facts" aria-label="ข้อมูลการเดินทาง">
        <Fact icon={MapPin} label="จุดขึ้นเรือ" value={event.pier} />
        <Fact
          icon={Clock3}
          label="ขึ้นเรือให้ครบก่อน"
          value={`${event.boarding} น.`}
        />
        <Fact
          icon={ShipWheel}
          label="เวลาเรือออก"
          value={`${event.departure} น.`}
        />
        <Fact
          icon={Utensils}
          label="ระยะเวลากิจกรรม"
          value="ล่องเรือ 2 ชั่วโมง"
        />
      </section>
      <section className="event-content">
        <article className="event-story">
          <h2>รายละเอียดงานแสดง</h2>
          <p>
            ค่ำคืนของดนตรี สายน้ำ และการแสดงบนเรือเจ้าพระยา
            อาหารบุฟเฟต์และรายละเอียดเมนู จะแจ้งยืนยันพร้อมรอบการแสดง
          </p>
          <h3>กำหนดการเบื้องต้น</h3>
          <ol className="rundown">
            {programme.map(([name, detail]) => (
              <li key={`${name}-${detail}`}>
                <strong>{name}</strong>
                <span>{detail}</span>
              </li>
            ))}
          </ol>
          <div className="event-notes">
            <div>
              <Utensils size={22} />
              <p>
                <strong>อาหารบนเรือ</strong>
                เมนูบุฟเฟต์และโปรโมชั่นเครื่องดื่มรอยืนยัน
              </p>
            </div>
            <div>
              <Clock3 size={22} />
              <p>
                <strong>เงื่อนไขการเข้าร่วม</strong>มาสายจนไม่ทันเรือถือเป็น
                No-show ไม่คืนเงินและไม่ใช้สิทธิ์ใหม่
              </p>
            </div>
          </div>
        </article>
        <aside className="ticket-picker">
          <h2>เลือกบัตร</h2>
          <p>เลือกโซนที่นั่งเพื่อดำเนินการสั่งซื้อ</p>
          {event.zones.map((zone) => (
            <ZoneRow key={zone.id} zone={zone} onChoose={onStartCheckout} />
          ))}
          <button className="gold-action" onClick={() => onStartCheckout()}>
            เลือกบัตร
          </button>
          <small>
            ราคาและจำนวนบัตรอยู่ระหว่างการยืนยัน โปรดตรวจสอบก่อนชำระเงิน
          </small>
        </aside>
      </section>
    </>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div>
      <Icon aria-hidden="true" size={28} />
      <span>
        {label}
        <strong>{value}</strong>
      </span>
    </div>
  );
}

function ZoneRow({
  zone,
  onChoose,
}: {
  zone: Zone;
  onChoose: (zone: string) => void;
}) {
  return (
    <button className="zone-row" onClick={() => onChoose(zone.id)}>
      <span>
        <strong>{zone.name}</strong>
        <small>{zone.available} ที่ว่าง</small>
      </span>
      <span className="zone-row-status">ราคาและโควตารอยืนยัน</span>
    </button>
  );
}
