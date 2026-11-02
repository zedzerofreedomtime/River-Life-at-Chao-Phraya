import { useEffect, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Language } from "../../data/i18n";
import { foodGalleryPhotos } from "../../data/foodGalleryPhotos";
import { hanumanGalleryPhotos } from "../../data/hanumanGalleryPhotos";
import { musicGalleryPhotos } from "../../data/musicGalleryPhotos";
import { riversideGalleryPhotos } from "../../data/riversideGalleryPhotos";
import "../../FoodGallery.css";

export default function ExperiencePhotoGallery({
  language,
  onClose,
  kind,
}: {
  language: Language;
  onClose: () => void;
  kind: "food" | "hanuman" | "music" | "riverside";
}) {
  const en = language === "en";
  const food = kind === "food";
  const music = kind === "music";
  const riverside = kind === "riverside";
  const photos = riverside
    ? riversideGalleryPhotos
    : music
      ? musicGalleryPhotos
      : food
        ? foodGalleryPhotos
        : hanumanGalleryPhotos;
  const title = riverside
    ? en
      ? "Dinner with a river view"
      : "มื้อค่ำพร้อมวิวริมแม่น้ำ"
    : music
      ? en
        ? "Live music on board"
        : "คอนเสิร์ตและดนตรีบนเรือ"
      : food
        ? en
          ? "Onboard dining gallery"
          : "ไลน์อาหารบนเรือ"
        : en
          ? "Hanuman and Thai performances"
          : "หนุมานและการแสดงไทยบนเรือ";
  const labels = riverside
    ? {
        close: en ? "Close riverside gallery" : "ปิดแกลเลอรีมื้อค่ำพร้อมวิว",
        previous: en ? "Previous riverside photo" : "ภาพบรรยากาศก่อนหน้า",
        next: en ? "Next riverside photo" : "ภาพบรรยากาศถัดไป",
        choose: en ? "Choose riverside photo" : "เลือกภาพบรรยากาศ",
      }
    : food
      ? {
          close: en ? "Close dining gallery" : "ปิดแกลเลอรีอาหาร",
          previous: en ? "Previous food photo" : "ภาพอาหารก่อนหน้า",
          next: en ? "Next food photo" : "ภาพอาหารถัดไป",
          choose: en ? "Choose food photo" : "เลือกภาพอาหาร",
        }
      : {
          close: en ? "Close performance gallery" : "ปิดแกลเลอรีการแสดง",
          previous: en ? "Previous performance photo" : "ภาพการแสดงก่อนหน้า",
          next: en ? "Next performance photo" : "ภาพการแสดงถัดไป",
          choose: en ? "Choose performance photo" : "เลือกภาพการแสดง",
        };
  const [selected, setSelected] = useState(0);
  const touch = useRef<number | null>(null);
  const thumbnails = useRef<HTMLDivElement>(null);
  useEffect(() => {
    thumbnails.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "instant",
    });
  }, [selected]);
  const photo = photos[selected];
  const move = (direction: number) =>
    setSelected((value) => (value + direction + photos.length) % photos.length);
  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="food-gallery-title"
      className="food-gallery-dialog"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div className="food-gallery-header">
        <div>
          <span>
            {riverside
              ? "DINNER WITH A VIEW"
              : music
                ? "LIVE MUSIC ON THE RIVER"
                : food
                  ? "DINING ON THE RIVER"
                  : "THAI CULTURE ON THE RIVER"}
          </span>
          <h2 id="food-gallery-title">{title}</h2>
        </div>
        <IconButton onClick={onClose} aria-label={labels.close}>
          <X />
        </IconButton>
      </div>
      <div
        className="food-gallery-stage"
        data-photo-format={
          photo.height >= photo.width ? "portrait" : "landscape"
        }
        onTouchStart={(event) => {
          touch.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => {
          if (
            touch.current !== null &&
            Math.abs(event.changedTouches[0].clientX - touch.current) > 50
          )
            move(event.changedTouches[0].clientX < touch.current ? 1 : -1);
          touch.current = null;
        }}
        onTouchCancel={() => {
          touch.current = null;
        }}
      >
        <img
          src={photo.src}
          alt={en ? photo.en : photo.th}
          width={photo.width}
          height={photo.height}
        />
      </div>
      <div className="food-gallery-navigation">
        <IconButton onClick={() => move(-1)} aria-label={labels.previous}>
          <ChevronLeft />
        </IconButton>
        <p aria-live="polite">
          <strong>{en ? photo.en : photo.th}</strong>
          <span>
            {selected + 1} / {photos.length}
          </span>
        </p>
        <IconButton onClick={() => move(1)} aria-label={labels.next}>
          <ChevronRight />
        </IconButton>
      </div>
      <div
        className="food-gallery-thumbnails"
        ref={thumbnails}
        role="group"
        aria-label={labels.choose}
      >
        {photos.map((item, index) => (
          <button
            key={item.src}
            type="button"
            aria-pressed={selected === index}
            aria-label={en ? item.en : item.th}
            onClick={() => setSelected(index)}
          >
            <img
              src={item.src}
              alt=""
              width={item.width}
              height={item.height}
              loading="lazy"
            />
          </button>
        ))}
      </div>
      <p className="food-gallery-note">
        {riverside
          ? en
            ? "Real atmosphere on Unicorn Cruise. Views and seating vary by sailing."
            : "ภาพบรรยากาศจริงบนเรือ Unicorn Cruise วิวและการจัดที่นั่งขึ้นอยู่กับรอบล่องเรือ"
          : music
            ? en
              ? "Atmosphere on Unicorn Cruise. Artists and performances vary by sailing."
              : "ภาพบรรยากาศบนเรือ Unicorn Cruise ศิลปินและการแสดงขึ้นอยู่กับรอบล่องเรือ"
            : food
              ? en
                ? "Real buffet photos from Unicorn Cruise. Menus vary by sailing."
                : "ภาพไลน์อาหารจริงบนเรือ Unicorn Cruise เมนูขึ้นอยู่กับรอบล่องเรือที่เลือก"
              : en
                ? "Performance photos on Unicorn Cruise. Shows vary by sailing."
                : "ภาพการแสดงบนเรือ Unicorn Cruise การแสดงขึ้นอยู่กับรอบล่องเรือ"}
      </p>
    </Dialog>
  );
}
