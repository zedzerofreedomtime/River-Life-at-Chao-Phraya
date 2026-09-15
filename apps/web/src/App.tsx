import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import { CircleUserRound, Search } from "lucide-react";
import EventDetail from "./EventDetail";
import BoatMap from "./BoatMap";
import BookingForm from "./BookingForm";
import MyBooking from "./MyBooking";
import TicketWallet from "./TicketWallet";
import Admin from "./Admin";
import { api, type Booking, type EventInfo } from "./api";

type Page = "event" | "checkout" | "orders" | "tickets" | "admin";
const pagePaths: Record<Page, string> = {
  event: "/",
  checkout: "/checkout",
  orders: "/orders",
  tickets: "/tickets",
  admin: "/admin",
};
const pathPages: Record<string, Page> = Object.fromEntries(
  Object.entries(pagePaths).map(([page, path]) => [path, page as Page]),
) as Record<string, Page>;
const pageFromLocation = (): Page =>
  pathPages[window.location.pathname] ?? "event";
const nav: [Page, string][] = [
  ["event", "งานแสดง"],
  ["tickets", "บัตรของฉัน"],
  ["orders", "คำสั่งซื้อ"],
  ["admin", "เจ้าหน้าที่"],
];
const checkoutSteps = [
  "เลือกบัตร",
  "ข้อมูลผู้จอง",
  "ตรวจสลิป AI",
  "รับ QR Ticket",
];

export default function App() {
  const [page, setPage] = useState<Page>(pageFromLocation);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [error, setError] = useState("");
  const [zone, setZone] = useState("A");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [token, setToken] = useState("");
  const loadEvent = () =>
    api<EventInfo>("/event")
      .then((data) => {
        setEvent(data);
        setError("");
      })
      .catch(() =>
        setError("เชื่อมต่อระบบจองไม่ได้ กรุณาตรวจสอบว่า API พร้อมใช้งาน"),
      );
  useEffect(() => {
    void loadEvent();
  }, []);
  useEffect(() => {
    const handlePopState = () => setPage(pageFromLocation());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  const go = (next: Page) => {
    const nextPath = pagePaths[next];
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
    setPage(next);
    if (next === "event") void loadEvent();
  };
  const goCheckout = (preferredZone?: string) => {
    if (preferredZone) setZone(preferredZone);
    go("checkout");
  };
  return (
    <>
      <header
        className={`market-header ${page === "tickets" ? "market-header-dark" : ""}`}
      >
        <button
          className="river-brand"
          onClick={() => go("event")}
          aria-label="กลับไปหน้ารวมงาน"
        >
          RIVER LIFE <small>MUSIC ON THE RIVER</small>
        </button>
        <nav aria-label="เมนูหลัก">
          {nav.map(([key, label]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              onClick={() => go(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="market-tools" aria-label="เครื่องมือผู้ใช้">
          {page === "tickets" ? null : <Search aria-hidden="true" size={22} />}
          <button aria-label="บัตรของฉัน" onClick={() => go("tickets")}>
            <CircleUserRound aria-hidden="true" size={29} />
          </button>
        </div>
      </header>
      {event?.demo && (
        <div className="demo-banner">
          ระบบทดลอง · ราคาและโควตาเพื่อทดสอบเท่านั้น · วันงานรอยืนยัน ·
          ไม่รับชำระเงินจริง
        </div>
      )}
      <main className={`app-main page-${page}`}>
        {error && (
          <Alert
            severity="error"
            action={<Button onClick={() => void loadEvent()}>ลองใหม่</Button>}
          >
            {error}
          </Alert>
        )}
        {page === "event" && event && (
          <EventDetail event={event} onStartCheckout={goCheckout} />
        )}
        {page === "checkout" && event && (
          <section className="checkout-page">
            <button className="back-link" onClick={() => go("event")}>
              ← กลับไปดูรายละเอียดงาน
            </button>
            <Stepper activeStep={0} alternativeLabel className="checkout-steps">
              {checkoutSteps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <div className="checkout-heading">
              <h1>เลือกบัตร</h1>
              <p>เลือกโซน จำนวนบัตร และกรอกข้อมูลเพื่อสร้างคำสั่งซื้อ</p>
            </div>
            <div className="booking-layout">
              <BoatMap zones={event.zones} selected={zone} onSelect={setZone} />
              <BookingForm
                zones={event.zones}
                selected={zone}
                onSelect={setZone}
                onBooked={(data, accessToken) => {
                  setBooking(data);
                  setToken(accessToken);
                  sessionStorage.setItem("riverlife.booking.id", data.id);
                  sessionStorage.setItem(
                    "riverlife.booking.token",
                    accessToken,
                  );
                  go("orders");
                }}
              />
            </div>
          </section>
        )}
        {page === "orders" && (
          <MyBooking
            initial={booking}
            initialToken={token}
            onOpenTickets={(updated) => {
              if (updated) setBooking(updated);
              go("tickets");
            }}
          />
        )}
        {page === "tickets" && (
          <TicketWallet initial={booking} initialToken={token} />
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
