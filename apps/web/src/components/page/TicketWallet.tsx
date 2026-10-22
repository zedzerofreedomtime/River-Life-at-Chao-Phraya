import { useContext, useEffect, useState } from "react";
import { CruiseProgrammeContext } from "../shared/CruiseProgramme";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import { QRCodeSVG } from "qrcode.react";
import {
  ChevronRight,
  CircleHelp,
  Copy,
  MapPin,
  ShieldAlert,
  Ticket,
  X,
} from "lucide-react";
import {
  api,
  bookingItemLabel,
  localizeEventTitle,
  statusLabel,
  type Booking,
} from "../../data/api";
import type { Language } from "../../data/i18n";
import "../../TicketWallet.css";

type Props = {
  initial: Booking | null;
  initialToken: string;
  language: Language;
  demo: boolean;
  boardingPier: string;
  onOpenOrders: () => void;
  onOpenHelp: () => void;
};
const zoneName = (zone: string, language: Language) =>
  (language === "en"
    ? { A: "Bow", B: "Stern", C: "Lower deck" }
    : { A: "โซนหัวเรือ", B: "โซนท้ายเรือ", C: "โซนชั้นล่าง" })[
    zone as "A" | "B" | "C"
  ] || `${language === "en" ? "Zone" : "โซน"} ${zone}`;
const translate = (language: Language, th: string, en: string) =>
  language === "en" ? en : th;

export default function TicketWallet({
  initial,
  initialToken,
  language,
  demo,
  boardingPier,
  onOpenOrders,
  onOpenHelp,
}: Props) {
  const tr = (th: string, en: string) => translate(language, th, en);
  const programme = useContext(CruiseProgrammeContext);
  const concertTitle = localizeEventTitle(programme.title, language);
  const [booking, setBooking] = useState<Booking | null>(initial);
  const [id, setId] = useState(
    initial?.id ?? sessionStorage.getItem("riverlife.booking.id") ?? "",
  );
  const [token, setToken] = useState(
    initialToken || sessionStorage.getItem("riverlife.booking.token") || "",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(0);
  const [qrOpen, setQrOpen] = useState(false);
  const [ticketTab, setTicketTab] = useState<
    "available" | "progress" | "used" | null
  >(null);
  const load = async () => {
    if (!id || !token) return;
    setBusy(true);
    setError("");
    try {
      setBooking(
        await api<Booking>(`/bookings/${encodeURIComponent(id)}`, {}, token),
      );
      setSelected(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!id || !token) return;
    let stopped = false;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const latest = await api<Booking>(
          `/bookings/${encodeURIComponent(id)}`,
          { signal: controller.signal },
          token,
        );
        if (!stopped) {
          setBooking(latest);
          setError("");
        }
      } catch (cause) {
        if (!stopped) setError((cause as Error).message);
      }
    };
    void refresh();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      stopped = true;
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [id, token]);

  if (!booking) {
    return (
      <section className="wallet-access-shell">
        <div className="wallet-heading">
          <h1>{tr("บัตรของฉัน", "My tickets")}</h1>
          <Button variant="contained" onClick={onOpenOrders}>
            {tr(
              "ดูรายการและตั๋วจากบัญชีของฉัน",
              "View account bookings and tickets",
            )}
          </Button>
          <p>
            {tr(
              "กรอกรหัสคำสั่งซื้อและรหัสเข้าถึงส่วนตัวเพื่อเปิดบัตรของคุณ",
              "Enter your order ID and private access code to open your tickets.",
            )}
          </p>
        </div>
        <div className="access-panel">
          <TextField
            label={tr("รหัสคำสั่งซื้อ", "Order ID")}
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <TextField
            label={tr("รหัสเข้าถึงส่วนตัว", "Private access code")}
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={load}
            disabled={busy || !id || !token}
          >
            {tr("เปิดบัตรของฉัน", "Open my tickets")}
          </Button>
        </div>
        {error && <Alert severity="error">{error}</Alert>}
      </section>
    );
  }

  const tickets = booking.tickets ?? [];
  const confirmed = booking.status === "confirmed";
  const availableCount = confirmed
    ? tickets.filter((t) => !t.checked_in_at).length
    : 0;
  const usedCount = tickets.filter((t) => t.checked_in_at).length;
  const activeTab =
    ticketTab ??
    (availableCount > 0 ? "available" : usedCount > 0 ? "used" : "progress");
  const visibleTickets = tickets
    .map((ticket, index) => ({ ticket, index }))
    .filter(
      ({ ticket }) =>
        confirmed &&
        (activeTab === "available"
          ? !ticket.checked_in_at
          : activeTab === "used"
            ? !!ticket.checked_in_at
            : false),
    );
  const activeIndex = visibleTickets.some(({ index }) => index === selected)
    ? selected
    : visibleTickets[0]?.index;
  const active = activeIndex === undefined ? undefined : tickets[activeIndex];
  return (
    <section className="wallet-dashboard">
      <aside className="wallet-orders">
        <div className="wallet-orders-head">
          <h2>{tr("คำสั่งซื้อของฉัน", "My bookings")}</h2>
          <Button onClick={onOpenOrders}>
            {tr("ดูทั้งหมด", "View all")} <ChevronRight size={17} />
          </Button>
        </div>
        <button
          className="wallet-order-card selected"
          onClick={() => setSelected(0)}
        >
          <img
            src="/images/boat/unicorn-upper-deck.jpg"
            alt={tr("เรือ UNICRON CRUISE", "UNICRON CRUISE boat")}
          />
          <span>
            <strong>{concertTitle}</strong>
            <small>
              {tr("คำสั่งซื้อ", "Order")} #{shortId(booking.id)}
            </small>
            <em>
              {tickets.length}{" "}
              {language === "en"
                ? tickets.length === 1
                  ? "ticket"
                  : "tickets"
                : "บัตร"}
            </em>
            <b className={confirmed ? "confirmed" : "review"}>
              {statusLabel(booking.status, language)}
            </b>
          </span>
          <ChevronRight aria-hidden="true" size={23} />
        </button>
      </aside>
      <div className="wallet-main">
        <div className="wallet-title">
          <h1>{tr("บัตรของฉัน", "My tickets")}</h1>
          <Button onClick={() => void load()} disabled={busy}>
            {tr("โหลดสถานะบัตรล่าสุด", "Refresh ticket status")}
          </Button>
          {error && <Alert severity="error">{error}</Alert>}
          {demo && (
            <Alert severity="warning">
              {tr(
                "บัตรนี้เป็นบัตรทดสอบ ไม่ใช่บัตรเข้างานจริง และไม่ได้ยืนยันการชำระเงิน",
                "This is a demo ticket, not valid for boarding. Payment has not been verified.",
              )}
            </Alert>
          )}
          <p>
            {demo
              ? tr(
                  "ตรวจสอบตัวอย่างบัตรและหน้าจอ QR สำหรับการทดลองเท่านั้น",
                  "Preview your sample ticket and QR screen. It is not valid for boarding.",
                )
              : tr(
                  "ตรวจสอบบัตร เข้างาน และเพลิดเพลินกับประสบการณ์คอนเสิร์ตบนแม่น้ำเจ้าพระยา",
                  "Check your tickets, board the boat, and enjoy a concert on the Chao Phraya River.",
                )}
          </p>
        </div>
        <div
          className="wallet-tabs"
          role="tablist"
          aria-label={tr("สถานะบัตร", "Ticket status")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "available"}
            className={activeTab === "available" ? "active" : ""}
            onClick={() => {
              setTicketTab("available");
              setQrOpen(false);
            }}
          >
            {tr("บัตรที่ใช้งานได้", "Available tickets")} (
            {confirmed
              ? tickets.filter((ticket) => !ticket.checked_in_at).length
              : 0}
            )
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "progress"}
            className={activeTab === "progress" ? "active" : ""}
            onClick={() => {
              setTicketTab("progress");
              setQrOpen(false);
            }}
          >
            {tr("กำลังดำเนินการ", "In progress")} ({confirmed ? 0 : 1})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "used"}
            className={activeTab === "used" ? "active" : ""}
            onClick={() => {
              setTicketTab("used");
              setQrOpen(false);
            }}
          >
            {tr("ใช้แล้ว", "Used")} (
            {tickets.filter((ticket) => ticket.checked_in_at).length})
          </button>
        </div>
        {activeTab === "progress" || !confirmed ? (
          <div className="wallet-pending-state">
            <Alert severity="info" className="wallet-status-alert">
              {confirmed
                ? tr(
                    "ไม่มีรายการกำลังดำเนินการในคำสั่งซื้อนี้ · ",
                    "No pending items in this order · ",
                  )
                : ""}
              {tr("คำสั่งซื้อ", "Order")} #{shortId(booking.id)}{" "}
              {tr("อยู่ในสถานะ:", "status:")}{" "}
              {statusLabel(booking.status, language)}
            </Alert>
          </div>
        ) : (
          <>
            <TicketJourney
              ticketCount={tickets.length}
              usedCount={usedCount}
              language={language}
              boardingPier={boardingPier}
            />
            <div className="wallet-ticket-workspace">
              <section className="wallet-ticket-stack">
                <div className="wallet-order-summary">
                  <span>
                    <strong>{concertTitle}</strong>
                    <small>
                      {boardingPier} · {programme.departure}
                    </small>
                  </span>
                  <span>
                    {tr("คำสั่งซื้อ", "Order")} #{shortId(booking.id)}
                    <b>{tr("ยืนยันแล้ว", "Confirmed")}</b>
                    <small>
                      {tickets.length}{" "}
                      {language === "en"
                        ? tickets.length === 1
                          ? "ticket"
                          : "tickets"
                        : "บัตร"}
                    </small>
                  </span>
                </div>
                {visibleTickets.length === 0 && (
                  <Alert severity="info">
                    {activeTab === "used"
                      ? tr("ยังไม่มีบัตรที่ใช้แล้ว", "No used tickets")
                      : tr(
                          "ไม่มีบัตรที่พร้อมใช้งานในคำสั่งซื้อนี้",
                          "No available tickets in this order",
                        )}
                  </Alert>
                )}
                {visibleTickets.map(({ ticket, index }) => (
                  <button
                    key={ticket.id}
                    className={`wallet-ticket ${activeIndex === index ? "selected" : ""}`}
                    onClick={() => {
                      setSelected(index);
                      setQrOpen(true);
                    }}
                  >
                    <img src="/images/boat/unicorn-night-exterior.jpg" alt="" />
                    <span>
                      <small>
                        {tr("บัตรที่", "Ticket")} {index + 1} {tr("จาก", "of")}{" "}
                        {tickets.length}
                      </small>
                      <strong>
                        {ticket.table_id
                          ? `${tr("โต๊ะ", "Table")} ${ticket.table_id}`
                          : booking.table_ids?.length
                            ? bookingItemLabel(booking, language)
                            : zoneName(booking.zone_id, language)}
                      </strong>
                      <em>
                        {concertTitle}
                        <br />
                        {boardingPier} · {programme.departure}
                      </em>
                    </span>
                    <span className="ticket-quantity">
                      <small>{tr("จำนวน", "Quantity")}</small>
                      <b>1</b>
                      <em>{tr("ใบ", "ticket")}</em>
                    </span>
                    <span className="show-qr">
                      {ticket.checked_in_at
                        ? tr("ดูบัตรใช้แล้ว", "View used ticket")
                        : tr("แสดง QR", "Show QR")}
                    </span>
                  </button>
                ))}
                <div className="wallet-help">
                  <Ticket aria-hidden="true" />
                  <span>
                    <strong>
                      {tr(
                        `ทั้ง ${tickets.length} บัตรอยู่ในคำสั่งซื้อเดียวกัน`,
                        `All ${tickets.length} tickets are in one order`,
                      )}
                    </strong>
                    <small>
                      {demo
                        ? tr(
                            "บัตรตัวอย่าง ใช้เข้างานจริงไม่ได้",
                            "Sample ticket; not valid for boarding.",
                          )
                        : tr(
                            "กรุณาแสดงบัตรแต่ละใบเมื่อเข้างาน",
                            "Show each ticket when boarding.",
                          )}
                    </small>
                  </span>
                  <span>
                    <CircleHelp aria-hidden="true" />
                    <strong>
                      {tr(
                        "มีคำถามเกี่ยวกับบัตร?",
                        "Questions about your tickets?",
                      )}
                    </strong>
                    <button
                      type="button"
                      className="wallet-guidance"
                      onClick={onOpenHelp}
                    >
                      {tr("ดูคำแนะนำการใช้งาน →", "View ticket guidance →")}
                    </button>
                  </span>
                </div>
              </section>
              {active && (
                <TicketPreview
                  booking={booking}
                  ticketId={active.id}
                  index={activeIndex!}
                  count={tickets.length}
                  language={language}
                  boardingPier={boardingPier}
                />
              )}
            </div>
            {active && (
              <QrDialog
                open={qrOpen}
                onClose={() => setQrOpen(false)}
                booking={booking}
                ticketId={active.id}
                index={activeIndex!}
                count={tickets.length}
                language={language}
                boardingPier={boardingPier}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}

function QrDialog({
  open,
  onClose,
  booking,
  ticketId,
  index,
  count,
  language,
  boardingPier,
}: {
  open: boolean;
  onClose: () => void;
  booking: Booking;
  ticketId: string;
  index: number;
  count: number;
  language: Language;
  boardingPier: string;
}) {
  const tr = (th: string, en: string) => translate(language, th, en);
  const programme = useContext(CruiseProgrammeContext);
  const concertTitle = localizeEventTitle(programme.title, language);
  const checkedIn = booking.tickets[index]?.checked_in_at;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent className="qr-dialog-content">
        <IconButton
          aria-label={tr("ปิด QR", "Close QR code")}
          className="qr-dialog-close"
          onClick={onClose}
        >
          <X />
        </IconButton>
        <span>
          {tr("บัตรที่", "Ticket")} {index + 1} {tr("จาก", "of")} {count}
        </span>
        <h2>
          {booking.tickets[index]?.table_id
            ? `${tr("โต๊ะ", "Table")} ${booking.tickets[index].table_id}`
            : booking.table_ids?.length
              ? bookingItemLabel(booking, language)
              : zoneName(booking.zone_id, language)}
        </h2>
        <p>
          {concertTitle} · {boardingPier} · {programme.departure}
        </p>
        <QRCodeSVG value={ticketId} size={250} marginSize={4} />
        <strong className={checkedIn ? "used" : "available"}>
          ●{" "}
          {checkedIn
            ? tr("เช็กอินแล้ว", "Checked in")
            : tr("พร้อมใช้เข้างาน", "Ready for boarding")}
        </strong>
        <small>
          {tr(
            checkedIn
              ? "บัตรนี้เช็กอินแล้ว ใช้เข้างานซ้ำไม่ได้"
              : "แสดง QR นี้ให้เจ้าหน้าที่สแกนที่จุด Check-in",
            checkedIn
              ? "This ticket has been checked in and cannot be used again."
              : "Show this QR code for scanning at check-in.",
          )}
        </small>
      </DialogContent>
    </Dialog>
  );
}

function TicketJourney({
  ticketCount,
  usedCount,
  language,
  boardingPier,
}: {
  ticketCount: number;
  usedCount: number;
  language: Language;
  boardingPier: string;
}) {
  const programme = useContext(CruiseProgrammeContext);
  const tr = (th: string, en: string) => translate(language, th, en);
  return (
    <section className="booking-journey confirmed">
      <div className="booking-journey-head">
        <div>
          <small>{tr("สถานะการจอง", "Booking status")}</small>
          <strong>
            {usedCount === ticketCount && ticketCount > 0
              ? tr("เช็กอินครบทุกบัตรแล้ว", "All tickets have been checked in")
              : usedCount > 0
                ? tr(
                    `เช็กอินแล้ว ${usedCount} จาก ${ticketCount} บัตร`,
                    `${usedCount} of ${ticketCount} tickets checked in`,
                  )
                : tr("บัตรของคุณพร้อมใช้งานแล้ว", "Your tickets are ready")}
          </strong>
        </div>
        <span>
          {usedCount === ticketCount && ticketCount > 0
            ? tr(
                "บัตรทั้งหมดใช้แล้ว ไม่สามารถใช้เข้างานซ้ำได้",
                "All tickets have been used and cannot be reused",
              )
            : tr(
                `มี ${ticketCount} QR — แสดงทีละใบเมื่อเข้างาน`,
                `${ticketCount} QR ${ticketCount === 1 ? "code" : "codes"} — show each ticket when boarding`,
              )}
        </span>
      </div>
      <ol className="booking-steps">
        <li className="done">{tr("ยืนยันการจอง", "Booking confirmed")}</li>
        <li className="done">
          {tr("ยืนยันสถานะรายการ", "Order status confirmed")}
        </li>
        <li className="done">{tr("รับ QR Ticket", "QR ticket issued")}</li>
        <li
          className={
            usedCount === ticketCount && ticketCount > 0 ? "done" : "current"
          }
        >
          {tr("สแกนเข้างาน", "Scan at boarding")}
        </li>
      </ol>
      <div className="boarding-details">
        <span>
          <MapPin aria-hidden="true" /> {boardingPier} ·{" "}
          {tr("จุดขึ้นเรือ", "Boarding pier")}
        </span>
        <span>
          {tr(
            `ขึ้นเรือก่อน ${programme.boarding} · ออกเรือ ${programme.departure}`,
            `Board by ${programme.boarding} · Departure at ${programme.departure}`,
          )}
        </span>
        <span>
          <ShieldAlert aria-hidden="true" />{" "}
          {tr(
            "มาสายจนไม่ทันเรือถือเป็น No-show",
            "Missing departure is considered a no-show",
          )}
        </span>
      </div>
    </section>
  );
}

function TicketPreview({
  booking,
  ticketId,
  index,
  count,
  language,
  boardingPier,
}: {
  booking: Booking;
  ticketId: string;
  index: number;
  count: number;
  language: Language;
  boardingPier: string;
}) {
  const tr = (th: string, en: string) => translate(language, th, en);
  const programme = useContext(CruiseProgrammeContext);
  const concertTitle = localizeEventTitle(programme.title, language);
  const checkedIn = booking.tickets[index]?.checked_in_at;
  const [copyMessage, setCopyMessage] = useState("");
  useEffect(() => setCopyMessage(""), [ticketId]);
  const copyTicket = async () => {
    try {
      await navigator.clipboard.writeText(ticketId);
      setCopyMessage(tr("คัดลอกรหัสบัตรแล้ว", "Ticket code copied"));
    } catch {
      setCopyMessage(
        tr(
          "คัดลอกไม่ได้ กรุณาแสดง QR แทน",
          "Unable to copy. Please show the QR code instead.",
        ),
      );
    }
  };
  return (
    <aside className="qr-ticket">
      <span className="qr-ticket-count">
        {tr("บัตรที่", "Ticket")} {index + 1} {tr("จาก", "of")} {count}
      </span>
      <span className={`ticket-state ${checkedIn ? "used" : "available"}`}>
        ●{" "}
        {checkedIn
          ? tr("เช็กอินแล้ว", "Checked in")
          : tr("ใช้งานได้", "Available")}
      </span>
      <h2>
        {booking.tickets[index]?.table_id
          ? `${tr("โต๊ะ", "Table")} ${booking.tickets[index].table_id}`
          : booking.table_ids?.length
            ? bookingItemLabel(booking, language)
            : zoneName(booking.zone_id, language)}
      </h2>
      <p>
        {concertTitle}
        <br />
        {boardingPier} · {programme.departure}
      </p>
      <QRCodeSVG value={ticketId} size={188} marginSize={4} />
      <p className="qr-note">
        <CircleHelp aria-hidden="true" size={20} />{" "}
        {checkedIn
          ? tr(
              "บัตรนี้ใช้แล้ว ใช้ซ้ำไม่ได้",
              "This ticket is used and cannot be reused",
            )
          : tr(
              "แสดง QR Code นี้ที่จุด Check-in",
              "Show this QR code at check-in",
            )}
        <br />
        <small>
          {checkedIn
            ? tr("เก็บไว้ดูประวัติเท่านั้น", "For your records only")
            : tr("เพื่อสแกนเข้างาน", "for boarding")}
        </small>
      </p>
      <dl>
        <div>
          <dt>{tr("หมายเลขบัตร", "Ticket number")}</dt>
          <dd>
            {ticketId.slice(0, 14).toUpperCase()}
            <button
              type="button"
              className="wallet-copy"
              aria-label={tr("คัดลอกรหัสบัตร", "Copy ticket code")}
              onClick={() => void copyTicket()}
            >
              <Copy aria-hidden="true" size={16} />
            </button>
          </dd>
        </div>
        <div>
          <dt>{tr("หมายเลขคำสั่งซื้อ", "Order number")}</dt>
          <dd>#{shortId(booking.id)}</dd>
        </div>
        <div>
          <dt>{tr("จำนวน", "Quantity")}</dt>
          <dd>1 {tr("ใบ", "ticket")}</dd>
        </div>
        <div>
          <dt>{tr("สถานะ", "Status")}</dt>
          <dd className={checkedIn ? "used" : "available"}>
            ●{" "}
            {checkedIn
              ? tr("เช็กอินแล้ว", "Checked in")
              : tr("ใช้งานได้", "Available")}
          </dd>
        </div>
      </dl>
      {copyMessage && <p role="status">{copyMessage}</p>}
      <div className="ticket-rules">
        <strong>{tr("เงื่อนไขการใช้งาน", "Ticket terms")}</strong>
        <ul>
          <li>
            {tr(
              `บัตรนี้ใช้เข้าร่วมงาน${concertTitle}เท่านั้น`,
              `This ticket is valid for ${concertTitle} only.`,
            )}
          </li>
          <li>
            {tr(
              "เก็บ QR และรหัสบัตรเป็นส่วนตัว ไม่ส่งให้ผู้ที่ไม่เกี่ยวข้อง",
              "Keep your QR and ticket code private; do not share them with others.",
            )}
          </li>
          <li>{tr("1 บัตร ต่อ 1 ท่าน", "One ticket per person.")}</li>
        </ul>
      </div>
    </aside>
  );
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}
