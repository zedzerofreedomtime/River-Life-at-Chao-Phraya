import {
  Anchor,
  ArrowRight,
  Clock3,
  MapPin,
  ShipWheel,
  Utensils,
  UsersRound,
  Waves,
} from "lucide-react";
import type { EventInfo } from "./api";

const programme = [
  ["Welcome", "ต้อนรับผู้ร่วมงาน ณ ท่าเรือ ICONSIAM"],
  ["Live music", "เริ่มต้นด้วยเสียงดนตรีสดไพเราะ"],
  ["หนุมาน – นางมัจฉา", "การแสดงพิเศษริมสายน้ำ ถ่ายทอดเสน่ห์วัฒนธรรมไทย"],
  ["Live music", "สนุกต่อเนื่องไปกับบทเพลงตลอดการล่องเรือ"],
];

const bookingVessels = [
  {
    id: "unicorn-cruise",
    name: "ยูนิคอร์นครูซ",
    detail: "ดาดฟ้าบน 250 ใบ · ชั้นล่าง 100 ใบ",
    image: "/images/boat/unicorn-night-exterior.jpg",
    capacity: "350 ท่าน",
  },
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
          src="/images/boat/unicorn-night-hero-gold.png"
          alt="เรือ Unicorn Cruise ล่องแม่น้ำเจ้าพระยายามค่ำคืน"
        />
        <div className="event-hero-copy">
          <h1>Concert on the River</h1>
          <p>คอนเสิร์ตบนเรือเจ้าพระยา</p>
          <span>
            ค่ำคืนแห่งเสียงดนตรี สายลม และสายน้ำ
            <br />
            บนเส้นทางที่สวยที่สุดของกรุงเทพฯ
          </span>
          <small>MUSIC MOVES THE RIVER</small>
        </div>
      </section>
      <section className="event-facts" aria-label="ข้อมูลการเดินทาง">
        <Fact icon={MapPin} label="ICONSIAM" value="ท่าเรือ ICONSIAM" />
        <Fact
          icon={Clock3}
          label={`ขึ้นเรือก่อน ${event.boarding}`}
          value="กรุณามาถึงก่อนเวลาที่กำหนด"
        />
        <Fact
          icon={ShipWheel}
          label={`ออกเรือ ${event.departure}`}
          value="เริ่มล่องตามกำหนดการ"
        />
        <Fact
          icon={Waves}
          label="ล่องเรือ 2 ชั่วโมง"
          value="สัมผัสบรรยากาศสองฝั่งพระยา"
        />
      </section>
      <section className="event-content">
        <article className="event-story">
          <span className="event-kicker">ABOUT THIS EVENT</span>
          <div className="event-heading-row">
            <h2>รายละเอียดงานแสดง</h2>
            <span>
              MORE THAN A CONCERT
              <br />A NIGHT ON THE RIVER
            </span>
          </div>
          <p>
            ดื่มด่ำกับดนตรี การแสดง
            และประสบการณ์สุดพิเศษบนเรือสำราญกลางแม่น้ำเจ้าพระยา
            ให้ทุกช่วงเวลาของค่ำคืนนี้ เป็นความทรงจำที่งดงาม
          </p>
          <h3>กำหนดการ (Rundown)</h3>
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
              <Utensils aria-hidden="true" />
              <p>
                <strong>อิ่มอร่อยกับบุฟเฟต์ดินเนอร์</strong>
                บริการอาหารบุฟเฟต์หลากหลายเมนู ตลอดการล่องเรือ
              </p>
            </div>
            <div>
              <Clock3 aria-hidden="true" />
              <p>
                <strong>เงื่อนไขการเข้าร่วมงาน</strong>
                หากไม่มาแสดงตัวภายในเวลาที่กำหนด ถือว่าสละสิทธิ์
                และไม่สามารถขอคืนบัตรได้
              </p>
            </div>
          </div>
          <span className="event-signoff">BANGKOK LIVES ON THE RIVER</span>
        </article>
        <aside className="ticket-picker">
          <h2>เลือกเรือ</h2>
          <p>เลือกเรือก่อนเข้าสู่ขั้นตอนเลือกโซนและบัตร</p>
          {bookingVessels.map((vessel) => (
            <button
              className="booking-vessel-card"
              key={vessel.id}
              onClick={() => onStartCheckout()}
            >
              <img src={vessel.image} alt="" />
              <span>
                <small>เรือที่เปิดให้จอง</small>
                <strong>{vessel.name}</strong>
                <em>{vessel.detail}</em>
                <b>
                  <UsersRound aria-hidden="true" size={14} /> {vessel.capacity}
                </b>
              </span>
              <ArrowRight aria-hidden="true" size={20} />
            </button>
          ))}
          <button className="gold-action" onClick={() => onStartCheckout()}>
            เลือกโซนและบัตร <ArrowRight aria-hidden="true" size={22} />
          </button>
          <small>ราคาเป็นข้อมูลชั่วคราว รอยืนยันก่อนเปิดขายจริง</small>
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
      <Icon aria-hidden="true" />
      <span>
        <strong>{label}</strong>
        {value}
      </span>
    </div>
  );
}
