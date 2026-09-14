import { useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import { Minus, Plus, Ticket } from "lucide-react";
import { api, money, newToken, type Booking, type Zone } from "./api";
export default function BookingForm({
  zones,
  selected,
  onSelect,
  onBooked,
}: {
  zones: Zone[];
  selected: string;
  onSelect: (v: string) => void;
  onBooked: (b: Booking, t: string) => void;
}) {
  const [quantity, setQuantity] = useState(1),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [agent, setAgent] = useState(""),
    [proof, setProof] = useState<File | null>(null),
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
    if (!zone || !accepted || !proof) return;
    setBusy(true);
    setError("");
    const body = {
      zone_id: selected,
      quantity,
      name: name.trim(),
      email: email.trim(),
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
      const form = new FormData();
      form.append("slip", proof);
      await api(
        `/bookings/${b.id}/slip`,
        { method: "POST", body: form },
        a.token,
      );
      onBooked(await api<Booking>(`/bookings/${b.id}`, {}, a.token), a.token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="booking-panel" onSubmit={submit}>
      <h2>จองบัตรคอนเสิร์ตบนเรือ</h2>
      <p className="muted">
        เลือกโซน จำนวนบัตร กรอกข้อมูล และแนบสลิปเพียงครั้งเดียว
      </p>
      <label className="field-label">โซน</label>
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
            <small>ราคาทดลอง</small>
            <b>{money(z.price)}</b>
          </button>
        ))}
      </div>
      <div className="quantity-row">
        <div>
          <label className="field-label">จำนวนบัตร</label>
          <div className="counter">
            <Button
              aria-label="ลดจำนวนบัตร"
              disabled={busy || quantity <= 1}
              onClick={() => setQuantity((n) => n - 1)}
            >
              <Minus size={17} />
            </Button>
            <output>{quantity}</output>
            <Button
              aria-label="เพิ่มจำนวนบัตร"
              disabled={busy || quantity >= Math.min(10, zone?.available ?? 0)}
              onClick={() => setQuantity((n) => n + 1)}
            >
              <Plus size={17} />
            </Button>
          </div>
        </div>
        <div>
          <label className="field-label">ยอดรวม</label>
          <strong className="price">
            {money((zone?.price ?? 0) * quantity)}
          </strong>
        </div>
      </div>
      <hr />
      <h3>ข้อมูลผู้จอง</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="ชื่อ–นามสกุล"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          inputProps={{ maxLength: 120 }}
        />
        <TextField
          label="อีเมล"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          inputProps={{ maxLength: 200 }}
        />
      </div>
      <TextField
        label="รหัสตัวแทน (ถ้ามี)"
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
            รับทราบว่ามาไม่ทันเรือถือเป็น No-show ไม่คืนเงินหรือใช้สิทธิ์ใหม่
          </span>
        }
      />
      <div className="checkout-proof">
        <strong>แนบสลิปการชำระเงิน</strong>
        <span>แนบครั้งเดียวก่อนยืนยันการจอง · PNG/JPG ไม่เกิน 5 MB</span>
        <Button component="label" variant="outlined" disabled={busy}>
          {proof ? "เปลี่ยนรูปสลิป" : "เลือกรูปสลิป"}
          <input
            hidden
            aria-label="หลักฐานการชำระเงิน"
            type="file"
            accept="image/png,image/jpeg"
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              if (next && next.size > 5 * 1024 * 1024) {
                setProof(null);
                setError("รูปหลักฐานต้องมีขนาดไม่เกิน 5 MB");
                return;
              }
              setError("");
              setProof(next);
            }}
          />
        </Button>
        <small className={proof ? "selected" : ""}>
          {proof ? `เลือกแล้ว: ${proof.name}` : "ยังไม่ได้เลือกรูปสลิป"}
        </small>
      </div>
      {error && (
        <Alert severity="error" className="mb-3">
          {error}
        </Alert>
      )}
      <Button
        variant="contained"
        fullWidth
        size="large"
        type="submit"
        startIcon={<Ticket size={19} />}
        disabled={
          busy || !accepted || !proof || !zone || quantity > zone.available
        }
      >
        {busy ? "กำลังออก QR Ticket…" : "ยืนยันการจองและรับ QR"}
      </Button>
      <p className="form-foot">
        แนบหลักฐานเพียงครั้งเดียว • ระบบจะออก QR Ticket ทันที
      </p>
    </form>
  );
}
