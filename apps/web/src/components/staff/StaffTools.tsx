import { useCallback, useEffect, useState } from "react";
import { api, money, statusLabel, type Booking } from "../../data/api";
import type { Language } from "../../data/i18n";

export function useStaffData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api<T>(path));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, setError, loading, reload };
}
export function StaffMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <article className="staff-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
export function filterBookings(
  items: Booking[],
  query: string,
  status: string,
) {
  const q = query.toLocaleLowerCase().trim();
  return items.filter(
    (b) =>
      (!status || b.status === status) &&
      `${b.id} ${b.name} ${b.email} ${b.zone_id}`
        .toLocaleLowerCase()
        .includes(q),
  );
}
export function BookingFilters({
  query,
  setQuery,
  status,
  setStatus,
  language,
}: {
  query: string;
  setQuery: (s: string) => void;
  status: string;
  setStatus: (s: string) => void;
  language: Language;
}) {
  const en = language === "en";
  return (
    <div className="staff-filter-row">
      <label>
        {en ? "Search bookings" : "ค้นหารายการ"}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            en ? "Name, email or booking ID" : "ชื่อ อีเมล หรือรหัสการจอง"
          }
        />
      </label>
      <label>
        {en ? "Booking status" : "สถานะการจอง"}
        <select
          aria-label={en ? "Booking status" : "สถานะการจอง"}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{en ? "All statuses" : "ทุกสถานะ"}</option>
          {[
            "held",
            "confirmed",
            "expired",
            "cancelled",
            "no_show",
            "review",
          ].map((s) => (
            <option key={s} value={s}>
              {statusLabel(s, language)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
export function BookingRows({
  items,
  language,
  onOpen,
  busy,
}: {
  items: Booking[];
  language: Language;
  onOpen: (id: string) => void;
  busy: boolean;
}) {
  const en = language === "en";
  return (
    <div className="staff-booking-list">
      {items.length === 0 ? (
        <p>{en ? "No matching bookings" : "ไม่พบรายการที่ตรงกัน"}</p>
      ) : (
        items.map((b) => (
          <article className="staff-booking-row" key={b.id}>
            <div>
              <strong>{b.name}</strong>
              <small>{b.email}</small>
              <code>#{b.id}</code>
            </div>
            <div>
              <span>
                {en ? "Zone" : "โซน"} {b.zone_id} · {b.quantity}{" "}
                {en ? "guests" : "ท่าน"}
              </span>
              <strong>{money(b.total)}</strong>
              <span>{statusLabel(b.status, language)}</span>
            </div>
            <button type="button" disabled={busy} onClick={() => onOpen(b.id)}>
              {en ? "Open booking" : "เปิดรายละเอียด"}
            </button>
          </article>
        ))
      )}
    </div>
  );
}
