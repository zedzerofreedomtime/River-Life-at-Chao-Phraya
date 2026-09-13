import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import { QRCodeSVG } from "qrcode.react";
import { api, labels, money, type Booking } from "./api";
export default function MyBooking({
  initial,
  initialToken,
}: {
  initial: Booking | null;
  initialToken: string;
}) {
  const [b, setB] = useState(initial),
    [id, setId] = useState(
      initial?.id ?? sessionStorage.getItem("riverlife.booking.id") ?? "",
    ),
    [token, setToken] = useState(
      initialToken || sessionStorage.getItem("riverlife.booking.token") || "",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [now, setNow] = useState(Date.now());
  const load = async () => {
    setBusy(true);
    setError("");
    try {
      setB(
        await api<Booking>(`/bookings/${encodeURIComponent(id)}`, {}, token),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    const savedId =
      initial?.id || sessionStorage.getItem("riverlife.booking.id");
    const savedToken =
      initialToken || sessionStorage.getItem("riverlife.booking.token");
    if (!savedId || !savedToken) return;
    let active = true;
    api<Booking>(`/bookings/${encodeURIComponent(savedId)}`, {}, savedToken)
      .then((latest) => {
        if (active) setB(latest);
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [initial?.id, initialToken]);
  async function upload() {
    if (!file || !b) return;
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      data.append("slip", file);
      await api(
        `/bookings/${b.id}/slip`,
        { method: "POST", body: data },
        token,
      );
      setB(await api<Booking>(`/bookings/${b.id}`, {}, token));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const seconds = b
    ? Math.max(0, Math.floor((Date.parse(b.expires_at) - now) / 1000))
    : 0;
  return (
    <section className="content-panel">
      <h2>การจองของฉัน</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          label="รหัสการจอง"
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setB(null);
          }}
        />
        <TextField
          label="รหัสเข้าถึงส่วนตัว"
          type="password"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            setB(null);
          }}
        />
        <Button
          variant="outlined"
          onClick={load}
          disabled={busy || !id || !token}
        >
          ตรวจสอบ / อัปเดตสถานะ
        </Button>
      </div>
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {b && (
        <div className="booking-detail">
          <div className="flex flex-wrap justify-between gap-3">
            <h3>
              โซน {b.zone_id} · {b.quantity} ใบ · {money(b.total)}
            </h3>
            <strong>
              {b.status === "held" && seconds === 0
                ? "หมดเวลาจอง"
                : labels[b.status]}
            </strong>
          </div>
          <p>
            {b.name} · {b.email}
          </p>
          <Alert severity="info">
            เก็บรหัสการจองและรหัสเข้าถึงนี้ไว้เพื่อเปิดบัตรจากเครื่องอื่น
            อย่าส่งรหัสเข้าถึงให้บุคคลอื่น
          </Alert>
          <details className="my-4">
            <summary>แสดงรหัสเข้าถึงสำหรับเก็บรักษา</summary>
            <code className="break-all">{token}</code>
          </details>
          {b.status === "held" && seconds > 0 && (
            <>
              <p>
                เวลาส่งหลักฐานคงเหลือ{" "}
                <b>
                  {Math.floor(seconds / 60)}:
                  {String(seconds % 60).padStart(2, "0")}
                </b>
              </p>
              <Alert severity="warning">
                ระบบทดลอง — ไม่ต้องโอนเงินจริง ใช้ภาพทดสอบ PNG/JPG ไม่เกิน 5 MB
              </Alert>
              <input
                aria-label="อัปโหลดหลักฐาน"
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="my-4 block max-w-full"
              />
              <Button
                variant="contained"
                disabled={busy || !file || file.size > 5 * 1024 * 1024}
                onClick={upload}
              >
                ส่งหลักฐานให้เจ้าหน้าที่ตรวจ
              </Button>
            </>
          )}
          {b.status === "review" && (
            <p>ได้รับหลักฐานแล้ว โควตาของคุณยังถูกกันไว้ระหว่างรอตรวจสอบ</p>
          )}
          {b.status === "confirmed" && (
            <div className="ticket-grid">
              {b.tickets.map((t, i) => (
                <article className="ticket" key={t.id}>
                  <h3>
                    บัตร {i + 1} / {b.quantity}
                  </h3>
                  <QRCodeSVG value={t.id} size={160} />
                  <p>
                    {t.checked_in_at ? "เช็กอินแล้ว" : "แสดง QR ที่จุดเช็กอิน"}
                  </p>
                  <details>
                    <summary>รหัสสำหรับเจ้าหน้าที่</summary>
                    <code className="break-all">{t.id}</code>
                  </details>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
