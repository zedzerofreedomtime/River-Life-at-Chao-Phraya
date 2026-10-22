import { riverLandmarkCredits } from "../../data/riverLandmarkCredits";
import { riverLandmarks } from "../../data/riverLandmarks";
import type { Language } from "../../data/i18n";

export default function Footer({ language }: { language: Language }) {
  const en = language === "en";
  return (
    <footer>
      <span className="footer-brand">RIVER LIFE</span>
      <span>
        {en
          ? "Chao Phraya cruises · A concert on every sailing"
          : "ล่องเรือเจ้าพระยา · คอนเสิร์ตบนเรือทุกรอบ"}
      </span>
      <span>
        {en
          ? "Prices and event details are pending confirmation"
          : "ราคาและรายละเอียดงานรอยืนยัน"}
      </span>
      <details className="footer-photo-credits">
        <summary>
          {en ? "Location photo credits" : "เครดิตภาพสถานที่ทั้ง 11 จุด"}
        </summary>
        <p>
          {en
            ? "11 places from the VIVA Alangka reference, not a confirmed Unicorn itinerary. Location photos include land-side views; visibility varies with the sailing. No shore/photo stops promised."
            : "11 จุดตามภาพอ้างอิง VIVA Alangka ยังไม่ใช่เส้นทางยืนยันของ Unicorn ภาพมีทั้งมุมบนฝั่ง ทัศนวิสัยขึ้นอยู่กับรอบเรือ ไม่รับประกันจอดถ่ายภาพ"}
        </p>
        <p>
          {en
            ? "Real photographs, CSS crops only. No photographer endorsement implied."
            : "ภาพสถานที่จริง ครอปเพื่อการแสดงผล ไม่ได้หมายถึงการรับรองบริการโดยช่างภาพ"}
        </p>
        <ul>
          {riverLandmarkCredits.map((credit) => (
            <li key={credit.id}>
              {
                riverLandmarks.find((item) => item.id === credit.id)?.[
                  en ? "en" : "th"
                ]
              }{" "}
              — {credit.author} ·{" "}
              <a href={credit.url} target="_blank" rel="noopener noreferrer">
                {en ? "Photo source" : "ที่มาภาพ"}
              </a>{" "}
              ·{" "}
              <a
                href={credit.licenseUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {credit.license}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </footer>
  );
}
