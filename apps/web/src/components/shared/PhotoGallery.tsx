import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import type { Language } from "../../data/i18n";
import "../../CruiseGallery.css";

export type CruisePhoto = {
  src: string;
  th: string;
  en: string;
  detailTh: string;
  detailEn: string;
  width?: number;
  height?: number;
  position?: string;
  format?: "portrait" | "landscape";
};

export default function PhotoGallery({
  photos,
  language,
  className = "",
  viewerLabel,
}: {
  photos: readonly CruisePhoto[];
  language: Language;
  className?: string;
  viewerLabel?: string;
}) {
  const en = language === "en";
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(0);
  const photo = photos[selected];
  const move = (direction: number) =>
    setSelected(
      (current) => (current + direction + photos.length) % photos.length,
    );
  return (
    <>
      <div className={`cruise-photo-grid ${className}`}>
        {photos.map((item, index) => (
          <figure key={item.src}>
            <button
              type="button"
              className="cruise-photo-open"
              data-photo-format={item.format}
              aria-label={`${en ? "View photo: " : "ดูภาพ: "}${en ? item.en : item.th}`}
              onClick={() => {
                setSelected(index);
                dialog.current?.showModal();
              }}
            >
              <img
                src={item.src}
                alt={en ? item.en : item.th}
                width={item.width ?? 1200}
                height={item.height ?? 800}
                style={{ objectPosition: item.position }}
                decoding="async"
                loading="lazy"
              />
              <span className="cruise-photo-expand">
                <Expand size={18} aria-hidden="true" />
                {en ? "View photo" : "ดูภาพใหญ่"}
              </span>
            </button>
            <figcaption>
              <strong>{en ? item.en : item.th}</strong>
              <p>{en ? item.detailEn : item.detailTh}</p>
            </figcaption>
          </figure>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="cruise-photo-dialog"
        aria-label={
          viewerLabel ?? (en ? "Cruise photo viewer" : "ภาพบรรยากาศบนเรือ")
        }
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        <div className="cruise-photo-toolbar">
          <span aria-live="polite">
            {selected + 1} / {photos.length}
          </span>
          <button
            type="button"
            autoFocus
            onClick={() => dialog.current?.close()}
            aria-label={en ? "Close photo" : "ปิดภาพ"}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <img
          src={photo.src}
          alt={en ? photo.en : photo.th}
          width={photo.width ?? 1200}
          height={photo.height ?? 800}
        />
        <div className="cruise-photo-controls">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label={en ? "Previous photo" : "ภาพก่อนหน้า"}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <p aria-live="polite">
            <strong>{en ? photo.en : photo.th}</strong>
            <span>{en ? photo.detailEn : photo.detailTh}</span>
          </p>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label={en ? "Next photo" : "ภาพถัดไป"}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </dialog>
    </>
  );
}
