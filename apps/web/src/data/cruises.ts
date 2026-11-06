// Operational fixture markers stay in stored data and staff screens. Customer
// copy is independent of them; checkout still identifies the sandbox provider.
export function cruiseDisplayText(value: string): string {
  return value
    .replace(/^\[DEMO\]\s*/i, "")
    .replace(/\s*(?:—|·)\s*Omise Sandbox\s*\/\s*ไม่ใช่รอบขายจริง$/, "")
    .replace(
      /\s*—\s*(?:วัน เวลา ผัง และราคาเป็นตัวอย่าง|ตัวอย่าง ไม่เปิดขาย|ท่าและเวลาเป็นตัวอย่าง)$/,
      "",
    );
}

export type Vessel = {
  id: string;
  name: string;
  th: string;
  pier: string;
  time: string;
  crop: string;
  description: string;
  english: string;
};
export type SailingTable = {
  seat_price?: number;
  available_seats?: string[];
  id: string;
  deck: "upper" | "lower";
  seats: number;
  price: number;
  available: boolean;
  x?: number;
  y?: number;
};
export type CruiseExtra = {
  id: string;
  name: string;
  category: "food" | "wine";
  description: string;
  image: string;
  price: number;
  stock: number;
  remaining: number;
  enabled: boolean;
};
export type Sailing = {
  id: string;
  vessel_id: string;
  title: string;
  departure_at: string | null;
  boarding_at: string | null;
  pier: string;
  status: "draft" | "published" | "closed";
  revision: number;
  tables: SailingTable[];
  verified?: boolean;
  extras?: CruiseExtra[];
};
export type CruiseReservation = {
  seat_ids?: string[];
  id: string;
  sailing_id: string;
  title: string;
  vessel: string;
  departure_at: string | null;
  pier: string;
  table_ids: string[];
  guest_count: number;
  total: number;
  status: "held" | "confirmed" | "cancelled" | "expired";
  expires_at: string;
  table_total?: number;
  extras_total?: number;
  notes?: string;
  requests?: string[];
  customer_name?: string;
  customer_phone?: string;
  items?: {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit_price: number;
  }[];
};
export type CruiseReservationDetail = CruiseReservation & {
  payment?: {
    charge_id: string;
    status: string;
    review_reason: string;
    checked_at: string | null;
  };
  email: string;
  tickets: {
    id: string;
    table_id: string;
    ordinal: number;
    checked_in_at: string | null;
  }[];
  emails: {
    kind: "booking" | "tickets";
    attempts: number;
    sent_at: string | null;
    stopped_at: string | null;
  }[];
};
export const sailingDate = (value: string | null, en = false) =>
  value
    ? new Intl.DateTimeFormat(en ? "en-GB" : "th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
      }).format(new Date(value))
    : en
      ? "To be confirmed"
      : "รอยืนยัน";
