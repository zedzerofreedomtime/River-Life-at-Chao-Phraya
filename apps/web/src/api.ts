export type Zone = {
  id: string;
  name: string;
  price: number;
  capacity: number;
  available: number;
};
export type EventInfo = {
  title: string;
  artists?: string[];
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
  agent_code: string;
  has_attachment: boolean;
  tickets: { id: string; checked_in_at: string | null }[];
};
export type AdminDashboardData = {
  booking_count: number;
  confirmed_tickets: number;
  confirmed_revenue: number;
  active_holds: number;
  member_count: number;
  zones: Zone[];
  bookings: Booking[];
};
export const money = (n: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n / 100);
export const labels: Record<string, string> = {
  held: "กำลังดำเนินการ",
  review: "กำลังดำเนินการ",
  confirmed: "ยืนยันแล้ว",
  expired: "หมดเวลาจอง",
  cancelled: "ยกเลิกแล้ว",
  no_show: "ไม่มาทันเรือ",
};
export const statusLabel = (status: string, language: "th" | "en") =>
  language === "en"
    ? ({
        held: "Awaiting payment",
        review: "Under review",
        confirmed: "Confirmed",
        expired: "Reservation expired",
        cancelled: "Cancelled",
        no_show: "No-show",
      } as Record<string, string>)[status] || status
    : labels[status] || status;
export const zoneLabel = (zone: Zone, language: "th" | "en") =>
  language === "en"
    ? ({ A: "Bow", B: "Stern", C: "Lower deck" } as Record<string, string>)[zone.id] || zone.name
    : zone.name;
const englishApiMessages: Record<string, string> = {
  "ระบบไม่พร้อม กรุณาลองใหม่": "Service unavailable. Please try again.",
  "ไม่พบรายการ": "Booking not found.",
  "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง": "Please check the information and try again.",
  "ระบบจำกัดการใช้งานไม่พร้อม กรุณาลองใหม่": "Service temporarily unavailable. Please try again.",
  "ทำรายการถี่เกินไป กรุณารอ 1 นาที": "Too many requests. Please wait one minute.",
  "กรุณาเข้าสู่ระบบเจ้าหน้าที่": "Staff login required.",
  "กรุณาเข้าสู่ระบบ": "Please log in.",
  "ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ": "You do not have access to this page.",
  "กรุณาเข้าสู่ระบบก่อนซื้อบัตร": "Please log in before buying tickets.",
  "ระบบส่งอีเมล OTP ยังไม่ได้ตั้งค่า": "Email verification is not configured.",
  "รหัส OTP หมดอายุหรือไม่ถูกต้อง": "The OTP is invalid or has expired.",
  "Google Sign-In ยังไม่ได้ตั้งค่า": "Google Sign-In is not configured.",
  "รหัสผ่านไม่ถูกต้อง": "Incorrect password.",
  "อีเมลนี้สมัครสมาชิกแล้ว": "This email is already registered.",
  "อีเมลหรือรหัสผ่านไม่ถูกต้อง": "Incorrect email or password.",
  "รายการเปลี่ยนแปลงหรือโควตาไม่เพียงพอ": "Availability has changed or there are not enough tickets.",
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
    if (localStorage.getItem("riverlife.language") === "en") {
      message = englishApiMessages[message] || (/[ก-๙]/.test(message) ? "Request failed. Please try again." : message);
    }
    throw new Error(message);
  }
  return r.status === 204 ? (undefined as T) : r.json();
}
export const newToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
