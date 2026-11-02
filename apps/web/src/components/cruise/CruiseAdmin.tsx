import { useEffect, useState } from "react";
import { api } from "../../data/api";
import { sailingDate, type Sailing, type Vessel } from "../../data/cruises";
import type { Language } from "../../data/i18n";
const fresh = (): Sailing => ({
  id: "",
  vessel_id: "unicorn",
  title: "",
  departure_at: null,
  boarding_at: null,
  pier: "",
  status: "draft",
  revision: 0,
  tables: [],
  verified: false,
  extras: [],
});
const localDate = (v: string | null) =>
  v
    ? new Date(new Date(v).getTime() + 7 * 3600000).toISOString().slice(0, 16)
    : "";
const isoDate = (v: string) =>
  v ? new Date(`${v}:00+07:00`).toISOString() : null;
export default function CruiseAdmin({ language }: { language: Language }) {
  const en = language === "en";
  const [boats, setBoats] = useState<Vessel[]>([]),
    [items, setItems] = useState<Sailing[]>([]),
    [draft, setDraft] = useState<Sailing>(fresh),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const [b, s] = await Promise.all([
      api<Vessel[]>("/cruises"),
      api<Sailing[]>("/dashboard/admin/cruises/sailings"),
    ]);
    setBoats(b.filter((boat) => boat.id === "unicorn"));
    setItems(s.filter((sailing) => sailing.vessel_id === "unicorn"));
  }
  useEffect(() => {
    void load().catch(() =>
      setError(
        en
          ? "Unable to load sailing management."
          : "โหลดข้อมูลจัดการรอบเรือไม่ได้",
      ),
    );
  }, [en]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = await api<Sailing>("/dashboard/admin/cruises/sailings", {
        method: "POST",
        body: JSON.stringify(draft),
      });
      setDraft(saved);
      await load();
      setMessage(en ? "Saved to database." : "บันทึกลงฐานข้อมูลแล้ว");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }
  async function uploadImage(file: File, index: number) {
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("image", file);
      const response = await fetch("/api/v1/dashboard/admin/cruises/images", {
        method: "POST",
        credentials: "include",
        body,
      });
      if (!response.ok)
        throw new Error(
          en
            ? "Image upload failed. Use JPEG, PNG or WebP up to 5 MB."
            : "อัปโหลดไม่สำเร็จ ใช้ JPEG, PNG หรือ WebP ไม่เกิน 5 MB",
        );
      const data = await response.json();
      setDraft((previous) => ({
        ...previous,
        extras: previous.extras?.map((item, i) =>
          i === index ? { ...item, image: data.url } : item,
        ),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rx-admin">
      <h2>{en ? "Manage vessels & sailings" : "จัดการเรือและรอบเดินทาง"}</h2>
      <p>
        {en
          ? "New sailings are drafts. Publish only verified dates, prices and seating plans. Set whole-table and individual-chair prices separately. All times are Bangkok time."
          : "รอบใหม่เป็นฉบับร่าง เปิดรับจองเมื่อวัน ราคา และผังโต๊ะยืนยันแล้วเท่านั้น ราคาต่อโต๊ะเต็ม ทุกเวลาเป็นเวลาไทย"}
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <div className="rx-admin-layout">
        <div>
          <button
            type="button"
            onClick={() => {
              setDraft(fresh());
              setMessage("");
              setError("");
            }}
          >
            {en ? "New draft" : "เพิ่มรอบฉบับร่าง"}
          </button>
          {items.length === 0 && (
            <p>{en ? "No sailings yet" : "ยังไม่มีรอบเดินทาง"}</p>
          )}
          {items.map((s) => (
            <button
              className="rx-admin-item"
              key={s.id}
              onClick={() => {
                setDraft(s);
                setMessage("");
                setError("");
              }}
            >
              <strong>{s.title}</strong>
              <span>
                {s.vessel_id} · {s.status}
              </span>
              <small>{sailingDate(s.departure_at, en)}</small>
            </button>
          ))}
        </div>
        <form onSubmit={save}>
          <label htmlFor="admin-vessel">{en ? "Vessel" : "เรือ"}</label>
          <select
            id="admin-vessel"
            value={draft.vessel_id}
            onChange={(e) => setDraft({ ...draft, vessel_id: e.target.value })}
          >
            {boats.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <label htmlFor="admin-title">
            {en ? "Sailing title" : "ชื่อรอบเดินทาง"}
          </label>
          <input
            id="admin-title"
            required
            maxLength={240}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <label htmlFor="admin-departure">
            {en ? "Departure (Bangkok)" : "วันและเวลาออกเรือ (ไทย)"}
          </label>
          <input
            id="admin-departure"
            type="datetime-local"
            value={localDate(draft.departure_at)}
            onChange={(e) =>
              setDraft({ ...draft, departure_at: isoDate(e.target.value) })
            }
          />
          <label htmlFor="admin-boarding">
            {en ? "Boarding (Bangkok)" : "วันและเวลาขึ้นเรือ (ไทย)"}
          </label>
          <input
            id="admin-boarding"
            type="datetime-local"
            value={localDate(draft.boarding_at)}
            onChange={(e) =>
              setDraft({ ...draft, boarding_at: isoDate(e.target.value) })
            }
          />
          <label htmlFor="admin-pier">
            {en ? "Departure pier" : "ท่าเรือ / จุดขึ้นเรือ"}
          </label>
          <input
            id="admin-pier"
            maxLength={240}
            value={draft.pier}
            onChange={(e) => setDraft({ ...draft, pier: e.target.value })}
          />
          <label htmlFor="admin-sailing-status">
            {en ? "Publication status" : "สถานะรอบ"}
          </label>
          <select
            id="admin-sailing-status"
            value={draft.status}
            onChange={(e) =>
              setDraft({
                ...draft,
                status: e.target.value as Sailing["status"],
              })
            }
          >
            <option value="draft">
              {en ? "Draft — hidden" : "ฉบับร่าง — ยังไม่แสดงให้ลูกค้าจอง"}
            </option>
            <option value="published">
              {en
                ? "Open for temporary reservations"
                : "เปิดรับสำรองโต๊ะชั่วคราว"}
            </option>
            <option value="closed">{en ? "Closed" : "ปิดรับจอง"}</option>
          </select>
          <h3>{en ? "Confirmed table plan" : "ผังโต๊ะที่ยืนยันแล้ว"}</h3>
          <p>
            {en
              ? "Do not enter estimated tables as confirmed inventory."
              : "กรอกเฉพาะโต๊ะที่ยืนยันแล้ว ไม่ใช้จำนวนโต๊ะประมาณการเปิดรับจอง"}
          </p>
          {draft.tables.map((t, i) => (
            <fieldset key={i} className="rx-admin-table">
              <legend>
                {en ? "Table" : "โต๊ะ"} {i + 1}
              </legend>
              <label>
                {en ? "Plan X (200–800)" : "ตำแหน่ง X ในผัง (200–800)"}
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={t.x ?? 0}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      tables: draft.tables.map((v, j) =>
                        j === i ? { ...v, x: Number(e.target.value) } : v,
                      ),
                    })
                  }
                />
              </label>
              <label>
                {en ? "Plan Y (110–470)" : "ตำแหน่ง Y ในผัง (110–470)"}
                <input
                  type="number"
                  min={0}
                  max={580}
                  value={t.y ?? 0}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      tables: draft.tables.map((v, j) =>
                        j === i ? { ...v, y: Number(e.target.value) } : v,
                      ),
                    })
                  }
                />
              </label>
              <label>
                {en ? "ID" : "หมายเลข"}
                <input
                  required
                  aria-label={`Table ${i + 1} ID`}
                  maxLength={20}
                  value={t.id}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      tables: draft.tables.map((v, j) =>
                        j === i ? { ...v, id: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              <label>
                {en ? "Deck" : "ชั้น"}
                <select
                  aria-label={`Table ${i + 1} deck`}
                  value={t.deck}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      tables: draft.tables.map((v, j) =>
                        j === i
                          ? { ...v, deck: e.target.value as "upper" | "lower" }
                          : v,
                      ),
                    })
                  }
                >
                  <option value="upper">{en ? "Upper" : "ชั้นบน"}</option>
                  <option value="lower">{en ? "Lower" : "ชั้นล่าง"}</option>
                </select>
              </label>
              <label>
                {en ? "Seats" : "ที่นั่ง"}
                <input
                  aria-label={`Table ${i + 1} seats`}
                  type="number"
                  required
                  min={1}
                  max={20}
                  value={t.seats}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      tables: draft.tables.map((v, j) =>
                        j === i ? { ...v, seats: Number(e.target.value) } : v,
                      ),
                    })
                  }
                />
              </label>
              <label>
                {en
                  ? "THB / chair (0 disables individual booking)"
                  : "บาท / เก้าอี้ (0 = ยังไม่เปิดจองรายเก้าอี้)"}
                <input
                  aria-label={`Table ${i + 1} seat price`}
                  type="number"
                  min={0}
                  max={1000000}
                  step={0.01}
                  value={(t.seat_price ?? 0) / 100}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      tables: draft.tables.map((v, j) =>
                        j === i
                          ? {
                              ...v,
                              seat_price: Math.round(
                                Number(e.target.value) * 100,
                              ),
                            }
                          : v,
                      ),
                    })
                  }
                />
              </label>
              <label>
                {en ? "THB / table" : "บาท / โต๊ะ"}
                <input
                  aria-label={`Table ${i + 1} price`}
                  type="number"
                  required
                  min={0.01}
                  max={1000000}
                  step={0.01}
                  value={t.price / 100 || ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      tables: draft.tables.map((v, j) =>
                        j === i
                          ? {
                              ...v,
                              price: Math.round(Number(e.target.value) * 100),
                            }
                          : v,
                      ),
                    })
                  }
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    tables: draft.tables.filter((_, j) => j !== i),
                  })
                }
              >
                {en ? "Remove" : "ลบโต๊ะ"}
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            disabled={draft.tables.length >= 150}
            onClick={() =>
              setDraft({
                ...draft,
                tables: [
                  ...draft.tables,
                  {
                    id: "",
                    deck: "upper",
                    seats: 4,
                    price: 0,
                    available: true,
                  },
                ],
              })
            }
          >
            {en ? "Add table" : "เพิ่มโต๊ะ"}
          </button>
          <h3>{en ? "Optional food & wine" : "อาหารพิเศษและไวน์เพิ่มเติม"}</h3>
          <p>
            {en
              ? "Amounts are additional to the included buffet. Disabled items stay hidden."
              : "ราคาเพิ่มเติมจากบุฟเฟ่ต์ รายการที่ยังไม่เปิดใช้จะไม่แสดงให้ลูกค้าเลือก"}
          </p>
          {(draft.extras ?? []).map((item, index) => {
            const update = (change: Partial<typeof item>) =>
              setDraft({
                ...draft,
                extras: draft.extras?.map((v, i) =>
                  i === index ? { ...v, ...change } : v,
                ),
              });
            return (
              <fieldset className="rx-extra-editor" key={item.id}>
                <legend>
                  {en ? "Extra" : "บริการเสริม"} {index + 1}
                </legend>
                <label>
                  {en ? "Name" : "ชื่อรายการ"}
                  <input
                    required
                    maxLength={60}
                    value={item.name}
                    onChange={(e) => update({ name: e.target.value })}
                  />
                </label>
                <label>
                  {en ? "Category" : "หมวดหมู่"}
                  <select
                    value={item.category}
                    onChange={(e) =>
                      update({ category: e.target.value as "food" | "wine" })
                    }
                  >
                    <option value="food">{en ? "Food" : "อาหาร"}</option>
                    <option value="wine">{en ? "Wine" : "ไวน์"}</option>
                  </select>
                </label>
                <label>
                  {en ? "Description" : "รายละเอียด"}
                  <textarea
                    maxLength={300}
                    value={item.description}
                    onChange={(e) => update({ description: e.target.value })}
                  />
                </label>
                <label>
                  {en ? "THB / item" : "บาท / รายการ"}
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    step={0.01}
                    value={item.price / 100}
                    onChange={(e) =>
                      update({
                        price: Math.round(Number(e.target.value) * 100),
                      })
                    }
                  />
                </label>
                <label>
                  {en ? "Available quantity" : "จำนวนที่เปิดขาย"}
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={item.stock}
                    onChange={(e) => update({ stock: Number(e.target.value) })}
                  />
                </label>
                <label>
                  {en ? "Product photo" : "รูปสินค้า"}
                  <input
                    type="file"
                    disabled={busy}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadImage(file, index);
                    }}
                  />
                </label>
                {item.image && (
                  <img src={item.image} alt={item.name} width={160} />
                )}
                <label className="rx-check">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) => update({ enabled: e.target.checked })}
                  />
                  {en ? "Enable item" : "เปิดใช้รายการนี้"}
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      extras: draft.extras?.filter((_, i) => i !== index),
                    })
                  }
                >
                  {en ? "Remove extra" : "ลบบริการเสริม"}
                </button>
              </fieldset>
            );
          })}
          <button
            type="button"
            disabled={(draft.extras?.length ?? 0) >= 50}
            onClick={() =>
              setDraft({
                ...draft,
                extras: [
                  ...(draft.extras ?? []),
                  {
                    id: crypto.randomUUID(),
                    name: "",
                    category: "food",
                    description: "",
                    image: "",
                    price: 0,
                    stock: 0,
                    remaining: 0,
                    enabled: false,
                  },
                ],
              })
            }
          >
            {en ? "Add extra" : "เพิ่มบริการเสริม"}
          </button>
          <label className="rx-check">
            <input
              type="checkbox"
              checked={draft.verified ?? false}
              onChange={(e) =>
                setDraft({ ...draft, verified: e.target.checked })
              }
            />
            {en
              ? "I verified this sailing's dates, pier, table plan, prices and extras. Required before publication."
              : "ยืนยันว่าตรวจสอบวัน ท่าเรือ ผังโต๊ะ ราคา และเมนูเสริมแล้ว (จำเป็นก่อนเปิดรับจอง)"}
          </label>
          <p>
            {en
              ? "Sailings with reservations cannot be edited. Payment collection is not enabled."
              : "รอบที่มีรายการสำรองแล้วจะแก้ข้อมูลไม่ได้ ระบบยังไม่เปิดรับชำระเงิน"}
          </p>
          <button className="rx-primary" disabled={busy} type="submit">
            {busy
              ? en
                ? "Saving…"
                : "กำลังบันทึก…"
              : en
                ? "Save sailing"
                : "บันทึกรอบเรือ"}
          </button>
          {draft.id && draft.status !== "closed" && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await api(
                    `/dashboard/admin/cruises/sailings/${draft.id}/close`,
                    {
                      method: "POST",
                      body: JSON.stringify({ revision: draft.revision }),
                    },
                  );
                  setDraft({
                    ...draft,
                    status: "closed",
                    revision: draft.revision + 1,
                  });
                  await load();
                  setMessage(
                    en
                      ? "Closed to new reservations."
                      : "ปิดรับการสำรองใหม่แล้ว",
                  );
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Unable to close");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {en ? "Close to new reservations" : "ปิดรับการสำรองใหม่"}
            </button>
          )}
        </form>
      </div>
    </section>
  );
}
