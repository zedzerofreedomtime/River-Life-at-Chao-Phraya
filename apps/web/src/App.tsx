import AdminManagement from "./components/staff/AdminManagement";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import { X } from "lucide-react";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import ScrollToTop from "./components/shared/ScrollToTop";
import ScrollReveal from "./components/shared/ScrollReveal";
import PageLoading from "./components/shared/PageLoading";
import Home from "./components/page/Home";
import EventDetail from "./components/page/EventDetail";
import CruiseAdmin from "./components/cruise/CruiseAdmin";
import {
  CruisePayments,
  CruiseCheckIn,
} from "./components/cruise/CruiseOperations";
import CruiseOrders from "./components/cruise/CruiseOrders";
import GettingThere from "./components/page/GettingThere";
import MyBooking from "./components/page/MyBooking";
import Payment from "./components/page/Payment";
import BookingSuccess from "./components/page/BookingSuccess";
import TicketWallet from "./components/page/TicketWallet";
import Auth, { type AuthUser } from "./components/shared/Auth";
import AdminDashboard from "./components/page/AdminDashboard";
import SalesDashboard from "./components/page/SalesDashboard";
import OperatorDashboard from "./components/page/OperatorDashboard";
import {
  CruiseProgrammeContext,
  defaultProgramme,
} from "./components/shared/CruiseProgramme";
import type { Language } from "./data/i18n";
import { api, formatPier, type Booking, type EventInfo } from "./data/api";
import Help from "./components/page/Help";
const CruiseSalesDashboard = lazy(
  () => import("./components/cruise/CruiseSalesDashboard"),
);
import type { HelpTopic } from "./data/help";
import {
  pagePaths,
  pageFromPath,
  helpFromPath,
  staffHome,
  type Page,
  type NavigationMenu,
} from "./data/navigation";
import { generateMetadata, applyMetadata } from "./data/metadata";

const BookingPreview = lazy(() => import("./components/cruise/BookingPreview"));
const LiveCruiseBooking = lazy(
  () => import("./components/cruise/LiveCruiseBooking"),
);
const pageFromLocation = (): Page => pageFromPath(window.location.pathname);
const helpFromLocation = (): HelpTopic =>
  helpFromPath(window.location.pathname);
export default function App() {
  const [page, setPage] = useState<Page>(pageFromLocation);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [error, setError] = useState("");
  const [eventLoading, setEventLoading] = useState(true);
  const eventRequests = useRef(0);
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
  const [authReady, setAuthReady] = useState(false);
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem("riverlife.language") === "en" ? "en" : "th",
  );
  const [authDialogOpen, setAuthDialogOpen] = useState(
    () => pageFromLocation() === "auth",
  );
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [helpTopic, setHelpTopic] = useState<HelpTopic>(helpFromLocation);
  const [openNavigationMenu, setOpenNavigationMenu] =
    useState<NavigationMenu>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigationRef = useRef<HTMLElement>(null);
  const loadEvent = () => {
    eventRequests.current += 1;
    setEventLoading(true);
    return api<EventInfo>("/event")
      .then((data) => {
        setEvent(data);
        setError("");
      })
      .catch(() =>
        setError(
          language === "en"
            ? "Unable to connect to bookings. Please check that the service is available."
            : "เชื่อมต่อระบบจองไม่ได้ กรุณาตรวจสอบว่า API พร้อมใช้งาน",
        ),
      )
      .finally(() => {
        eventRequests.current -= 1;
        setEventLoading(eventRequests.current > 0);
      });
  };
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
      .catch(() => setIsAuthenticated(false))
      .finally(() => setAuthReady(true));
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
    if (page !== "checkout" && page !== "tablePreview") return;
    window.history.replaceState(
      null,
      "",
      pagePaths.booking + window.location.search,
    );
    setPage("booking");
  }, [page]);
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
    if (window.location.pathname !== nextPath || window.location.search) {
      window.history.pushState(null, "", nextPath);
    }
    setPage(next);
    if (page !== next) window.scrollTo(0, 0);
    setMobileMenuOpen(false);
    setOpenNavigationMenu(null);
    if (next === "home" || next === "event") void loadEvent();
  };
  const goHelp = (topic: HelpTopic) => {
    window.history.pushState(null, "", `/help/${topic}`);
    setHelpTopic(topic);
    setPage("help");
    window.scrollTo(0, 0);
    setMobileMenuOpen(false);
    setOpenNavigationMenu(null);
  };
  const openAuthDialog = () => setAuthDialogOpen(true);
  const closeAuthDialog = () => {
    setAuthDialogOpen(false);
    if (page === "auth") go("home");
  };
  const rememberBooking = (data: Booking, accessToken: string) => {
    setBooking(data);
    setToken(accessToken);
    sessionStorage.setItem("riverlife.booking.id", data.id);
    sessionStorage.setItem("riverlife.booking.token", accessToken);
  };
  const requestLogout = () => {
    setLogoutError("");
    setLogoutDialogOpen(true);
  };
  const closeLogoutDialog = () => {
    if (!logoutBusy) setLogoutDialogOpen(false);
  };
  const logoutCustomer = async () => {
    if (logoutBusy) return;
    setLogoutBusy(true);
    setLogoutError("");
    try {
      await api<void>("/auth/logout", { method: "POST" });
      sessionStorage.removeItem("riverlife.booking.id");
      sessionStorage.removeItem("riverlife.booking.token");
      setBooking(null);
      setToken("");
      setIsAuthenticated(false);
      sessionStorage.removeItem("riverlife.profile.name");
      sessionStorage.removeItem("riverlife.profile.email");
      sessionStorage.removeItem("riverlife.profile.role");
      setProfile({
        name: "ผู้ใช้งาน River Life",
        email: "ยังไม่ได้เข้าสู่ระบบ",
        role: "user",
      });
      setLogoutDialogOpen(false);
      go("home");
    } catch {
      setLogoutError(
        language === "en"
          ? "Unable to log out. Please try again."
          : "ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง",
      );
    } finally {
      setLogoutBusy(false);
    }
  };
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
        logoutCustomer={requestLogout}
        navigationRef={navigationRef}
      />
      <main className={`app-main page-${page}`}>
        {error && (
          <Alert
            severity="error"
            action={
              <Button onClick={() => void loadEvent()}>
                {en ? "Try again" : "ลองใหม่"}
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        {page === "event" && event && (
          <EventDetail
            event={event}
            onStartCheckout={() => go("booking")}
            language={language}
          />
        )}
        {page === "bookingPreview" && (
          <Suspense
            fallback={
              <p role="status">
                {en ? "Loading booking preview…" : "กำลังโหลดหน้าทดลองจอง…"}
              </p>
            }
          >
            <BookingPreview language={language} onBack={() => go("event")} />
          </Suspense>
        )}
        {(page === "booking" ||
          page === "checkout" ||
          page === "tablePreview") && (
          <Suspense
            fallback={
              <p role="status">
                {en ? "Loading bookings…" : "กำลังโหลดระบบจอง…"}
              </p>
            }
          >
            <LiveCruiseBooking
              language={language}
              authenticated={isAuthenticated}
              accountName={isAuthenticated ? profile.name : ""}
              onLogin={openAuthDialog}
              onOrders={() => go("orders")}
              onContact={() => goHelp("contact")}
              onBack={() => go("event")}
            />
          </Suspense>
        )}
        {page === "home" && event && (
          <Home
            event={event}
            language={language}
            onOpenConcert={() => go("event")}
          />
        )}
        {page === "gettingThere" && (
          <GettingThere
            language={language}
            onContact={() => goHelp("contact")}
          />
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
          <>
            {isAuthenticated && <CruiseOrders language={language} />}
            <details
              className="legacy-booking"
              open={!isAuthenticated || !!booking}
            >
              <summary>
                {en
                  ? "Earlier bookings / demo system"
                  : "รายการระบบเดิม / ระบบสาธิต"}
              </summary>
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
            </details>
          </>
        )}
        {page === "dashboard" &&
          isAuthenticated &&
          ["admin", "owner"].includes(profile.role) && (
            <>
              <CruiseAdmin language={language} />
              <AdminManagement
                language={language}
                role={profile.role}
                currentEmail={profile.email}
              />
              <CruisePayments language={language} />
            </>
          )}
        {page === "tickets" && (
          <CruiseProgrammeContext.Provider value={event ?? defaultProgramme}>
            {isAuthenticated && <CruiseOrders language={language} />}
            <details
              className="legacy-booking"
              open={!isAuthenticated || !!booking}
            >
              <summary>
                {en
                  ? "Earlier tickets / demo system"
                  : "ตั๋วระบบเดิม / ระบบสาธิต"}
              </summary>
              <TicketWallet
                onOpenHelp={() => goHelp("tickets")}
                key={isAuthenticated ? "account" : "guest"}
                onOpenOrders={() => go("orders")}
                initial={booking}
                initialToken={token}
                language={language}
                demo={event?.demo ?? false}
                boardingPier={
                  event
                    ? formatPier(event.pier, event.pier_number, language)
                    : ""
                }
              />
            </details>
          </CruiseProgrammeContext.Provider>
        )}
        {page === "dashboard" &&
          isAuthenticated &&
          ["admin", "owner"].includes(profile.role) && (
            <details className="legacy-booking">
              <summary>
                {en ? "Legacy event administration" : "จัดการโปรแกรมสาธิตเดิม"}
              </summary>
              <AdminDashboard
                language={language}
                currentEmail={profile.email}
                onSettingsUpdated={() => void loadEvent()}
              />
            </details>
          )}
        {page === "sales" &&
          isAuthenticated &&
          ["sales", "admin", "owner"].includes(profile.role) && (
            <>
              <Suspense
                fallback={
                  <p role="status">
                    {en ? "Loading sales…" : "กำลังโหลดฝ่ายขาย…"}
                  </p>
                }
              >
                <CruiseSalesDashboard language={language} />
              </Suspense>
              <details className="legacy-booking">
                <summary>
                  {en ? "Previous zone reservations" : "รายการจองโซนเดิม"}
                </summary>{" "}
                <SalesDashboard
                  language={language}
                  onOpen={(b, t, destination) => {
                    rememberBooking(b, t);
                    go(destination);
                  }}
                />
              </details>
            </>
          )}
        {page === "operator" &&
          isAuthenticated &&
          ["operator", "admin", "owner"].includes(profile.role) && (
            <>
              <CruiseCheckIn language={language} />
              <details className="legacy-booking">
                <summary>
                  {en
                    ? "Legacy / demo ticket check-in"
                    : "เช็กอินตั๋วระบบเดิม / สาธิต"}
                </summary>
                <OperatorDashboard language={language} />
              </details>
            </>
          )}
        {["dashboard", "sales", "operator"].includes(page) && !authReady && (
          <p role="status">
            {en ? "Checking staff access…" : "กำลังตรวจสอบสิทธิ์พนักงาน…"}
          </p>
        )}
        {authReady &&
          ((page === "dashboard" &&
            (!isAuthenticated || !["admin", "owner"].includes(profile.role))) ||
            (page === "sales" &&
              (!isAuthenticated ||
                !["sales", "admin", "owner"].includes(profile.role))) ||
            (page === "operator" &&
              (!isAuthenticated ||
                !["operator", "admin", "owner"].includes(profile.role)))) && (
            <Alert severity="error">
              {en
                ? "You do not have access to this staff workspace."
                : "บัญชีนี้ไม่มีสิทธิ์เข้าถึงพื้นที่ทำงานนี้"}
            </Alert>
          )}
        {page === "help" && (
          <Help
            topic={helpTopic}
            language={language}
            onSelect={goHelp}
            demo={event?.demo ?? true}
          />
        )}
        {!event && !error && (
          <p role="status">{en ? "Loading event…" : "กำลังโหลดรอบการแสดง…"}</p>
        )}
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
              staffHome(user.role ?? "user") ??
              (page === "auth" ? "home" : page);
            go(destination);
          }}
        />
      </Dialog>
      <Dialog
        open={logoutDialogOpen}
        onClose={closeLogoutDialog}
        disableEscapeKeyDown={logoutBusy}
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
        slotProps={{ paper: { role: "alertdialog", "aria-busy": logoutBusy } }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle id="logout-dialog-title">
          {en ? "Log out" : "ออกจากระบบ"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-dialog-description" aria-live="polite">
            {logoutBusy
              ? en
                ? "Logging out. Please wait…"
                : "กำลังออกจากระบบ กรุณารอสักครู่…"
              : en
                ? "Do you want to log out?"
                : "คุณต้องการออกจากระบบหรือไม่?"}
          </DialogContentText>
          {logoutError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {logoutError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={closeLogoutDialog}
            disabled={logoutBusy}
            autoFocus
          >
            {en ? "Cancel" : "ยกเลิก"}
          </Button>
          <Button
            variant="contained"
            onClick={() => void logoutCustomer()}
            disabled={logoutBusy}
            sx={{
              "&&.Mui-disabled": { color: "#080e19 !important" },
            }}
            startIcon={
              logoutBusy ? (
                <CircularProgress
                  size={18}
                  color="inherit"
                  aria-hidden="true"
                />
              ) : undefined
            }
          >
            {logoutBusy
              ? en
                ? "Logging out…"
                : "กำลังออกจากระบบ…"
              : en
                ? "OK"
                : "ตกลง"}
          </Button>
        </DialogActions>
      </Dialog>
      <ScrollToTop />
      <PageLoading
        route={`${page}:${page === "help" ? helpTopic : ""}`}
        busy={
          eventLoading ||
          (["dashboard", "sales", "operator"].includes(page) && !authReady)
        }
        language={language}
      />
      <ScrollReveal />
      <Footer language={language} />
    </>
  );
}
