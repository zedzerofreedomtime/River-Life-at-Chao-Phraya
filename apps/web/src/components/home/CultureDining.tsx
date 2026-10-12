import { ArrowRight } from "lucide-react";
import type { Language } from "../../data/i18n";
import DiningGallery from "../cruise/DiningGallery";
import CruiseMenu from "../cruise/CruiseMenu";

export default function CultureDining({ language }: { language: Language }) {
  const en = language === "en";
  return (
    <section
      className="culture-dining culture-container"
      aria-labelledby="culture-dining-title"
    >
      <div className="culture-section-heading">
        <div>
          <h2 id="culture-dining-title">
            {en ? "A taste of life on board" : "มื้ออาหารบนสายน้ำ"}
          </h2>
          <p>
            {en
              ? "Real food, real river views. Explore the cruise menu before choosing your sailing."
              : "ชมภาพอาหารจริงและบรรยากาศมื้ออาหารบนเรือ พร้อมดูเมนูก่อนเลือกรอบล่องเรือ"}
          </p>
        </div>
        <a className="culture-text-link" href="/concert#event-food-menu">
          {en ? "View the food menu" : "ดูเมนูอาหาร"}
          <ArrowRight size={18} aria-hidden="true" />
        </a>
      </div>
      <DiningGallery language={language} />
      <CruiseMenu language={language} />
      <p className="culture-caption">
        {en
          ? "Dining is part of the on-board experience. Check the food and drinks included in your selected package."
          : "มื้ออาหารเป็นส่วนหนึ่งของประสบการณ์บนเรือ โปรดตรวจอาหารและเครื่องดื่มที่รวมในแพ็กเกจที่เลือก"}
      </p>
    </section>
  );
}
