import { type EventInfo } from "../../data/api";
import { useRef } from "react";
import type { Language } from "../../data/i18n";
import SailingCalendar from "../cruise/SailingCalendar";
import MotionJourney from "../home/MotionJourney";
import CultureFacts from "../home/CultureFacts";
import CultureSpaces from "../home/CultureSpaces";
import Button from "@mui/material/Button";
import { ArrowRight } from "lucide-react";
import useHomeMotion from "../home/useHomeMotion";
import "../../CultureHome.css";
import "../../MotionHome.css";

export default function Home({
  event,
  language,
  onOpenConcert,
}: {
  event: EventInfo;
  language: Language;
  onOpenConcert: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useHomeMotion(root);
  return (
    <div ref={root} className="ticket-home culture-home motion-home">
      <MotionJourney
        language={language}
        onBook={onOpenConcert}
        facts={<CultureFacts event={event} language={language} />}
      />
      <CultureSpaces language={language} />
      <SailingCalendar
        event={event}
        language={language}
        onOpenConcert={onOpenConcert}
      />
      <section
        className="home-final-cta culture-container"
        data-home-section="final-cta"
        aria-labelledby="home-final-title"
      >
        <p className="home-section-label">YOUR NEXT JOURNEY</p>
        <h2 id="home-final-title">
          {language === "en" ? "Ready to set sail?" : "พร้อมออกเดินทาง?"}
        </h2>
        <p>
          {language === "en"
            ? "Find your evening on the Chao Phraya with River Life."
            : "ค้นหาค่ำคืนของคุณบนสายน้ำเจ้าพระยากับ River Life"}
        </p>
        <Button
          variant="contained"
          onClick={onOpenConcert}
          endIcon={<ArrowRight size={20} />}
        >
          {language === "en" ? "View sailings & book" : "ดูรอบและจองเลย"}
        </Button>
      </section>
    </div>
  );
}
