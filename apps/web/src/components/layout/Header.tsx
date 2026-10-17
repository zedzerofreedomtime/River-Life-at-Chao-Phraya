import type { Dispatch, RefObject, SetStateAction } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import type { Language } from "../../data/i18n";
import { copy } from "../../data/i18n";
import { helpTopics, helpTitle, type HelpTopic } from "../../data/help";
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

export default function Header({
  page,
  language,
  setLanguage,
  mobileMenuOpen,
  setMobileMenuOpen,
  openNavigationMenu,
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
      className={`market-header ${page === "tickets" ? "!border-white/10 !text-white" : "!border-[rgba(212,175,55,0.3)] !text-white"} !bg-[#080c13]/90 !fixed !left-0 !right-0 !top-4 !z-50 !max-w-[calc(100%-2rem)] xl:!max-w-7xl !mx-auto !py-[8px] xl:!px-6 !rounded-4xl !backdrop-blur-2xl !border !shadow-2xl transition-all duration-300 !font-medium`}
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
          <small className="!text-[#d4af37] font-semibold tracking-widest text-[9px]">
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
            <div className="ticket-nav-dropdown">
              <button
                aria-expanded={openNavigationMenu === "help"}
                aria-haspopup="menu"
                onClick={() =>
                  setOpenNavigationMenu((current) =>
                    current === "help" ? null : "help",
                  )
                }
              >
                {en ? "Help" : "ช่วยเหลือ"}
                <ChevronDown aria-hidden="true" size={16} />
              </button>
              {openNavigationMenu === "help" && (
                <div className="ticket-menu-popover" role="menu">
                  {helpTopics.map((item) => (
                    <button
                      key={item}
                      role="menuitem"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        goHelp(item);
                      }}
                    >
                      {helpTitle(item, language)}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
