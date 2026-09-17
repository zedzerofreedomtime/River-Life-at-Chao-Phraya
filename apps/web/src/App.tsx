import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import { Search } from "lucide-react";
import EventDetail from "./EventDetail";
import BoatMap from "./BoatMap";
import BookingForm from "./BookingForm";
import MyBooking from "./MyBooking";
import Payment from "./Payment";
import BookingSuccess from "./BookingSuccess";
import TicketWallet from "./TicketWallet";
import Admin from "./Admin";
import ProfileMenu from "./ProfileMenu";
import Auth, { type AuthUser } from "./Auth";
import { api, type Booking, type EventInfo } from "./api";

type Page =
  | "event"
  | "checkout"
  | "payment"
  | "success"
  | "orders"
  | "tickets"
  | "admin"
  | "auth";
const pagePaths: Record<Page, string> = {
  event: "/",
  checkout: "/checkout",
  payment: "/payment",
  success: "/success",
  orders: "/orders",
  tickets: "/tickets",
  admin: "/admin",
  auth: "/auth",
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
const checkoutSteps = ["เลือกเรือ", "เลือกโซน", "ชำระเงิน", "ทำรายการสำเร็จ"];

export default function App() {
  const [page, setPage] = useState<Page>(pageFromLocation);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [error, setError] = useState("");
  const [zone, setZone] = useState("A");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState(() => ({
    name:
      sessionStorage.getItem("riverlife.profile.name") ||
      "ผู้ใช้งาน River Life",
    email:
      sessionStorage.getItem("riverlife.profile.email") ||
      "ยังไม่ได้เข้าสู่ระบบ",
  }));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
    void api<AuthUser>("/auth/me")
      .then((user) => {
        if (!user.authenticated) {
          setIsAuthenticated(false);
          return;
        }
        setProfile({
          name: user.name || "ผู้ใช้งาน River Life",
          email: user.email,
        });
        setIsAuthenticated(true);
      })
      .catch(() => setIsAuthenticated(false));
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
  const rememberBooking = (data: Booking, accessToken: string) => {
    setBooking(data);
    setToken(accessToken);
    sessionStorage.setItem("riverlife.booking.id", data.id);
    sessionStorage.setItem("riverlife.booking.token", accessToken);
  };
  const logoutCustomer = () => {
    sessionStorage.removeItem("riverlife.booking.id");
    sessionStorage.removeItem("riverlife.booking.token");
    setBooking(null);
    setToken("");
    void api<void>("/auth/logout", { method: "POST" }).catch(() => undefined);
    setIsAuthenticated(false);
    setProfile({ name: "ผู้ใช้งาน River Life", email: "ยังไม่ได้เข้าสู่ระบบ" });
    go("event");
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
          <img src="/images/river-life-logo.jpg" alt="" />
          <span>
            RIVER LIFE <small>MUSIC ON THE RIVER</small>
          </span>
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
          <ProfileMenu
            isAuthenticated={isAuthenticated}
            name={profile.name}
            email={profile.email}
            onLogin={() => go("auth")}
            onNavigate={go}
            onLogout={logoutCustomer}
          />
        </div>
      </header>
      {event?.demo && (
        <div className="demo-banner">
          ระบบทดลอง · ราคาและโควตาเพื่อทดสอบเท่านั้น · วันงานรอยืนยัน · QR
          Ticket สำหรับทดสอบ
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
        {page === "auth" && (
          <Auth
            onAuthenticated={(user, source) => {
              setProfile({
                name: user.name || "ผู้ใช้งาน River Life",
                email: user.email,
              });
              setIsAuthenticated(true);
              if (source === "login") go("event");
            }}
          />
        )}
        {page === "checkout" && event && (
          <section className="checkout-page">
            <button className="back-link" onClick={() => go("event")}>
              ← กลับไปดูรายละเอียดเรือ
            </button>
            <Stepper activeStep={1} alternativeLabel className="checkout-steps">
              {checkoutSteps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <div className="checkout-heading">
              <h1>เลือกโซนและจำนวนบัตร</h1>
              <p>เลือกพื้นที่บนเรือและกรอกข้อมูล ก่อนเข้าสู่หน้าชำระเงิน</p>
            </div>
            <div className="booking-layout">
              <BoatMap zones={event.zones} selected={zone} onSelect={setZone} />
              <BookingForm
                zones={event.zones}
                selected={zone}
                onSelect={setZone}
                onBooked={(data, accessToken) => {
                  rememberBooking(data, accessToken);
                  go("payment");
                }}
              />
            </div>
          </section>
        )}
        {page === "payment" && (
          <Payment
            initial={booking}
            initialToken={token}
            onCompleted={(updated) => {
              setBooking(updated);
              go("success");
            }}
            onBackToZones={() => go("checkout")}
          />
        )}
        {page === "success" && (
          <BookingSuccess
            initial={booking}
            initialToken={token}
            onOpenTickets={(updated) => {
              setBooking(updated);
              go("tickets");
            }}
            onOpenOrders={() => go("orders")}
          />
        )}
        {page === "orders" && (
          <MyBooking
            initial={booking}
            initialToken={token}
            onPay={(updated) => {
              setBooking(updated);
              go("payment");
            }}
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
