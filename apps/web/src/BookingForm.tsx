import { useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import { Minus, Plus, Ticket } from "lucide-react";
import { api, money, newToken, type Booking, type Zone } from "./api";
import type { Language } from "./i18n";
export default function BookingForm({
  zones,
  selected,
  onSelect,
  onBooked,
  isAuthenticated,
  onRequireLogin,
  accountName,
  accountEmail,
  language,
}: {
  zones: Zone[];
  selected: string;
  onSelect: (v: string) => void;
  onBooked: (b: Booking, t: string) => void;
  isAuthenticated: boolean;
  onRequireLogin: () => void;
  accountName: string;
  accountEmail: string;
  language: Language;
}) {
  const en = language === "en";
  const [quantity, setQuantity] = useState(1),
    [agent, setAgent] = useState(""),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [attempt, setAttempt] = useState<{
    fingerprint: string;
    key: string;
    token: string;
  } | null>(null);
  const zone = zones.find((z) => z.id === selected);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireLogin();
      return;
    }
    if (!zone || !accepted) return;
    setBusy(true);
    setError("");
    const body = {
      zone_id: selected,
      quantity,
      name: accountName,
      email: accountEmail,
      agent_code: agent.trim(),
    };
    const fingerprint = JSON.stringify(body);
    const a =
      attempt?.fingerprint === fingerprint
        ? attempt
        : { fingerprint, key: crypto.randomUUID(), token: newToken() };
    setAttempt(a);
    try {
      const b = await api<Booking>(
        "/bookings",
        {
          method: "POST",
          headers: { "Idempotency-Key": a.key },
          body: fingerprint,
        },
        a.token,
      );
      onBooked(b, a.token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="booking-panel" onSubmit={submit}>
      <h2>{en ? "Buy concert tickets" : "จองบัตรคอนเสิร์ตบนเรือ"}</h2>
      <p className="muted">
        เลือกโซนและจำนวนบัตร
        {isAuthenticated
          ? en
            ? " before confirming your reservation."
            : " ก่อนยืนยันการจอง"
          : en
            ? " then log in to buy tickets."
            : " แล้วเข้าสู่ระบบเพื่อซื้อบัตร"}
      </p>
      <label className="field-label">{en ? "Zone" : "โซน"}</label>
      <div className="zone-options">
        {zones.map((z) => (
          <button
            type="button"
            disabled={busy}
            key={z.id}
            className={selected === z.id ? "active" : ""}
            aria-pressed={selected === z.id}
            onClick={() => onSelect(z.id)}
          >
            <strong>{z.name}</strong>
            <small>{en ? "Provisional price" : "ราคาชั่วคราว"}</small>
            <b>{money(z.price)}</b>
          </button>
        ))}
      </div>
      <div className="quantity-row">
        <div>
          <label className="field-label">{en ? "Tickets" : "จำนวนบัตร"}</label>
          <div className="counter">
            <Button
              aria-label={en ? "Decrease tickets" : "ลดจำนวนบัตร"}
              disabled={busy || quantity <= 1}
              onClick={() => setQuantity((n) => n - 1)}
            >
              <Minus size={17} />
            </Button>
            <output>{quantity}</output>
            <Button
              aria-label={en ? "Increase tickets" : "เพิ่มจำนวนบัตร"}
              disabled={busy || quantity >= Math.min(10, zone?.available ?? 0)}
              onClick={() => setQuantity((n) => n + 1)}
            >
              <Plus size={17} />
            </Button>
          </div>
        </div>
        <div>
          <label className="field-label">{en ? "Total" : "ยอดรวม"}</label>
          <strong className="price">
            {money((zone?.price ?? 0) * quantity)}
          </strong>
        </div>
      </div>
      <hr />
      {isAuthenticated ? (
        <>
          <h3>{en ? "Booking details" : "ข้อมูลผู้จอง"}</h3>
          <div className="booking-account">
            <span>{en ? "Booking account" : "บัญชีที่ใช้จอง"}</span>
            <strong>{accountName}</strong>
            <small>{accountEmail}</small>
          </div>
          <TextField
            label={en ? "Agent code (optional)" : "รหัสตัวแทน (ถ้ามี)"}
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            inputProps={{ maxLength: 40 }}
            sx={{ mt: 2 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
            }
            label={
              <span className="consent">
                {en
                  ? "I understand that arriving after boarding time is a no-show and is not refundable."
                  : "รับทราบว่ามาไม่ทันเรือถือเป็น No-show ไม่คืนเงินหรือใช้สิทธิ์ใหม่"}
              </span>
            }
          />
        </>
      ) : (
        <div className="booking-login-prompt">
          <h3>{en ? "Your zone is selected" : "พร้อมเลือกโซนแล้ว"}</h3>
          <p>
            {en
              ? "Log in to verify your account before purchasing tickets."
              : "เข้าสู่ระบบเพื่อยืนยันตัวตนก่อนดำเนินการซื้อบัตร"}
          </p>
        </div>
      )}
      {error && (
        <Alert severity="error" className="mb-3">
          {error}
        </Alert>
      )}
      <Button
        variant="contained"
        fullWidth
        size="large"
        type={isAuthenticated ? "submit" : "button"}
        startIcon={<Ticket size={19} />}
        onClick={isAuthenticated ? undefined : onRequireLogin}
        disabled={
          busy ||
          !zone ||
          quantity > zone.available ||
          (isAuthenticated && !accepted)
        }
      >
        {busy
          ? en
            ? "Creating reservation…"
            : "กำลังสร้างรายการ…"
          : isAuthenticated
            ? en
              ? "Confirm reservation and pay"
              : "ยืนยันการจองและไปชำระเงิน"
            : en
              ? "Buy tickets"
              : "ซื้อบัตร"}
      </Button>
      <p className="form-foot">
        {en
          ? "Your selection will be held for 15 minutes while you complete payment."
          : "รายการจะถูกสำรองไว้ 15 นาที เพื่อให้คุณชำระเงินในขั้นตอนถัดไป"}
      </p>
    </form>
  );
}
