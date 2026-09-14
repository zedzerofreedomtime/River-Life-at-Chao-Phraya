import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { QRCodeSVG } from "qrcode.react";
import { ChevronRight, CircleHelp, Copy, Ticket } from "lucide-react";
import { api, labels, type Booking } from "./api";

type Props = { initial: Booking | null; initialToken: string };
const zoneName: Record<string, string> = {
  A: "โซนหัวเรือ (Head Boat)",
  B: "โซนกลางแจ้ง (Outdoor)",
  C: "โซนห้องแอร์ (Indoor)",
};

export default function TicketWallet({ initial, initialToken }: Props) {
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
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipError, setSlipError] = useState("");
  const [slipBusy, setSlipBusy] = useState(false);
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
    if (!initial && id && token) void load();
  }, []);

  const uploadSlip = async () => {
    if (!booking || !slipFile) return;
    if (slipFile.size > 5 * 1024 * 1024) {
      setSlipError("รูปหลักฐานต้องมีขนาดไม่เกิน 5 MB");
      return;
    }
    setSlipBusy(true);
    setSlipError("");
    try {
      const form = new FormData();
      form.append("slip", slipFile);
      await api(
        `/bookings/${booking.id}/slip`,
        { method: "POST", body: form },
        token,
      );
      setBooking(await api<Booking>(`/bookings/${booking.id}`, {}, token));
      setSlipFile(null);
    } catch (e) {
      setSlipError((e as Error).message);
    } finally {
      setSlipBusy(false);
    }
  };

  if (!booking) {
    return (
      <section className="wallet-access-shell">
        <div className="wallet-heading">
          <h1>บัตรของฉัน</h1>
          <p>กรอกรหัสคำสั่งซื้อและรหัสเข้าถึงส่วนตัวเพื่อเปิดบัตรของคุณ</p>
        </div>
        <div className="access-panel">
          <TextField
            label="รหัสคำสั่งซื้อ"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <TextField
            label="รหัสเข้าถึงส่วนตัว"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={load}
            disabled={busy || !id || !token}
          >
            เปิดบัตรของฉัน
          </Button>
        </div>
        {error && <Alert severity="error">{error}</Alert>}
      </section>
    );
  }

  const tickets = booking.tickets ?? [];
  const active = tickets[selected];
  const confirmed = booking.status === "confirmed";
  return (
    <section className="wallet-dashboard">
      <aside className="wallet-orders">
        <div className="wallet-orders-head">
          <h2>คำสั่งซื้อของฉัน</h2>
          <span>
            ดูทั้งหมด <ChevronRight size={17} />
          </span>
        </div>
        <button
          className="wallet-order-card selected"
          onClick={() => setSelected(0)}
        >
          <img
            src="/images/boat/unicorn-upper-deck.jpg"
            alt="เรือ Unicorn Cruise"
          />
          <span>
            <strong>Concert on the River</strong>
            <small>คำสั่งซื้อ #{shortId(booking.id)}</small>
            <em>{tickets.length} บัตร</em>
            <b className={confirmed ? "confirmed" : "review"}>
              {confirmed ? "ยืนยันแล้ว" : labels[booking.status]}
            </b>
          </span>
          <ChevronRight aria-hidden="true" size={23} />
        </button>
      </aside>
      <main className="wallet-main">
        <div className="wallet-title">
          <h1>บัตรของฉัน</h1>
          <p>
            ตรวจสอบบัตร เข้างาน
            และเพลิดเพลินกับประสบการณ์คอนเสิร์ตบนแม่น้ำเจ้าพระยา
          </p>
        </div>
        <div className="wallet-tabs">
          <span className={confirmed ? "active" : ""}>
            บัตรที่ใช้งานได้ (
            {confirmed
              ? tickets.filter((ticket) => !ticket.checked_in_at).length
              : 0}
            )
          </span>
          <span className={booking.status === "review" ? "active" : ""}>
            รอชำระเงิน ({booking.status === "review" ? 1 : 0})
          </span>
          <span>
            ใช้แล้ว ({tickets.filter((ticket) => ticket.checked_in_at).length})
          </span>
        </div>
        {!confirmed ? (
          <div className="wallet-pending-state">
            <Alert severity="info" className="wallet-status-alert">
              คำสั่งซื้อ #{shortId(booking.id)} อยู่ในสถานะ:{" "}
              {labels[booking.status]}. QR จะปรากฏหลังยืนยันการชำระเงิน
            </Alert>
            <SlipUpload
              booking={booking}
              file={slipFile}
              busy={slipBusy}
              error={slipError}
              onFileChange={(next) => {
                setSlipFile(next);
                setSlipError("");
              }}
              onUpload={() => void uploadSlip()}
            />
          </div>
        ) : (
          <div className="wallet-ticket-workspace">
            <section className="wallet-ticket-stack">
              <div className="wallet-order-summary">
                <span>
                  <strong>Concert on the River</strong>
                  <small>ICONSIAM · 19:00</small>
                </span>
                <span>
                  คำสั่งซื้อ #{shortId(booking.id)}
                  <b>ยืนยันแล้ว</b>
                  <small>จำนวน {tickets.length} บัตร</small>
                </span>
              </div>
              {tickets.map((ticket, index) => (
                <button
                  key={ticket.id}
                  className={`wallet-ticket ${selected === index ? "selected" : ""}`}
                  onClick={() => setSelected(index)}
                >
                  <img src="/images/boat/unicorn-night-exterior.jpg" alt="" />
                  <span>
                    <small>
                      บัตรที่ {index + 1} จาก {tickets.length}
                    </small>
                    <strong>
                      {zoneName[booking.zone_id] ?? `โซน ${booking.zone_id}`}
                    </strong>
                    <em>
                      Concert on the River
                      <br />
                      ICONSIAM · 19:00
                    </em>
                  </span>
                  <span className="ticket-quantity">
                    <small>จำนวน</small>
                    <b>1</b>
                    <em>ใบ</em>
                  </span>
                  <span className="show-qr">แสดง QR</span>
                </button>
              ))}
              <div className="wallet-help">
                <Ticket aria-hidden="true" />
                <span>
                  <strong>
                    ทั้ง {tickets.length} บัตรอยู่ในคำสั่งซื้อเดียวกัน
                  </strong>
                  <small>กรุณาแสดงบัตรแต่ละใบเมื่อเข้างาน</small>
                </span>
                <span>
                  <CircleHelp aria-hidden="true" />
                  <strong>มีคำถามเกี่ยวกับบัตร?</strong>
                  <small>ดูคำแนะนำการใช้งาน →</small>
                </span>
              </div>
            </section>
            {active && (
              <TicketPreview
                booking={booking}
                ticketId={active.id}
                index={selected}
                count={tickets.length}
              />
            )}
          </div>
        )}
      </main>
    </section>
  );
}

function SlipUpload({
  booking,
  file,
  busy,
  error,
  onFileChange,
  onUpload,
}: {
  booking: Booking;
  file: File | null;
  busy: boolean;
  error: string;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
}) {
  if (booking.has_slip) {
    return (
      <section className="slip-status-card slip-received">
        <span aria-hidden="true">✓</span>
        <div>
          <strong>ได้รับรูปหลักฐานแล้ว</strong>
          <p>ระบบตรวจพบไฟล์แนบแล้ว และกำลังรอเจ้าหน้าที่ตรวจสอบ</p>
        </div>
      </section>
    );
  }
  if (booking.status !== "held") return null;
  return (
    <section className="slip-status-card">
      <div>
        <strong>แนบรูปหลักฐานการชำระเงิน</strong>
        <p>
          รองรับ PNG หรือ JPG ไม่เกิน 5 MB · ระบบเช็กเพียงว่ามีไฟล์แนบ
          ไม่ได้ตรวจสลิปอัตโนมัติ
        </p>
      </div>
      <label className="slip-file-control">
        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
        <span>{file ? file.name : "เลือกรูปหลักฐาน"}</span>
      </label>
      {error && <Alert severity="error">{error}</Alert>}
      <Button variant="contained" disabled={!file || busy} onClick={onUpload}>
        {busy ? "กำลังอัปโหลด…" : "อัปโหลดหลักฐาน"}
      </Button>
    </section>
  );
}

function TicketPreview({
  booking,
  ticketId,
  index,
  count,
}: {
  booking: Booking;
  ticketId: string;
  index: number;
  count: number;
}) {
  const checkedIn = booking.tickets[index]?.checked_in_at;
  return (
    <aside className="qr-ticket">
      <span className="qr-ticket-count">
        บัตรที่ {index + 1} จาก {count}
      </span>
      <span className="ticket-state">
        ● {checkedIn ? "เช็กอินแล้ว" : "ใช้งานได้"}
      </span>
      <h2>{zoneName[booking.zone_id] ?? `โซน ${booking.zone_id}`}</h2>
      <p>
        Concert on the River
        <br />
        ICONSIAM · 19:00
      </p>
      <QRCodeSVG value={ticketId} size={188} />
      <p className="qr-note">
        <CircleHelp aria-hidden="true" size={20} /> แสดง QR Code นี้ที่จุด
        Check-in
        <br />
        <small>เพื่อสแกนเข้างาน</small>
      </p>
      <dl>
        <div>
          <dt>หมายเลขบัตร</dt>
          <dd>
            {ticketId.slice(0, 14).toUpperCase()} <Copy size={16} />
          </dd>
        </div>
        <div>
          <dt>หมายเลขคำสั่งซื้อ</dt>
          <dd>#{shortId(booking.id)}</dd>
        </div>
        <div>
          <dt>จำนวน</dt>
          <dd>1 ใบ</dd>
        </div>
        <div>
          <dt>สถานะ</dt>
          <dd className="available">
            ● {checkedIn ? "เช็กอินแล้ว" : "ใช้งานได้"}
          </dd>
        </div>
      </dl>
      <div className="ticket-rules">
        <strong>เงื่อนไขการใช้งาน</strong>
        <ul>
          <li>บัตรนี้ใช้เข้าร่วมงาน Concert on the River เท่านั้น</li>
          <li>กรุณาแสดง QR Code จากหน้าจอนี้ ไม่อนุญาตให้ใช้ภาพถ่าย</li>
          <li>1 บัตร ต่อ 1 ท่าน</li>
        </ul>
      </div>
    </aside>
  );
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}
