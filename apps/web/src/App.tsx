import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import { ChevronDown, Search, X } from "lucide-react";
import EventDetail from "./EventDetail";
import BoatMap from "./BoatMap";
import BookingForm from "./BookingForm";
import MyBooking from "./MyBooking";
import Payment from "./Payment";
import BookingSuccess from "./BookingSuccess";
import TicketWallet from "./TicketWallet";
import ProfileMenu from "./ProfileMenu";
import Auth, { type AuthUser } from "./Auth";
import AdminDashboard from "./AdminDashboard";
import LanguageSwitcher from "./LanguageSwitcher";
import { copy, type Language } from "./i18n";
import { api, type Booking, type EventInfo } from "./api";

type Page =
  | "event"
  | "checkout"
  | "payment"
  | "success"
  | "orders"
  | "tickets"
  | "auth"
  | "dashboard";
const pagePaths: Record<Page, string> = {
  event: "/",
  checkout: "/checkout",
  payment: "/payment",
  success: "/success",
  orders: "/orders",
  tickets: "/tickets",
  auth: "/auth",
  dashboard: "/dashboard",
};
const pathPages: Record<string, Page> = Object.fromEntries(
  Object.entries(pagePaths).map(([page, path]) => [path, page as Page]),
) as Record<string, Page>;
const pageFromLocation = (): Page =>
  pathPages[window.location.pathname] ?? "event";
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
    role: sessionStorage.getItem("riverlife.profile.role") || "user",
  }));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem("riverlife.language") === "en" ? "en" : "th",
  );
  const [authDialogOpen, setAuthDialogOpen] = useState(
    () => pageFromLocation() === "auth",
  );
  const [continueCheckoutAfterLogin, setContinueCheckoutAfterLogin] =
    useState(false);
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
    document.documentElement.lang = language;
    localStorage.setItem("riverlife.language", language);
  }, [language]);
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
          role: user.role || "user",
        });
        sessionStorage.setItem(
          "riverlife.profile.name",
          user.name || "ผู้ใช้งาน River Life",
        );
        sessionStorage.setItem("riverlife.profile.email", user.email);
        sessionStorage.setItem("riverlife.profile.role", user.role || "user");
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
  const requireLoginForCheckout = () => {
    setContinueCheckoutAfterLogin(true);
    setAuthDialogOpen(true);
  };
  const openAuthDialog = () => setAuthDialogOpen(true);
  const closeAuthDialog = () => {
    setAuthDialogOpen(false);
    if (page === "auth") go("event");
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
    sessionStorage.removeItem("riverlife.profile.name");
    sessionStorage.removeItem("riverlife.profile.email");
    sessionStorage.removeItem("riverlife.profile.role");
    setProfile({
      name: "ผู้ใช้งาน River Life",
      email: "ยังไม่ได้เข้าสู่ระบบ",
      role: "user",
    });
    go("event");
  };
  const strings = copy[language];
  const nav =
    language === "en"
      ? ["Cruises", "Dining", "Events & Concerts", "About", "Plan Your Trip"]
      : [
          "ล่องเรือ",
          "อาหารบนเรือ",
          "อีเวนต์และคอนเสิร์ต",
          "เกี่ยวกับเรา",
          "วางแผนการเดินทาง",
        ];
  return (
    <>
      <header
        className={`market-header ${page === "event" ? "landing-header" : ""} ${page === "tickets" ? "market-header-dark" : ""}`}
      >
        <button
          className="river-brand"
          onClick={() => go("event")}
          aria-label="กลับไปหน้ารวมงาน"
        >
          <img src="/images/river-life-logo-v2.png" alt="" />
          <span>
            RIVER LIFE <small>MUSIC ON THE RIVER</small>
          </span>
        </button>
        <nav aria-label="เมนูหลัก">
          {profile.role === "admin" ? (
            <button className="active" onClick={() => go("dashboard")}>
              {strings.nav.dashboard}
            </button>
          ) : (
            nav.map((label) => (
              <button
                key={label}
                className={label === nav[0] ? "active" : ""}
                onClick={() => go("event")}
              >
                {label} <ChevronDown aria-hidden="true" size={15} />
              </button>
            ))
          )}
        </nav>
        <div className="market-tools" aria-label="เครื่องมือผู้ใช้">
          {page === "tickets" ? null : <Search aria-hidden="true" size={22} />}
          <LanguageSwitcher language={language} onChange={setLanguage} />
          <ProfileMenu
            isAuthenticated={isAuthenticated}
            name={profile.name}
            email={profile.email}
            onLogin={openAuthDialog}
            onNavigate={go}
            onLogout={logoutCustomer}
            language={language}
          />
        </div>
      </header>
      {event?.demo && <div className="demo-banner">{strings.demo}</div>}
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
          <EventDetail
            event={event}
            onStartCheckout={goCheckout}
            language={language}
          />
        )}
        {page === "checkout" && event && (
          <section className="checkout-page">
            <button className="back-link" onClick={() => go("event")}>
              ←{" "}
              {language === "en"
                ? "Back to concert details"
                : "กลับไปดูรายละเอียดคอนเสิร์ต"}
            </button>
            <Stepper activeStep={1} alternativeLabel className="checkout-steps">
              {strings.steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <div className="checkout-heading">
              <h1>{strings.checkoutTitle}</h1>
              <p>{strings.checkoutCopy}</p>
            </div>
            <div className="booking-layout">
              <BoatMap
                zones={event.zones}
                selected={zone}
                onSelect={setZone}
                language={language}
              />
              <BookingForm
                zones={event.zones}
                selected={zone}
                onSelect={setZone}
                onBooked={(data, accessToken) => {
                  rememberBooking(data, accessToken);
                  go("payment");
                }}
                isAuthenticated={isAuthenticated}
                onRequireLogin={requireLoginForCheckout}
                accountName={profile.name}
                accountEmail={profile.email}
                language={language}
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
        {page === "dashboard" && profile.role === "admin" && <AdminDashboard />}
        {page === "dashboard" && profile.role !== "admin" && (
          <Alert severity="error">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</Alert>
        )}
        {!event && !error && <p role="status">กำลังโหลดรอบการแสดง…</p>}
      </main>
      <Dialog
        open={authDialogOpen}
        onClose={closeAuthDialog}
        aria-labelledby="auth-dialog-title"
        className="auth-dialog"
        maxWidth="sm"
        fullWidth
      >
        <div className="auth-dialog-banner">
          <span id="auth-dialog-title">RIVER LIFE</span>
          <IconButton
            aria-label="ปิดหน้าต่างเข้าสู่ระบบ"
            onClick={closeAuthDialog}
            color="inherit"
          >
            <X aria-hidden="true" />
          </IconButton>
        </div>
        <Auth
          modal
          language={language}
          onAuthenticated={(user, source) => {
            setProfile({
              name: user.name || "ผู้ใช้งาน River Life",
              email: user.email,
              role: user.role || "user",
            });
            sessionStorage.setItem(
              "riverlife.profile.name",
              user.name || "ผู้ใช้งาน River Life",
            );
            sessionStorage.setItem("riverlife.profile.email", user.email);
            sessionStorage.setItem(
              "riverlife.profile.role",
              user.role || "user",
            );
            setIsAuthenticated(true);
            if (source !== "login") return;
            setAuthDialogOpen(false);
            const destination =
              user.role === "admin"
                ? "dashboard"
                : continueCheckoutAfterLogin
                  ? "checkout"
                  : page === "auth"
                    ? "event"
                    : page;
            setContinueCheckoutAfterLogin(false);
            go(destination);
          }}
        />
      </Dialog>
      <footer>
        <span className="footer-brand">RIVER LIFE</span>
        <span>เจ้าพระยา · คอนเสิร์ตบนเรือ</span>
        <span>ราคาและรายละเอียดงานรอยืนยัน</span>
      </footer>
    </>
  );
}
