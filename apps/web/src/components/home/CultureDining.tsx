import { ArrowRight } from "lucide-react";
import type { Language } from "../../data/i18n";
import DiningGallery from "../cruise/DiningGallery";
import { editorialPhotos } from "../../data/editorialPhotos";

export default function CultureDining({ language }: { language: Language }) {
  const en = language === "en";
  return (
    <section
      id="cinema-dining"
      className="culture-dining culture-container"
      aria-labelledby="culture-dining-title"
    >
      <div className="cinema-dining-intro">
        <img
          src={editorialPhotos.salmon.src}
          alt={
            en
              ? "Salmon photographed on Unicorn Cruise"
              : "ภาพแซลมอนจากเรือ Unicorn Cruise"
          }
          loading="lazy"
          width={editorialPhotos.salmon.width}
          height={editorialPhotos.salmon.height}
          style={{ objectPosition: editorialPhotos.salmon.position }}
        />
        <div>
          <h2 id="culture-dining-title">
            {en ? "A taste of life on board" : "มื้ออาหารบนสายน้ำ"}
          </h2>
          <p>
            {en
              ? "Real food, real river views. Explore the cruise menu before choosing your sailing."
              : "ชมภาพอาหารจริงและบรรยากาศมื้ออาหารบนเรือ พร้อมดูเมนูก่อนเลือกรอบล่องเรือ"}
          </p>
          <a className="culture-text-link" href="/concert#event-food-menu">
            {en ? "View the food menu" : "ดูเมนูอาหาร"}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      </div>
      <DiningGallery language={language} />
    </section>
  );
}
