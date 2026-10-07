export type Language = "th" | "en";

export const copy = {
  th: {
    nav: {
      event: "งานแสดง",
      tickets: "บัตรของฉัน",
      orders: "คำสั่งซื้อ",
      dashboard: "แดชบอร์ด",
    },
    steps: ["เลือกรอบล่องเรือ", "เลือกโซนและที่นั่ง", "ชำระเงิน", "ทำรายการสำเร็จ"],
    demo: "ระบบทดลอง · วันที่ 21 พ.ย. 2569 และราคาเป็นตัวอย่างเพื่อดูหน้าตาเท่านั้น · ห้ามชำระเงินจริง",
    checkoutTitle: "เลือกโซนและจำนวนผู้ร่วมเดินทาง",
    checkoutCopy: "เลือกพื้นที่บนเรือและจำนวนผู้ร่วมเดินทางของรอบที่จอง ก่อนเข้าสู่ขั้นตอนชำระเงิน",
  },
  en: {
    nav: {
      event: "Events",
      tickets: "My Tickets",
      orders: "My Bookings",
      dashboard: "Dashboard",
    },
    steps: ["Choose sailing", "Choose zone & places", "Payment", "Confirmed"],
    demo: "Demo preview · 21 Nov 2026 and ticket prices are examples only · Do not make a real payment",
    checkoutTitle: "Choose your zone and guests",
    checkoutCopy:
      "Choose your cruise zone and the number of guests for this sailing before continuing to payment.",
  },
} as const;
