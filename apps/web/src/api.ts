export type Zone = {
  id: string;
  name: string;
  price: number;
  capacity: number;
  available: number;
};
export type EventInfo = {
  title: string;
  demo: boolean;
  date: string | null;
  boarding: string;
  departure: string;
  pier: string;
  duration_minutes: number;
  zones: Zone[];
};
export type Booking = {
  id: string;
  zone_id: string;
  name: string;
  email: string;
  quantity: number;
  total: number;
  status: string;
  expires_at: string;
  has_slip: boolean;
  agent_code: string;
  tickets: { id: string; checked_in_at: string | null }[];
};
export const money = (n: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n / 100);
export const labels: Record<string, string> = {
  held: "รอส่งหลักฐาน",
  review: "รอตรวจสอบ",
  confirmed: "ยืนยันแล้ว",
  expired: "หมดเวลาจอง",
  cancelled: "ไม่อนุมัติ",
  no_show: "ไม่มาทันเรือ",
};
export async function api<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const r = await fetch(`/api/v1${path}`, { ...options, headers });
  if (!r.ok) {
    let message = "เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่";
    try {
      message = (await r.json()).error || message;
    } catch {
      /* preserve recoverable message */
    }
    throw new Error(message);
  }
  return r.status === 204 ? (undefined as T) : r.json();
}
export const newToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
