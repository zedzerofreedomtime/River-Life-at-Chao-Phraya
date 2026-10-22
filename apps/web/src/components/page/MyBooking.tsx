import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { api, statusLabel, money, bookingItemLabel, type Booking } from "../../data/api";
import type { Language } from "../../data/i18n";

export default function MyBooking({
  initial,
  initialToken,
  onPay,
  onOpenTickets,
  language,
  demo,
  isAuthenticated,
  onLogin,
  onAccess,
}: {
  initial: Booking | null;
  initialToken: string;
  onPay?: (booking: Booking) => void;
  onOpenTickets?: (booking: Booking) => void;
  language: Language;
  demo: boolean;
  isAuthenticated: boolean;
  onLogin: () => void;
  onAccess: (booking: Booking, token: string) => void;
}) {
  const en = language === "en";
  const tr = (th: string, english: string) => (en ? english : th);
  const [booking, setBooking] = useState(initial);
  const [id, setID] = useState(
    initial?.id ?? sessionStorage.getItem("riverlife.booking.id") ?? "",
  );
  const [token, setToken] = useState(
    initialToken || sessionStorage.getItem("riverlife.booking.token") || "",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Booking[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState("");
  useEffect(() => {
    let active = true;
    setHistory([]);
    if (!isAuthenticated) return;
    setHistoryBusy(true);
    setHistoryError("");
    void api<Booking[]>("/me/bookings")
      .then((items) => {
        if (active) setHistory(items);
      })
      .catch((cause: Error) => {
        if (active) setHistoryError(cause.message);
      })
      .finally(() => {
        if (active) setHistoryBusy(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);
  const openAccountBooking = async (bookingID: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ booking: Booking; token: string }>(
        `/me/bookings/${encodeURIComponent(bookingID)}/access`,
        { method: "POST" },
      );
      setID(result.booking.id);
      setToken(result.token);
      setBooking(result.booking);
      onAccess(result.booking, result.token);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const latest = await api<Booking>(
        `/bookings/${encodeURIComponent(id)}`,
        {},
        token,
      );
      setBooking(latest);
      onAccess(latest, token);
      sessionStorage.setItem("riverlife.booking.id", latest.id);
      sessionStorage.setItem("riverlife.booking.token", token);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const savedID =
      initial?.id || sessionStorage.getItem("riverlife.booking.id");
    const savedToken =
      initialToken || sessionStorage.getItem("riverlife.booking.token");
    if (!savedID || !savedToken) return;
    void api<Booking>(
      `/bookings/${encodeURIComponent(savedID)}`,
      {},
      savedToken,
    )
      .then(setBooking)
      .catch((cause: Error) => setError(cause.message));
  }, [initial?.id, initialToken]);

  return (
    <section className="content-panel">
      <div className="orders-heading">
        <h1>{tr("คำสั่งซื้อของฉัน", "My bookings")}</h1>
        <p>
          {tr(
            "ดูรายการจอง สถานะ และเปิดบัตรของคุณได้ที่นี่ หรือกลับมาจากเมนูบัญชี → คำสั่งซื้อของฉัน",
            "Track bookings and open tickets here. Return via Account → My bookings.",
          )}
        </p>
      </div>
      {!isAuthenticated ? (
        <Button variant="contained" onClick={onLogin}>
          {tr(
            "เข้าสู่ระบบเพื่อดูประวัติการจอง",
            "Log in to view booking history",
          )}
        </Button>
      ) : (
        <section aria-label={tr("ประวัติการจอง", "Booking history")}>
          <h2>
            {tr("รายการที่จองด้วยบัญชีนี้", "Bookings made with this account")}
          </h2>
          {historyBusy && (
            <p role="status">{tr("กำลังโหลดรายการ…", "Loading bookings…")}</p>
          )}
          {historyError && <Alert severity="error">{historyError}</Alert>}
          {!historyBusy && !historyError && history.length === 0 && (
            <p>
              {tr(
                "ยังไม่มีรายการที่ผูกกับบัญชีนี้ รายการเก่าเปิดด้วยรหัสส่วนตัวด้านล่างได้",
                "No account bookings yet. Older bookings can be opened with their private code below.",
              )}
            </p>
          )}
          <div className="grid gap-3">
            {history.map((item) => (
              <article key={item.id} className="booking-detail">
                <strong>
                  {bookingItemLabel(item, language)} · {item.quantity}{" "}
                  {tr("ท่าน", "guests")} · {money(item.total)}
                </strong>
                <p>
                  #{item.id} · {statusLabel(item.status, language)}
                </p>
                <Button
                  variant="outlined"
                  disabled={busy}
                  onClick={() => void openAccountBooking(item.id)}
                >
                  {tr("ดูรายละเอียดและบัตร", "View booking and tickets")}
                </Button>
              </article>
            ))}
          </div>
        </section>
      )}
      <details open={!isAuthenticated} className="my-4">
        <summary>
          {tr(
            "มีรายการเก่าหรือรหัสส่วนตัว? เปิดรายการที่นี่",
            "Have an older booking or private code? Open it here",
          )}
        </summary>
        <div className="grid gap-4 md:grid-cols-3">
          <TextField
            label={tr("รหัสการจอง", "Booking ID")}
            value={id}
            onChange={(event) => {
              setID(event.target.value);
              setBooking(null);
            }}
          />
          <TextField
            label={tr("รหัสเข้าถึงส่วนตัว", "Private access code")}
            type="password"
            value={token}
            onChange={(event) => {
              setToken(event.target.value);
              setBooking(null);
            }}
          />
          <Button
            variant="outlined"
            onClick={() => void load()}
            disabled={busy || !id || !token}
          >
            {tr("เปิดคำสั่งซื้อ", "Open booking")}
          </Button>
        </div>
      </details>
      {error && <Alert severity="error">{error}</Alert>}
      {booking && (
        <div className="booking-detail">
          <div className="order-status-bar">
            <h3>
              {bookingItemLabel(booking, language)} · {booking.quantity}{" "}
              {en ? (booking.quantity === 1 ? "ticket" : "tickets") : "ใบ"} ·{" "}
              {money(booking.total)}
            </h3>
            <strong>{statusLabel(booking.status, language)}</strong>
          </div>
          <p className="order-person">
            {tr("ผู้สั่งซื้อ", "Customer")}: {booking.name} · {booking.email}
          </p>
          <Alert severity="info">
            {isAuthenticated ? tr("รายการที่จองด้วยบัญชีนี้เปิดจากเครื่องอื่นได้โดยเข้าสู่ระบบ แล้วไปที่คำสั่งซื้อของฉัน ส่วนรายการเก่ายังใช้รหัสส่วนตัวเดิม", "Open account bookings on another device by logging in and visiting My bookings. Older bookings still use their original private code.") : tr(
              "เก็บรหัสการจองและรหัสเข้าถึงนี้ไว้เพื่อเปิดบัตรจากเครื่องอื่น",
              "Keep your booking ID and access code to open tickets on another device.",
            )}
          </Alert>
          {!isAuthenticated && <details className="access-code">
            <summary>
              {tr("แสดงรหัสเข้าถึงสำหรับเก็บรักษา", "Show access code to save")}
            </summary>
            <code className="break-all">{token}</code>
          </details>}
          {booking.status === "held" && (
            <section
              className="order-action"
              aria-label={tr("ชำระเงิน", "Payment")}
            >
              <h3>{tr("รอชำระเงิน", "Awaiting payment")}</h3>
              <p>
                {demo
                  ? tr(
                      "รายการทดลองถูกสำรองไว้ ไปขั้นตอนชำระเงินทดสอบเพื่อดำเนินการต่อ",
                      "Your demo reservation is held. Continue to test payment.",
                    )
                  : tr(
                      "รายการถูกสำรองไว้ กรุณาดำเนินการชำระเงินภายในเวลาที่กำหนด",
                      "Your reservation is held. Complete payment before the hold expires.",
                    )}
              </p>
              <Button variant="contained" onClick={() => onPay?.(booking)}>
                {tr("ไปหน้าชำระเงิน", "Continue to payment")}
              </Button>
            </section>
          )}
          {booking.status === "confirmed" && (
            <div className="order-success">
              <div>
                <strong>
                  {demo
                    ? tr("บันทึกรายการทดลองแล้ว", "Demo booking recorded")
                    : tr("ชำระเงินเรียบร้อยแล้ว", "Payment confirmed")}
                </strong>
                <span>
                  {booking.tickets.length}{" "}
                  {en
                    ? booking.tickets.length === 1
                      ? "QR ticket ready"
                      : "QR tickets ready"
                    : "QR Ticket พร้อมใช้งาน"}
                </span>
              </div>
              <Button
                variant="contained"
                onClick={() => onOpenTickets?.(booking)}
              >
                {tr("เปิดบัตรของฉัน", "Open my tickets")}
              </Button>
            </div>
          )}
          {booking.status !== "held" && booking.status !== "confirmed" && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {tr("คำสั่งซื้อนี้อยู่ในสถานะ", "Booking status:")}{" "}
              {statusLabel(booking.status, language)}
            </Alert>
          )}
        </div>
      )}
    </section>
  );
}
