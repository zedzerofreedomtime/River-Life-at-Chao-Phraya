import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import { api, type Zone } from "../../data/api";
import type { Language } from "../../data/i18n";
import { useStaffData } from "./StaffTools";
type Member = { id: string; name: string; email: string; role: string };
type Program = {
  title: string;
  date: string | null;
  boarding: string;
  departure: string;
  pier: string;
  pier_number: number;
  duration_minutes: number;
};

export default function AdminTools({
  language,
  zones,
  currentEmail,
  onUpdated,
}: {
  language: Language;
  zones: Zone[];
  currentEmail: string;
  onUpdated: () => void;
}) {
  const en = language === "en";
  const {
    data: members,
    reload: reloadMembers,
    error: memberError,
  } = useStaffData<Member[]>("/dashboard/admin/users");
  const {
    data: program,
    reload: reloadProgram,
    error: programError,
  } = useStaffData<Program>("/dashboard/admin/program");
  const [query, setQuery] = useState("");
  return (
    <>
      <section className="staff-panel">
        <h2>
          {en ? "Zone capacity and demo prices" : "จัดการโควตาและราคาตัวอย่าง"}
        </h2>
        <p>
          {en
            ? "Capacity cannot be reduced below reserved tickets. Price changes apply to new bookings only."
            : "ลดโควตาต่ำกว่ายอดที่จองไว้ไม่ได้ ราคาที่เปลี่ยนใช้กับรายการใหม่เท่านั้น"}
        </p>
        <div className="staff-editor-grid">
          {zones.map((z) => (
            <ZoneEditor
              key={z.id}
              zone={z}
              language={language}
              onSaved={onUpdated}
            />
          ))}
        </div>
      </section>
      <section className="staff-panel">
        <h2>{en ? "Current programme settings" : "ตั้งค่าโปรแกรมปัจจุบัน"}</h2>
        <p>
          {en
            ? "One demonstration programme is currently configured. A blank date means not announced. This does not publish a live sailing or enable real payments."
            : "ขณะนี้ตั้งค่าได้ 1 โปรแกรมสำหรับสาธิต เว้นวันว่างไว้เมื่อยังไม่ประกาศ การบันทึกนี้ไม่เปิดขายรอบจริงหรือเปิดรับเงินจริง"}
        </p>
        {programError && <Alert severity="error">{programError}</Alert>}
        {program && (
          <ProgramEditor
            program={program}
            language={language}
            onSaved={() => {
              void reloadProgram();
              onUpdated();
            }}
          />
        )}
      </section>
      <section className="staff-panel">
        <h2>
          {en ? "Member and staff roles" : "จัดการสิทธิ์สมาชิกและพนักงาน"}
        </h2>
        <p>
          {en
            ? "Latest 200 accounts. Staff register an account first, then an admin assigns a role. You cannot change your own role."
            : "แสดง 200 บัญชีล่าสุด ให้พนักงานสมัครบัญชีก่อน แล้วแอดมินกำหนดสิทธิ์ ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้"}
        </p>
        {memberError && <Alert severity="error">{memberError}</Alert>}
        <label>
          {en ? "Search members" : "ค้นหาสมาชิก"}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="staff-booking-list">
          {members
            ?.filter((u) =>
              `${u.name} ${u.email} ${u.role}`
                .toLocaleLowerCase()
                .includes(query.toLocaleLowerCase()),
            )
            .map((u) => (
              <RoleEditor
                key={u.id}
                member={u}
                self={u.email === currentEmail}
                language={language}
                onSaved={() => void reloadMembers()}
              />
            ))}
        </div>
      </section>
    </>
  );
}
function ZoneEditor({
  zone,
  language,
  onSaved,
}: {
  zone: Zone;
  language: Language;
  onSaved: () => void;
}) {
  const en = language === "en";
  const [name, setName] = useState(zone.name),
    [capacity, setCapacity] = useState(zone.capacity),
    [price, setPrice] = useState(String(zone.price / 100));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    setName(zone.name);
    setCapacity(zone.capacity);
    setPrice(String(zone.price / 100));
  }, [zone.name, zone.capacity, zone.price]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await api(`/dashboard/admin/zones/${encodeURIComponent(zone.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          capacity,
          price: Math.round(Number(price) * 100),
        }),
      });
      setSaved(true);
      onSaved();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="staff-zone-editor" onSubmit={submit}>
      <h3>
        {en ? "Zone" : "โซน"} {zone.id}
      </h3>
      <label>
        {en ? "Zone name" : "ชื่อโซน"}
        <input
          required
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        {en ? "Capacity" : "โควตารวม"}
        <input
          required
          type="number"
          min={0}
          max={1000}
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
        />
      </label>
      <label>
        {en ? "Price (THB)" : "ราคา (บาท)"}
        <input
          required
          type="number"
          min={0}
          max={100000}
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </label>
      {error && <Alert severity="error">{error}</Alert>}
      {saved && <p role="status">{en ? "Saved" : "บันทึกแล้ว"}</p>}
      <button disabled={busy} type="submit">
        {en ? "Save zone" : "บันทึกโซน"}
      </button>
    </form>
  );
}
function ProgramEditor({
  program,
  language,
  onSaved,
}: {
  program: Program;
  language: Language;
  onSaved: () => void;
}) {
  const en = language === "en";
  const [value, setValue] = useState(program),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/dashboard/admin/program", {
        method: "PUT",
        body: JSON.stringify(value),
      });
      setMessage(en ? "Programme saved" : "บันทึกโปรแกรมแล้ว");
      onSaved();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <div className="staff-form-grid">
        <label>
          {en ? "Programme title" : "ชื่อโปรแกรม"}
          <input
            required
            maxLength={160}
            value={value.title}
            onChange={(e) => setValue({ ...value, title: e.target.value })}
          />
        </label>
        <label>
          {en ? "Demo date (optional)" : "วันตัวอย่าง (เว้นว่างได้)"}
          <input
            type="date"
            value={value.date ?? ""}
            onChange={(e) =>
              setValue({ ...value, date: e.target.value || null })
            }
          />
        </label>
        <label>
          {en ? "Boarding time" : "เวลาขึ้นเรือ"}
          <input
            required
            type="time"
            value={value.boarding}
            onChange={(e) => setValue({ ...value, boarding: e.target.value })}
          />
        </label>
        <label>
          {en ? "Departure time" : "เวลาออกเรือ"}
          <input
            required
            type="time"
            value={value.departure}
            onChange={(e) => setValue({ ...value, departure: e.target.value })}
          />
        </label>
        <label>
          {en ? "Pier" : "ท่าเรือ"}
          <input
            required
            maxLength={120}
            value={value.pier}
            onChange={(e) => setValue({ ...value, pier: e.target.value })}
          />
        </label>
        <label>
          {en ? "Pier number" : "หมายเลขท่า"}
          <input
            required
            type="number"
            min={1}
            max={100}
            value={value.pier_number}
            onChange={(e) =>
              setValue({ ...value, pier_number: Number(e.target.value) })
            }
          />
        </label>
        <label>
          {en ? "Duration (minutes)" : "ระยะเวลา (นาที)"}
          <input
            required
            type="number"
            min={1}
            max={1440}
            value={value.duration_minutes}
            onChange={(e) =>
              setValue({ ...value, duration_minutes: Number(e.target.value) })
            }
          />
        </label>
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      {message && <p role="status">{message}</p>}
      <button type="submit" disabled={busy}>
        {en ? "Save programme" : "บันทึกโปรแกรม"}
      </button>
    </form>
  );
}
function RoleEditor({
  member,
  self,
  language,
  onSaved,
}: {
  member: Member;
  self: boolean;
  language: Language;
  onSaved: () => void;
}) {
  const en = language === "en";
  const [role, setRole] = useState(member.role),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => setRole(member.role), [member.role]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || self || role === member.role) return;
    setBusy(true);
    setError("");
    try {
      await api(
        `/dashboard/admin/users/${encodeURIComponent(member.id)}/role`,
        { method: "PATCH", body: JSON.stringify({ role }) },
      );
      onSaved();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="staff-booking-row" onSubmit={submit}>
      <div>
        <strong>{member.name}</strong>
        <small>{member.email}</small>
        {self && <small>{en ? "Your account" : "บัญชีของคุณ"}</small>}
      </div>
      <label>
        {en ? "Role" : "สิทธิ์"}
        <select
          aria-label={en ? "Role" : "สิทธิ์"}
          value={role}
          disabled={self || busy}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="user">User</option>
          <option value="sales">Sales</option>
          <option value="operator">Operator</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <button type="submit" disabled={self || busy || role === member.role}>
        {en ? "Save role" : "บันทึกสิทธิ์"}
      </button>
      {error && <Alert severity="error">{error}</Alert>}
    </form>
  );
}
