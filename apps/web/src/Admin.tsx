import { useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import { api, labels, money, type Booking } from "./api";
import ZoneEditor from "./ZoneEditor";
export default function Admin() {
  const [token, setToken] = useState(
      sessionStorage.getItem("riverlife.admin") ?? "",
    ),
    [password, setPassword] = useState(""),
    [rows, setRows] = useState<Booking[]>([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [ticket, setTicket] = useState(""),
    [search, setSearch] = useState(""),
    [slip, setSlip] = useState("");
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const refresh = async (t = token) =>
    setRows(await api<Booking[]>("/admin/bookings", {}, t));
  async function login(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      const r = await api<{ token: string }>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setToken(r.token);
      sessionStorage.setItem("riverlife.admin", r.token);
      setPassword("");
      await refresh(r.token);
    });
  }
  async function decide(id: string, action: string) {
    await run(async () => {
      await api(
        `/admin/bookings/${id}/decision`,
        { method: "POST", body: JSON.stringify({ action }) },
        token,
      );
      await refresh();
    });
  }
  async function showSlip(id: string) {
    await run(async () => {
      const r = await fetch(`/api/v1/admin/bookings/${id}/slip`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("เปิดหลักฐานไม่ได้");
      if (slip) URL.revokeObjectURL(slip);
      setSlip(URL.createObjectURL(await r.blob()));
    });
  }
  return (
    <section className="content-panel">
      <h2>จัดการการจอง</h2>
      {!token ? (
        <form onSubmit={login} className="flex flex-wrap gap-4 max-w-lg">
          <TextField
            label="รหัสผ่านเจ้าหน้าที่"
            type="password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
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
              onClick={() => run(() => refresh())}
            >
              โหลดรายการล่าสุด
            </Button>
            <Button
              onClick={() =>
                run(async () => {
                  await api("/admin/logout", { method: "POST" }, token);
                  setToken("");
                  setRows([]);
                  sessionStorage.removeItem("riverlife.admin");
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
              onChange={(e) => setSearch(e.target.value)}
            />
            <TextField
              label="สแกน / วางรหัสบัตร"
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
            />
            <Button
              variant="contained"
              disabled={busy || ticket.length !== 64}
              onClick={() =>
                run(async () => {
                  await api(
                    "/admin/check-in",
                    { method: "POST", body: JSON.stringify({ ticket }) },
                    token,
                  );
                  setMessage("เช็กอินสำเร็จ");
                  setTicket("");
                })
              }
            >
              เช็กอินบัตร
            </Button>
          </div>
          <ZoneEditor token={token} />
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
                  .filter((b) =>
                    `${b.name} ${b.email} ${b.id} ${b.agent_code}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((b) => (
                    <tr key={b.id}>
                      <td>
                        <strong>{b.name}</strong>
                        <small>{b.email}</small>
                        <small>{b.id}</small>
                        {b.agent_code && <small>ตัวแทน: {b.agent_code}</small>}
                      </td>
                      <td>
                        {b.zone_id} / {b.quantity} ใบ
                      </td>
                      <td>{money(b.total)}</td>
                      <td>{labels[b.status]}</td>
                      <td>
                        {b.has_slip && (
                          <Button
                            onClick={() => showSlip(b.id)}
                            disabled={busy}
                          >
                            ดูหลักฐาน
                          </Button>
                        )}
                        {b.status === "review" && (
                          <>
                            <Button
                              disabled={busy}
                              onClick={() => decide(b.id, "approve")}
                            >
                              อนุมัติ
                            </Button>
                            <Button
                              color="error"
                              disabled={busy}
                              onClick={() => decide(b.id, "reject")}
                            >
                              ไม่อนุมัติ
                            </Button>
                          </>
                        )}
                        {b.status === "confirmed" && (
                          <Button
                            disabled={busy}
                            onClick={() => decide(b.id, "no_show")}
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
              <p className="muted py-6">
                ยังไม่มีรายการที่โหลด กด “โหลดรายการล่าสุด”
              </p>
            )}
          </div>
          {slip && (
            <div className="slip-preview">
              <Button
                onClick={() => {
                  URL.revokeObjectURL(slip);
                  setSlip("");
                }}
              >
                ปิดหลักฐาน
              </Button>
              <img src={slip} alt="หลักฐานการชำระเงิน" />
            </div>
          )}
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
