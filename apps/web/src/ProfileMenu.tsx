import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  CircleUserRound,
  LogOut,
  ReceiptText,
  Ticket,
} from "lucide-react";
import type { Language } from "./i18n";

type Destination = "tickets" | "orders";

export default function ProfileMenu({
  isAuthenticated,
  name,
  email,
  onLogin,
  onNavigate,
  onLogout,
  language,
}: {
  isAuthenticated: boolean;
  name: string;
  email: string;
  onLogin: () => void;
  onNavigate: (destination: Destination) => void;
  onLogout: () => void;
  language: Language;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeIfOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const navigate = (destination: Destination) => {
    setOpen(false);
    onNavigate(destination);
  };
  const logout = () => {
    setOpen(false);
    onLogout();
  };
  const initial = name.trim().charAt(0).toUpperCase() || "R";

  if (!isAuthenticated) {
    return (
      <button
        aria-label={language === "en" ? "Login" : "เข้าสู่ระบบ"}
        className="profile-login-call"
        onClick={onLogin}
        type="button"
      >
        <CircleUserRound aria-hidden="true" size={29} />
        <span>{language === "en" ? "Login" : "เข้าสู่ระบบ"}</span>
      </button>
    );
  }

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        aria-label={language === "en" ? "Open profile menu" : "เปิดเมนูโปรไฟล์"}
        aria-expanded={open}
        aria-haspopup="menu"
        className="profile-trigger"
        onClick={() => setOpen((current) => !current)}
      >
        <CircleUserRound aria-hidden="true" size={29} />
      </button>
      {open ? (
        <section
          aria-label={language === "en" ? "Profile menu" : "เมนูโปรไฟล์"}
          className="profile-popover"
          role="menu"
        >
          <div className="profile-summary">
            <span className="profile-avatar">
              {isAuthenticated ? (
                initial
              ) : (
                <CircleUserRound aria-hidden="true" size={26} />
              )}
            </span>
            <>
              <strong>{name}</strong>
              <small>{email}</small>
              <button type="button" onClick={() => navigate("orders")}>
                {language === "en" ? "My bookings" : "ดูคำสั่งซื้อ"}{" "}
                <ChevronRight aria-hidden="true" size={19} />
              </button>
            </>
          </div>
          <>
            <div className="profile-actions">
              <MenuAction icon={Ticket} onClick={() => navigate("tickets")}>
                {language === "en" ? "My tickets" : "บัตรของฉัน"}
              </MenuAction>
              <MenuAction icon={ReceiptText} onClick={() => navigate("orders")}>
                {language === "en" ? "My bookings" : "คำสั่งซื้อของฉัน"}
              </MenuAction>
            </div>
            <div className="profile-logout">
              <MenuAction icon={LogOut} danger onClick={logout}>
                {language === "en" ? "Log out" : "ออกจากระบบ"}
              </MenuAction>
            </div>
          </>
        </section>
      ) : null}
    </div>
  );
}

function MenuAction({
  children,
  icon: Icon,
  danger = false,
  onClick,
}: {
  children: React.ReactNode;
  icon: typeof Ticket;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`profile-action ${danger ? "danger" : ""}`}
      role="menuitem"
      type="button"
      onClick={onClick}
    >
      <span>
        <Icon aria-hidden="true" size={20} />
      </span>
      {children}
    </button>
  );
}
