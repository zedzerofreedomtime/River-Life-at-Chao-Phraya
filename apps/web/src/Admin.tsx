import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import { api, labels, money, type Booking } from "./api";
import ZoneEditor from "./ZoneEditor";

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [rows, setRows] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState("");
  const [search, setSearch] = useState("");

  const refresh = async () => setRows(await api<Booking[]>("/admin/bookings"));

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void api<void>("/admin/session")
      .then(async () => {
        setAuthenticated(true);
        await refresh();
      })
      .catch(() => setAuthenticated(false))
      .finally(() => setCheckingSession(false));
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      await api<void>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ password, remember }),
      });
      setPassword("");
      setAuthenticated(true);
      await refresh();
    });
  }

  async function decide(id: string, action: string) {
    await run(async () => {
      await api(`/admin/bookings/${id}/decision`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await refresh();
    });
  }

  if (checkingSession) {
    return (
      <section className="content-panel">
        กำลังตรวจสอบสิทธิ์เจ้าหน้าที่…
      </section>
    );
  }

  return (
    <section className="content-panel">
      <h2>จัดการการจอง</h2>
      {!authenticated ? (
        <form onSubmit={login} className="flex flex-wrap gap-4 max-w-lg">
          <TextField
            label="รหัสผ่านเจ้าหน้าที่"
            type="password"
            value={password}
            required
            onChange={(event) => setPassword(event.target.value)}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
            }
            label="จำเครื่องนี้ 7 วัน"
          />
          <Button type="submit" variant="contained" disabled={busy}>
            เข้าสู่ระบบ
          </Button>
        </form>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 my-4">
            <Button
              variant="outlined"
              disabled={busy}
              onClick={() => void run(refresh)}
            >
              โหลดรายการล่าสุด
            </Button>
            <Button
              onClick={() =>
                void run(async () => {
                  await api("/admin/logout", { method: "POST" });
                  setAuthenticated(false);
                  setRows([]);
                })
              }
            >
              ออกจากระบบ
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <TextField
              label="ค้นหาชื่อ อีเมล รหัส หรือตัวแทน"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <TextField
              label="สแกน / วางรหัสบัตร"
              value={ticket}
              onChange={(event) => setTicket(event.target.value)}
            />
            <Button
              variant="contained"
              disabled={busy || ticket.length !== 64}
              onClick={() =>
                void run(async () => {
                  await api("/admin/check-in", {
                    method: "POST",
                    body: JSON.stringify({ ticket }),
                  });
                  setMessage("เช็กอินสำเร็จ");
                  setTicket("");
                })
              }
            >
              เช็กอินบัตร
            </Button>
          </div>
          <ZoneEditor token="" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ผู้จอง</th>
                  <th>โซน / จำนวน</th>
                  <th>ยอดรวม</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((booking) =>
                    `${booking.name} ${booking.email} ${booking.id} ${booking.agent_code}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        <strong>{booking.name}</strong>
                        <small>{booking.email}</small>
                        <small>{booking.id}</small>
                        {booking.agent_code && (
                          <small>ตัวแทน: {booking.agent_code}</small>
                        )}
                      </td>
                      <td>
                        {booking.zone_id} / {booking.quantity} ใบ
                      </td>
                      <td>{money(booking.total)}</td>
                      <td>{labels[booking.status]}</td>
                      <td>
                        {booking.status === "confirmed" && (
                          <Button
                            disabled={busy}
                            onClick={() => void decide(booking.id, "no_show")}
                          >
                            No-show
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="muted py-6">ยังไม่มีรายการที่โหลด</p>
            )}
          </div>
        </>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {message}
        </Alert>
      )}
    </section>
  );
}
