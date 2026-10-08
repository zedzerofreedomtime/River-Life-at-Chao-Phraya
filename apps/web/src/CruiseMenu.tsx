import { ArrowUpRight, Download } from "lucide-react";
import type { Language } from "./i18n";
import "./CruiseMenu.css";

const menuImage = "/images/boat/unicorn-food-menu-2026-07-15.jpg";

export default function CruiseMenu({ language }: { language: Language }) {
  const en = language === "en";
  return (
    <aside
      className="cruise-menu-original"
      aria-label={en ? "Cruise-supplied food menu" : "เมนูอาหารต้นฉบับจากเรือ"}
    >
      <a
        className="cruise-menu-preview"
        href={menuImage}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={
          en ? "Open full-size food menu" : "เปิดภาพเมนูอาหารขนาดเต็ม"
        }
      >
        <img
          src={menuImage}
          alt={
            en
              ? "Original UNICORN CRUISE food menu, in Thai and English"
              : "เมนูอาหาร UNICORN CRUISE ต้นฉบับภาษาไทยและอังกฤษ"
          }
          width={1092}
          height={1500}
          loading="lazy"
        />
      </a>
      <div>
        <span className="cruise-menu-version">
          {en ? "MENU FROM THE CRUISE" : "เมนูจากเรือ"}
          {" · "}
          <time dateTime="2026-07-15">
            {en ? "15 Jul 2026" : "15 ก.ค. 2569"}
          </time>
        </span>
        <h3>
          {en ? "Explore the original food menu" : "เปิดดูเมนูอาหารต้นฉบับ"}
        </h3>
        <p>
          {en
            ? "Browse salads, sushi, soups, seafood, main dishes and desserts. Thai and English names are shown exactly as supplied by the cruise."
            : "สลัด ซูชิ ซุป ซีฟู้ด อาหารหลัก และของหวาน พร้อมชื่อไทยและอังกฤษตามเมนูที่เรือจัดส่งให้"}
        </p>
        <div className="cruise-menu-actions">
          <a href={menuImage} target="_blank" rel="noopener noreferrer">
            {en ? "View full menu" : "ดูภาพเมนูเต็ม"}
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
          <a
            href={menuImage}
            download="UNICORN-CRUISE-Food-Menu-2026-07-15.jpg"
          >
            {en ? "Download menu" : "ดาวน์โหลดเมนู"}
            <Download size={17} aria-hidden="true" />
          </a>
        </div>
      </div>
    </aside>
  );
}
