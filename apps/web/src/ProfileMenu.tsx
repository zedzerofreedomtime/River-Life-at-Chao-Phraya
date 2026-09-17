import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  CircleUserRound,
  LogOut,
  ReceiptText,
  Ticket,
} from "lucide-react";

type Destination = "tickets" | "orders";

export default function ProfileMenu({
  isAuthenticated,
  name,
  email,
  onLogin,
  onNavigate,
  onLogout,
}: {
  isAuthenticated: boolean;
  name: string;
  email: string;
  onLogin: () => void;
  onNavigate: (destination: Destination) => void;
  onLogout: () => void;
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

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        aria-label="เปิดเมนูโปรไฟล์"
        aria-expanded={open}
        aria-haspopup="menu"
        className="profile-trigger"
        onClick={() => setOpen((current) => !current)}
      >
        <CircleUserRound aria-hidden="true" size={29} />
      </button>
      {open ? (
        <section
          aria-label="เมนูโปรไฟล์"
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
            {isAuthenticated ? (
              <>
                <strong>{name}</strong>
                <small>{email}</small>
                <button type="button" onClick={() => navigate("orders")}>
                  ดูคำสั่งซื้อ <ChevronRight aria-hidden="true" size={19} />
                </button>
              </>
            ) : (
              <>
                <strong>ยังไม่ได้เข้าสู่ระบบ</strong>
                <small>เข้าสู่ระบบด้วย Google หรือสมัครสมาชิกใหม่</small>
                <button type="button" onClick={onLogin}>
                  เข้าสู่ระบบ / สมัครสมาชิก{" "}
                  <ChevronRight aria-hidden="true" size={19} />
                </button>
              </>
            )}
          </div>
          {isAuthenticated ? (
            <>
              <div className="profile-actions">
                <MenuAction icon={Ticket} onClick={() => navigate("tickets")}>
                  บัตรของฉัน
                </MenuAction>
                <MenuAction
                  icon={ReceiptText}
                  onClick={() => navigate("orders")}
                >
                  คำสั่งซื้อของฉัน
                </MenuAction>
              </div>
              <div className="profile-logout">
                <MenuAction icon={LogOut} danger onClick={logout}>
                  ออกจากระบบ
                </MenuAction>
              </div>
            </>
          ) : null}
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
