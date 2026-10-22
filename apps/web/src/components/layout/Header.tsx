import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import Drawer from "@mui/material/Drawer";
import useMediaQuery from "@mui/material/useMediaQuery";
import "../../Header.css";
import { Menu, X } from "lucide-react";
import type { Language } from "../../data/i18n";
import { copy } from "../../data/i18n";
import type { HelpTopic } from "../../data/help";
import type { NavigationMenu, Page } from "../../data/navigation";
import LanguageSwitcher from "../shared/LanguageSwitcher";
import ProfileMenu from "../shared/ProfileMenu";

type HeaderProps = {
  page: Page;
  language: Language;
  setLanguage: (language: Language) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  openNavigationMenu: NavigationMenu;
  setOpenNavigationMenu: Dispatch<SetStateAction<NavigationMenu>>;
  profile: { name: string; email: string; role: string };
  isAuthenticated: boolean;
  go: (page: Page) => void;
  goHelp: (topic: HelpTopic) => void;
  openAuthDialog: () => void;
  logoutCustomer: () => void;
  navigationRef: RefObject<HTMLElement | null>;
};

function NavigationSurface({
  mobile,
  open,
  onClose,
  en,
  children,
}: {
  mobile: boolean;
  open: boolean;
  onClose: () => void;
  en: boolean;
  children: ReactNode;
}) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  if (!mobile) return children;
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      transitionDuration={reduced ? 0 : { enter: 320, exit: 240 }}
      slotProps={{
        paper: {
          className: "river-mobile-drawer",
          role: "dialog",
          "aria-modal": true,
          "aria-label": en ? "Main menu" : "เมนูหลัก",
        },
      }}
    >
      <div className="river-drawer-heading">
        <span>RIVER LIFE</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={en ? "Close menu" : "ปิดเมนู"}
        >
          <X size={22} />
        </button>
      </div>
      {children}
    </Drawer>
  );
}

export default function Header({
  page,
  language,
  setLanguage,
  mobileMenuOpen,
  setMobileMenuOpen,
  setOpenNavigationMenu,
  profile,
  isAuthenticated,
  go,
  goHelp,
  openAuthDialog,
  logoutCustomer,
  navigationRef,
}: HeaderProps) {
  const en = language === "en";
  const mobile = useMediaQuery("(max-width:1024px)");
  const strings = copy[language];
  const displayName =
    profile.name === "ผู้ใช้งาน River Life" && en
      ? "River Life user"
      : profile.name;
  const displayEmail =
    profile.email === "ยังไม่ได้เข้าสู่ระบบ" && en
      ? "Not logged in"
      : profile.email;

  return (
    <header
      className={`market-header cinema-header ${page === "home" ? "cinema-header-home" : ""}`}
    >
      <button
        className="river-brand"
        onClick={() => go("home")}
        aria-label={en ? "Back to cruise homepage" : "กลับไปหน้าจองล่องเรือ"}
      >
        <span>
          <strong className="text-white font-bold tracking-wider">
            RIVER LIFE
          </strong>
          <small className="river-brand-caption font-semibold tracking-widest text-[9px]">
            CHAO PHRAYA CRUISES
          </small>
        </span>
      </button>
      <button
        className="mobile-nav-toggle"
        type="button"
        aria-label={
          en
            ? mobileMenuOpen
              ? "Close menu"
              : "Open menu"
            : mobileMenuOpen
              ? "ปิดเมนู"
              : "เปิดเมนู"
        }
        aria-expanded={mobileMenuOpen}
        aria-controls="ticket-main-nav"
        onClick={() => setMobileMenuOpen((current) => !current)}
      >
        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <NavigationSurface
        mobile={mobile}
        open={mobileMenuOpen}
        en={en}
        onClose={() => {
          setMobileMenuOpen(false);
          setOpenNavigationMenu(null);
        }}
      >
        <nav
          id="ticket-main-nav"
          ref={navigationRef}
          className={`ticket-nav ${mobileMenuOpen ? "is-open" : ""}`}
          aria-label={en ? "Main menu" : "เมนูหลัก"}
        >
          {isAuthenticated &&
          ["admin", "sales", "operator"].includes(profile.role) ? (
            <>
              {profile.role === "admin" && (
                <button
                  className="active"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    go("dashboard");
                  }}
                >
                  {strings.nav.dashboard}
                </button>
              )}
              {["sales", "admin"].includes(profile.role) && (
                <button
                  className={page === "sales" ? "active" : ""}
                  onClick={() => go("sales")}
                >
                  {en ? "Sales" : "ฝ่ายขาย"}
                </button>
              )}
              {["operator", "admin"].includes(profile.role) && (
                <button
                  className={page === "operator" ? "active" : ""}
                  onClick={() => go("operator")}
                >
                  {en ? "Boarding" : "เช็กอิน"}
                </button>
              )}
              <button onClick={() => go("home")}>
                {en ? "Customer website" : "หน้าเว็บไซต์ลูกค้า"}
              </button>
            </>
          ) : (
            <>
              <button
                className={page === "home" ? "active" : ""}
                onClick={() => {
                  setOpenNavigationMenu(null);
                  setMobileMenuOpen(false);
                  go("home");
                }}
              >
                {en ? "Home" : "หน้าแรก"}
              </button>
              <button
                className={page === "event" ? "active" : ""}
                onClick={() => {
                  setMobileMenuOpen(false);
                  go("event");
                }}
              >
                {en ? "Cruise & book" : "รอบล่องเรือและจอง"}
              </button>
              <button
                className={page === "help" ? "active" : ""}
                onClick={() => {
                  setOpenNavigationMenu(null);
                  setMobileMenuOpen(false);
                  goHelp("contact");
                }}
              >
                {en ? "Contact us" : "ติดต่อเรา"}
              </button>
              <button
                onClick={() => {
                  setOpenNavigationMenu(null);
                  setMobileMenuOpen(false);
                  go("event");
                  window.history.replaceState(
                    null,
                    "",
                    "/concert#event-boarding",
                  );
                  requestAnimationFrame(() =>
                    document
                      .getElementById("event-boarding")
                      ?.scrollIntoView({ block: "start" }),
                  );
                }}
              >
                {en ? "Getting there" : "การเดินทาง"}
              </button>
            </>
          )}
          <div className="mobile-menu-tools">
            <LanguageSwitcher language={language} onChange={setLanguage} />
            <ProfileMenu
              role={profile.role}
              isAuthenticated={isAuthenticated}
              name={displayName}
              email={displayEmail}
              onLogin={() => {
                setMobileMenuOpen(false);
                openAuthDialog();
              }}
              onNavigate={(dest) => {
                setMobileMenuOpen(false);
                go(dest);
              }}
              onLogout={() => {
                setMobileMenuOpen(false);
                logoutCustomer();
              }}
              language={language}
            />
          </div>
        </nav>
      </NavigationSurface>
      <div
        className="market-tools desktop-tools"
        aria-label={en ? "User tools" : "เครื่องมือผู้ใช้"}
      >
        <LanguageSwitcher language={language} onChange={setLanguage} />
        <ProfileMenu
          role={profile.role}
          isAuthenticated={isAuthenticated}
          name={displayName}
          email={displayEmail}
          onLogin={openAuthDialog}
          onNavigate={go}
          onLogout={logoutCustomer}
          language={language}
        />
      </div>
    </header>
  );
}
