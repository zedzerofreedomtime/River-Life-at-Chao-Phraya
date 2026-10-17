import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import { X } from "lucide-react";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import ScrollToTop from "./components/shared/ScrollToTop";
import ScrollReveal from "./components/shared/ScrollReveal";
import EventDetail from "./components/page/EventDetail";
import Home from "./components/page/Home";
import BoatMap from "./components/booking/BoatMap";
import BookingForm from "./components/booking/BookingForm";
import MyBooking from "./components/page/MyBooking";
import Payment, { FlowSteps } from "./components/page/Payment";
import BookingSuccess from "./components/page/BookingSuccess";
import TicketWallet from "./components/page/TicketWallet";
import Auth, { type AuthUser } from "./components/shared/Auth";
import AdminDashboard from "./components/page/AdminDashboard";
import { copy, type Language } from "./data/i18n";
import { api, formatPier, type Booking, type EventInfo } from "./data/api";
import Help from "./components/page/Help";
import type { HelpTopic } from "./data/help";
import { pagePaths, pageFromPath, helpFromPath, type Page, type NavigationMenu } from "./data/navigation";
import { generateMetadata, applyMetadata } from "./data/metadata";

const pageFromLocation = (): Page =>
  pageFromPath(window.location.pathname);
const helpFromLocation = (): HelpTopic => helpFromPath(window.location.pathname);
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
  const [helpTopic, setHelpTopic] = useState<HelpTopic>(helpFromLocation);
  const [openNavigationMenu, setOpenNavigationMenu] = useState<NavigationMenu>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigationRef = useRef<HTMLElement>(null);
  const loadEvent = () =>
    api<EventInfo>("/event")
      .then((data) => {
        setEvent(data);
        setError("");
      })
      .catch(() =>
        setError(language === "en" ? "Unable to connect to bookings. Please check that the service is available." : "เชื่อมต่อระบบจองไม่ได้ กรุณาตรวจสอบว่า API พร้อมใช้งาน"),
      );
  useEffect(() => {
    void loadEvent();
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem("riverlife.language", language);
    const metadata = generateMetadata({
      page,
      language,
      event,
      helpTopic: page === "help" ? helpTopic : undefined,
    });
    applyMetadata(metadata);
  }, [page, language, event, helpTopic]);
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
    const handlePopState = () => {
      setPage(pageFromLocation());
      setHelpTopic(helpFromLocation());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  useEffect(() => {
    if (!openNavigationMenu) return;
    const closeMenu = (event: MouseEvent) => {
      if (!navigationRef.current?.contains(event.target as Node)) {
        setOpenNavigationMenu(null);
      }
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [openNavigationMenu]);
  const go = (next: Page) => {
    const nextPath = pagePaths[next];
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
    setPage(next);
    if (page !== next) window.scrollTo(0, 0);
    setMobileMenuOpen(false);
    setOpenNavigationMenu(null);
    if (next === "home" || next === "event") void loadEvent();
  };
  const goCheckout = (preferredZone?: string) => {
    if (preferredZone) setZone(preferredZone);
    go("checkout");
  };
  const goHelp = (topic: HelpTopic) => {
    window.history.pushState(null, "", `/help/${topic}`);
    setHelpTopic(topic);
    setPage("help");
    window.scrollTo(0, 0);
    setMobileMenuOpen(false);
    setOpenNavigationMenu(null);
  };
  const requireLoginForCheckout = () => {
    setContinueCheckoutAfterLogin(true);
    setAuthDialogOpen(true);
  };
  const openAuthDialog = () => setAuthDialogOpen(true);
  const closeAuthDialog = () => {
    setAuthDialogOpen(false);
    setContinueCheckoutAfterLogin(false);
    if (page === "auth") go("home");
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
    go("home");
  };
  const strings = copy[language];
  const en = language === "en";
  return (
    <>
      <Header 
        page={page} 
        language={language} 
        setLanguage={setLanguage} 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen}
        openNavigationMenu={openNavigationMenu}
        setOpenNavigationMenu={setOpenNavigationMenu}
        profile={profile}
        isAuthenticated={isAuthenticated}
        go={go}
        goHelp={goHelp}
        openAuthDialog={openAuthDialog}
        logoutCustomer={logoutCustomer}
        navigationRef={navigationRef}
      />
      
      <main className={`app-main page-${page}`}>
        {error && (
          <Alert
            severity="error"
            action={<Button onClick={() => void loadEvent()}>{en ? "Try again" : "ลองใหม่"}</Button>}
          >
            {error}
          </Alert>
        )}
        {page === "event" && event && (
          <EventDetail
            event={event}
            onStartCheckout={() => {
              if (isAuthenticated) {
                goCheckout();
                return;
              }
              requireLoginForCheckout();
            }}
            language={language}
          />
        )}
        {page === "home" && event && (
          <Home
            event={event}
            language={language}
            onOpenConcert={() => go("event")}
            onOpenContact={() => goHelp("contact")}
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
            <FlowSteps activeStep={1} language={language} />
            <div className="checkout-heading">
              <h1>{strings.checkoutTitle}</h1>
              <p>{strings.checkoutCopy}</p>
            </div>
            <div className="booking-layout">
              <BoatMap
                zones={event.zones}
                selected={zone}
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
                demo={event.demo}
              />
            </div>
          </section>
        )}
        {page === "payment" && (
          <Payment
            language={language}
            demo={event?.demo ?? false}
            initial={booking}
            initialToken={token}
            onCompleted={(updated: Booking) => {
              setBooking(updated);
              go("success");
            }}
            onBackToZones={() => go("checkout")}
          />
        )}
        {page === "success" && (
          <BookingSuccess
            language={language}
            demo={event?.demo ?? false}
            initial={booking}
            initialToken={token}
            onOpenTickets={(updated?: Booking) => {
              if (updated) setBooking(updated);
              go("tickets");
            }}
            onOpenOrders={() => go("orders")}
          />
        )}
        {page === "orders" && (
          <MyBooking
            key={isAuthenticated ? "account" : "guest"}
            isAuthenticated={isAuthenticated}
            onLogin={openAuthDialog}
            onAccess={rememberBooking}
            language={language}
            demo={event?.demo ?? false}
            initial={booking}
            initialToken={token}
            onPay={(updated: Booking) => {
              setBooking(updated);
              go("payment");
            }}
            onOpenTickets={(updated?: Booking) => {
              if (updated) setBooking(updated);
              go("tickets");
            }}
          />
        )}
        {page === "tickets" && (
          <TicketWallet key={isAuthenticated ? "account" : "guest"} onOpenOrders={() => go("orders")} initial={booking} initialToken={token} language={language} demo={event?.demo ?? false} boardingPier={event ? formatPier(event.pier, event.pier_number, language) : ""} />
        )}
        {page === "dashboard" && profile.role === "admin" && <AdminDashboard language={language} />}
        {page === "dashboard" && profile.role !== "admin" && (
          <Alert severity="error">{en ? "This page is for administrators only." : "หน้านี้สำหรับผู้ดูแลระบบเท่านั้น"}</Alert>
        )}
        {page === "help" && <Help topic={helpTopic} language={language} onSelect={goHelp} demo={event?.demo ?? true} />}
        {!event && !error && <p role="status">{en ? "Loading event…" : "กำลังโหลดรอบการแสดง…"}</p>}
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
            aria-label={en ? "Close login dialog" : "ปิดหน้าต่างเข้าสู่ระบบ"}
            onClick={closeAuthDialog}
            color="inherit"
          >
            <X aria-hidden="true" />
          </IconButton>
        </div>
        <Auth
          modal
          language={language}
          onAuthenticated={(user) => {
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
            setAuthDialogOpen(false);
            const destination =
              user.role === "admin"
                ? "dashboard"
                : continueCheckoutAfterLogin
                  ? "checkout"
                  : page === "auth"
                    ? "home"
                    : page;
            setContinueCheckoutAfterLogin(false);
            go(destination);
          }}
        />
      </Dialog>
      <ScrollToTop />
      <ScrollReveal />
      <Footer language={language} />
    </>
  );
}
