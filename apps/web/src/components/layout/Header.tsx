import { useRef } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import type { Language } from "../../data/i18n";
import { copy } from "../../data/i18n";
import { helpTopics, helpTitle } from "../page/Help";
import LanguageSwitcher from "../shared/LanguageSwitcher";
import ProfileMenu from "../shared/ProfileMenu";

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
  navigationRef
}: any) {
  const en = language === "en";
  const strings = copy[language as Language];
  const displayName = profile.name === "ผู้ใช้งาน River Life" && en ? "River Life user" : profile.name;
  const displayEmail = profile.email === "ยังไม่ได้เข้าสู่ระบบ" && en ? "Not logged in" : profile.email;

  return (
    <header className={`market-header ${page === "tickets" ? "!border-white/10 !text-white" : "!border-[rgba(212,175,55,0.2)] !text-white"} !bg-[#080c13]/40 !fixed !left-0 !right-0 !top-4 !z-50 !max-w-[calc(100%-2rem)] xl:!max-w-7xl !mx-auto !py-[6px] xl:!px-6 !rounded-4xl !backdrop-blur-xl !border !shadow-sm transition-colors duration-300 !font-medium`}>
      <button
        className="river-brand"
        onClick={() => go("home")}
        aria-label={en ? "Back to cruise homepage" : "กลับไปหน้าจองล่องเรือ"}
      >
        
        <span>
          RIVER LIFE <small>CHAO PHRAYA CRUISES</small>
        </span>
      </button>
      <button
        className="mobile-nav-toggle"
        type="button"
        aria-label={en ? (mobileMenuOpen ? "Close menu" : "Open menu") : (mobileMenuOpen ? "ปิดเมนู" : "เปิดเมนู")}
        aria-expanded={mobileMenuOpen}
        aria-controls="ticket-main-nav"
        onClick={() => setMobileMenuOpen((current: boolean) => !current)}
      >
        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <nav
        id="ticket-main-nav"
        ref={navigationRef}
        className={`ticket-nav ${mobileMenuOpen ? "is-open" : ""}`}
        aria-label={en ? "Main menu" : "เมนูหลัก"}
      >
        {profile.role === "admin" ? (
          <button className="active" onClick={() => go("dashboard")}>
            {strings.nav.dashboard}
          </button>
        ) : (
          <>
            <button
              className={page === "home" ? "active" : ""}
              onClick={() => {
                setOpenNavigationMenu(null);
                go("home");
              }}
            >
              {en ? "Home" : "หน้าแรก"}
            </button>
            <button className={page === "event" ? "active" : ""} onClick={() => go("event")}>
              {en ? "Cruise & book" : "รอบล่องเรือและจอง"}
            </button>
            <div className="ticket-nav-dropdown">
              <button
                aria-expanded={openNavigationMenu === "help"}
                aria-haspopup="menu"
                onClick={() =>
                  setOpenNavigationMenu((current: any) =>
                    current === "help" ? null : "help",
                  )
                }
              >
                {en ? "Help" : "ช่วยเหลือ"}
                <ChevronDown aria-hidden="true" size={16} />
              </button>
              {openNavigationMenu === "help" && (
                <div className="ticket-menu-popover" role="menu">
                  {helpTopics.map((item: any) => (
                    <button
                      key={item}
                      role="menuitem"
                      onClick={() => goHelp(item)}
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
                go("event");
                window.history.replaceState(null, "", "/concert#event-boarding");
                requestAnimationFrame(() => document.getElementById("event-boarding")?.scrollIntoView({ block: "start" }));
              }}
            >
              {en ? "Getting there" : "การเดินทาง"}
            </button>
          </>
        )}
      </nav>
      <div className="market-tools" aria-label={en ? "User tools" : "เครื่องมือผู้ใช้"}>
        <LanguageSwitcher language={language} onChange={setLanguage} />
        <ProfileMenu
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
