import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import { MapPin, Clock, Ship, Hourglass } from "lucide-react";
import { api, type Booking, type EventInfo } from "./api";
import BoatMap from "./BoatMap";
import BookingForm from "./BookingForm";
import MyBooking from "./MyBooking";
import Admin from "./Admin";
export default function App() {
  const [page, setPage] = useState("book"),
    [event, setEvent] = useState<EventInfo | null>(null),
    [error, setError] = useState(""),
    [zone, setZone] = useState("A"),
    [booking, setBooking] = useState<Booking | null>(null),
    [token, setToken] = useState("");
  const load = () =>
    api<EventInfo>("/event")
      .then((e) => {
        setEvent(e);
        setError("");
      })
      .catch(() =>
        setError("เชื่อมต่อระบบจองไม่ได้ กรุณาตรวจสอบว่า API พร้อมใช้งาน"),
      );
  useEffect(() => {
    void load();
  }, []);
  return (
    <>
      <header className="site-header">
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            setPage("book");
          }}
        >
          RIVER LIFE<small>MUSIC ON THE RIVER</small>
        </a>
        <nav aria-label="เมนูหลัก">
          {[
            ["book", "จองบัตร"],
            ["mine", "การจองของฉัน"],
            ["admin", "เจ้าหน้าที่"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              onClick={() => {
                setPage(key);
                if (key === "book") void load();
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <section className="title-band">
        <div>
          <h1>Concert on the River</h1>
          <p>คอนเสิร์ตบนเรือเจ้าพระยา</p>
        </div>
        <span>ดนตรี สายน้ำ ความทรงจำ</span>
      </section>
      <main>
        {event?.demo && (
          <div className="demo-note">
            ระบบทดลอง • ราคาและโควตาเพื่อทดสอบเท่านั้น • วันงานรอยืนยัน •
            ไม่รับชำระเงินจริง
          </div>
        )}
        {error && (
          <Alert
            severity="error"
            action={<Button onClick={() => void load()}>ลองใหม่</Button>}
          >
            {error}
          </Alert>
        )}
        {page === "book" && event && (
          <>
            <Stepper activeStep={0} alternativeLabel className="booking-steps">
              {["เลือกบัตร", "ข้อมูลผู้จอง", "ชำระเงิน", "รับบัตร"].map(
                (label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ),
              )}
            </Stepper>
            <div className="booking-layout">
              <BoatMap zones={event.zones} selected={zone} onSelect={setZone} />
              <BookingForm
                zones={event.zones}
                selected={zone}
                onSelect={setZone}
                onBooked={(b, t) => {
                  setBooking(b);
                  setToken(t);
                  sessionStorage.setItem("riverlife.booking.id", b.id);
                  sessionStorage.setItem("riverlife.booking.token", t);
                  setPage("mine");
                }}
              />
            </div>
            <div className="trip-strip">
              {[
                [MapPin, "จุดขึ้นเรือ", event.pier],
                [Clock, "ขึ้นเรือให้ครบก่อน", event.boarding + " น."],
                [Ship, "เวลาเรือออก", event.departure + " น."],
                [Hourglass, "ระยะเวลาล่องเรือ", "2 ชั่วโมง"],
              ].map(([Icon, label, value]) => {
                const C = Icon as typeof MapPin;
                return (
                  <div key={String(label)}>
                    <C size={28} />
                    <span>
                      {String(label)}
                      <strong>{String(value)}</strong>
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {page === "mine" && (
          <MyBooking initial={booking} initialToken={token} />
        )}
        {page === "admin" && <Admin />}
        {!event && !error && <p role="status">กำลังโหลดรอบการแสดง…</p>}
      </main>
      <footer>
        <span className="footer-brand">RIVER LIFE</span>
        <span>เจ้าพระยา · คอนเสิร์ตบนเรือ</span>
        <span>ราคาและรายละเอียดงานรอยืนยัน</span>
      </footer>
    </>
  );
}
