export type Language = "th" | "en";

export const copy = {
  th: {
    nav: {
      event: "งานแสดง",
      tickets: "บัตรของฉัน",
      orders: "คำสั่งซื้อ",
      dashboard: "แดชบอร์ด",
    },
    steps: ["เลือกเรือ", "เลือกโซน", "ชำระเงิน", "ทำรายการสำเร็จ"],
    demo: "ระบบทดลอง · ราคาและโควตาเพื่อทดสอบเท่านั้น · วันงานรอยืนยัน · QR Ticket สำหรับทดสอบ",
    checkoutTitle: "เลือกโซนและจำนวนบัตร",
    checkoutCopy: "เลือกพื้นที่บนเรือ ก่อนเข้าสู่ขั้นตอนชำระเงิน",
  },
  en: {
    nav: {
      event: "Events",
      tickets: "My Tickets",
      orders: "My Bookings",
      dashboard: "Dashboard",
    },
    steps: ["Choose vessel", "Choose zone", "Payment", "Confirmed"],
    demo: "Demo system · Prices and availability are for testing only · Event details are pending confirmation",
    checkoutTitle: "Choose your zone and tickets",
    checkoutCopy: "Select your space on board before continuing to payment.",
  },
} as const;
