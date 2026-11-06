# ช่องทางชำระเงิน Omise — 4 พฤศจิกายน 2026

คง flow 4 ขั้น: เลือกที่นั่งและบริการเสริม → คอนเฟิร์ม → ชำระเงิน → ตั๋วหลังเซิร์ฟเวอร์ยืนยัน

การเลือกวิธีจ่ายอยู่ในฟอร์มของ Omise เช่นเดียวกับการให้เลือกบน Stripe Checkout เดิม ไม่มี dropdown ช่องทางจ่ายในหน้าคอนเฟิร์ม และไม่สร้าง PromptPay ก่อนลูกค้าเลือกวิธี ฟอร์มเปิดหน้าบัตรพร้อมลิงก์ “ช่องทางชำระเงินอื่นๆ” จากช่องทางที่บัญชีเปิดไว้; QR แสดงเมื่อเลือก PromptPay เท่านั้น ใช้กรอบสรุปคำสั่งซื้อและ layout หน้าชำระเงินเดิม

- ช่องทางออนไลน์แสดงจาก Capability API ของบัญชี เฉพาะ THB และชนิดที่ระบบเชื่อมไว้: บัตร, PromptPay, Mobile Banking, Alipay, GrabPay, Rabbit LINE Pay, ShopeePay, TrueMoney และผ่อนชำระ รวม Google Pay เมื่อบัญชีไทยระบุ tokenization นี้
- ช่องทาง offline, direct debit และช่องทางประเทศอื่นไม่ได้เปิดเพียงเพราะปรากฏใน capabilities; Apple Pay ในเอกสาร pre-built ปัจจุบันรองรับสิงคโปร์
- `OMISE_PUBLIC_KEY=pkey_test_...` อยู่ใน `.env.omise.local` (ignored) พร้อม secret เดิม ไม่มี secret ฝั่ง browser
- ข้อมูลบัตรส่งตรงไปฟอร์ม Omise.js จาก `https://cdn.omise.co/omise.js`; API ของเว็บรับเฉพาะ token/source
- แหล่งข้อมูลชำระเงินอื่นถูกตรวจจาก Omise ก่อนสร้าง charge: source ID, test mode, ยอด, THB และสิทธิ์ช่องทางบัญชี
- ยอดและเจ้าของรายการยังอ้างอิงฐานข้อมูลเซิร์ฟเวอร์ เก็บ attempt ก่อนเรียกภายนอก และใช้ charge เดิมเมื่อเรียกซ้ำ
- return URL มาจาก `WEB_ORIGIN` ฝั่งเซิร์ฟเวอร์ กลับ `/booking?payment=<id>` แล้วอ่านสถานะของเจ้าของรายการ ห้ามใช้ query เป็นหลักฐานชำระเงิน
- ลิงก์อนุมัติต้องเป็น HTTPS ของ Omise ที่อนุญาตไว้ และ webhook ยังต้อง retrieve charge ตรวจยอดก่อนออกตั๋ว

## หลักฐานที่รัน

- Go tests ทั้ง repository ใน PostgreSQL/Redis แยกผ่านก่อนเปิดใช้จริงในเครื่อง; รายงาน JSON อยู่ `%TEMP%/riverlife-payment-methods-go.jsonl`
- Playwright: ฟอร์มบัตร, nonce ผิด, ปิดฟอร์ม, callback ซ้ำ, กลับจากธนาคาร, สถานะสำเร็จ/ตั๋ว, QR, การเก็บชื่อ/ที่นั่งเมื่อ retry
- ฟอร์มบัตรจาก CDN Omise จริงเปิดด้วย public key บัญชี Sandbox สำเร็จ โดยไม่กรอกหรือเรียกเก็บบัตร
- `TestOmiseSandboxMobileBanking` ใช้ฐานข้อมูลแยกและคีย์ทดสอบจริง: สร้าง K PLUS source/charge pending, ตรวจลิงก์ authorize และใช้ charge เดิมเมื่อเรียกซ้ำ; ไม่อนุมัติผ่านธนาคาร ไม่ออกตั๋ว/อีเมล
- ยังไม่ได้ทดสอบธุรกรรมจริง, ผ่อนชำระครบทุกธนาคาร, wallet ทุกชนิด หรือ Google Pay จนจบรายการ ห้ามถือว่าเปิดใช้ live ได้จากผล Sandbox

## คำสั่งตรวจ

```powershell
npm run typecheck
$env:TEST_BASE_URL='http://127.0.0.1:5178'
npx playwright test tests/omise-payment.spec.ts tests/omise-multimethod.spec.ts tests/booking-recovery.spec.ts tests/individual-chairs.spec.ts --workers=1 --reporter=list
```

เทสฟอร์ม CDN จริงต้อง opt in `RUN_OMISE_FORM_LIVE=1` และ `OMISE_PUBLIC_KEY` แบบ test ส่วนเทส K PLUS จริงต้อง `RUN_OMISE_METHODS=1` พร้อม `TEST_DATABASE_URL` ของฐานข้อมูลทดสอบและคีย์ Sandbox เท่านั้น

เอกสารอ้างอิง: https://docs.omise.co/omise-js, https://docs.omise.co/capability-api, https://docs.omise.co/sources-api, https://docs.omise.co/charges-api
