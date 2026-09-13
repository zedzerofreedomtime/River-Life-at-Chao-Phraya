import { useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import { api, type EventInfo, type Zone } from "./api";
export default function ZoneEditor({ token }: { token: string }) {
  const [zones, setZones] = useState<Zone[]>([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    setError("");
    try {
      setZones((await api<EventInfo>("/event")).zones);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(z: Zone) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(
        `/admin/zones/${z.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: z.name,
            capacity: z.capacity,
            price: z.price,
          }),
        },
        token,
      );
      setMessage("บันทึกโซน " + z.id + " แล้ว รายการที่จองไปแล้วคงราคาเดิม");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="my-6">
      <summary>ตั้งราคาและโควตาโซน</summary>
      <Button onClick={load} disabled={busy}>
        โหลดโซน
      </Button>
      {zones.map((z) => (
        <div className="grid gap-3 sm:grid-cols-4 my-4" key={z.id}>
          <TextField
            label={"ชื่อโซน " + z.id}
            value={z.name}
            onChange={(e) =>
              setZones((a) =>
                a.map((v) =>
                  v.id === z.id ? { ...v, name: e.target.value } : v,
                ),
              )
            }
          />
          <TextField
            label="โควตา"
            type="number"
            inputProps={{ min: 0, max: 1000 }}
            value={z.capacity}
            onChange={(e) =>
              setZones((a) =>
                a.map((v) =>
                  v.id === z.id
                    ? { ...v, capacity: Number(e.target.value) }
                    : v,
                ),
              )
            }
          />
          <TextField
            label="ราคาบัตร (บาท)"
            type="number"
            inputProps={{ min: 0, step: 1 }}
            value={z.price / 100}
            onChange={(e) =>
              setZones((a) =>
                a.map((v) =>
                  v.id === z.id
                    ? { ...v, price: Math.round(Number(e.target.value) * 100) }
                    : v,
                ),
              )
            }
          />
          <Button onClick={() => save(z)} disabled={busy}>
            บันทึก
          </Button>
        </div>
      ))}
      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
    </details>
  );
}
