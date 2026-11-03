import { useEffect, useState } from "react";
import { Ship } from "lucide-react";
import type { Language } from "../../data/i18n";
import "../../PageLoading.css";

export default function PageLoading({
  route,
  busy,
  language,
}: {
  route: string;
  busy: boolean;
  language: Language;
}) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    if (busy) return;
    const timer = window.setTimeout(() => setVisible(false), 500);
    return () => window.clearTimeout(timer);
  }, [route, busy]);

  if (!visible) return null;
  return (
    <div
      className="route-loading"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="route-loading-track" aria-hidden="true">
        <span key={route} />
      </div>
      <div className="route-loading-label">
        <small>RIVER LIFE</small>
        <Ship size={44} aria-hidden="true" />
        <span>{language === "en" ? "Opening page…" : "กำลังเปิดหน้า…"}</span>
      </div>
    </div>
  );
}
