import { useEffect, useRef, useState } from "react";
import type { Language } from "../../data/i18n";

export default function TicketScanner({
  language,
  busy,
  onScan,
}: {
  language: Language;
  busy: boolean;
  onScan: (code: string) => void;
}) {
  const en = language === "en";
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<number | undefined>(undefined),
    generation = useRef(0);
  const [camera, setCamera] = useState(false),
    [error, setError] = useState("");
  function stop() {
    generation.current++;
    clearTimeout(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCamera(false);
  }
  useEffect(
    () => () => {
      generation.current++;
      clearTimeout(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  async function start() {
    stop();
    const current = generation.current;
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("camera");
      const { default: decode } = await import("jsqr");
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (current !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      setCamera(true);
      if (!video.current) {
        stop();
        return;
      }
      video.current.srcObject = media;
      await video.current.play();
      const canvas = document.createElement("canvas"),
        context = canvas.getContext("2d", { willReadFrequently: true });
      const read = () => {
        if (current !== generation.current) return;
        const element = video.current;
        if (element && element.videoWidth && context) {
          canvas.width = Math.min(960, element.videoWidth);
          canvas.height = Math.round(
            (canvas.width * element.videoHeight) / element.videoWidth,
          );
          context.drawImage(element, 0, 0, canvas.width, canvas.height);
          const pixels = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );
          const code = decode(pixels.data, pixels.width, pixels.height, {
            inversionAttempts: "dontInvert",
          });
          if (code) {
            stop();
            onScan(code.data);
            return;
          }
        }
        timer.current = window.setTimeout(read, 180);
      };
      read();
    } catch {
      stop();
      setError(
        en
          ? "Camera unavailable. Allow camera access over HTTPS/localhost, or upload a QR image or enter the code below."
          : "เปิดกล้องไม่ได้ กรุณาอนุญาตกล้องบน HTTPS/localhost หรือใช้รูป QR/กรอกรหัสด้านล่าง",
      );
    }
  }
  async function readImage(file?: File) {
    if (!file) return;
    setError("");
    stop();
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error("size");
      const { default: decode } = await import("jsqr");
      const image = await createImageBitmap(file);
      try {
        const canvas = document.createElement("canvas");
        const imageWidth = Math.min(image.width, 1536);
        const imageHeight = Math.round(
          (imageWidth * image.height) / image.width,
        );
        canvas.width = imageWidth + 64;
        canvas.height = imageHeight + 64;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("canvas");
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 32, 32, imageWidth, imageHeight);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = decode(pixels.data, canvas.width, canvas.height);
        if (!code) throw new Error("qr");
        onScan(code.data);
      } finally {
        image.close();
      }
    } catch {
      setError(
        en
          ? "Could not read the QR image. Use a clear PNG/JPG up to 8 MB."
          : "อ่าน QR ไม่ได้ กรุณาใช้ภาพ PNG/JPG ที่ชัดเจน ขนาดไม่เกิน 8 MB",
      );
    }
  }
  return (
    <div className="staff-scanner">
      <div className="staff-form-actions">
        <button
          type="button"
          disabled={busy}
          onClick={() => void (camera ? stop() : start())}
        >
          {camera
            ? en
              ? "Stop camera"
              : "ปิดกล้อง"
            : en
              ? "Scan with camera"
              : "สแกนด้วยกล้อง"}
        </button>
        <label className="staff-file-label">
          {en ? "Read QR image" : "อ่าน QR จากรูป"}
          <input
            type="file"
            accept="image/png,image/jpeg"
            disabled={busy}
            onChange={(e) => {
              void readImage(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <video
        ref={video}
        autoPlay
        playsInline
        muted
        hidden={!camera}
        aria-label={en ? "Ticket camera" : "กล้องสแกนบัตร"}
      />
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
