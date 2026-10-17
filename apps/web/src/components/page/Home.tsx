import { type EventInfo } from "../../data/api";
import type { Language } from "../../data/i18n";
import SailingCalendar from "../cruise/SailingCalendar";
import CruiseVideos from "../cruise/CruiseVideos";
import RiverHighlights from "../cruise/RiverHighlights";
import RiverNightGallery from "../cruise/RiverNightGallery";
import CultureHero from "../home/CultureHero";
import CultureFacts from "../home/CultureFacts";
import CultureStory from "../home/CultureStory";
import CultureSpaces from "../home/CultureSpaces";
import CultureDining from "../home/CultureDining";
import CultureBooking from "../home/CultureBooking";
import CultureVip from "../home/CultureVip";
import "../../CultureHome.css";

export default function Home({
  event,
  language,
  onOpenConcert,
  onOpenContact,
}: {
  event: EventInfo;
  language: Language;
  onOpenConcert: () => void;
  onOpenContact: () => void;
}) {
  return (
    <div className="ticket-home culture-home">
      <CultureHero language={language} />
      <CultureFacts event={event} language={language} />
      <SailingCalendar
        event={event}
        language={language}
        onOpenConcert={onOpenConcert}
      />
      <CruiseVideos language={language} />
      <CultureStory event={event} language={language} />
      <RiverHighlights language={language} />
      <RiverNightGallery language={language} />
      <CultureSpaces language={language} />
      <CultureDining language={language} />
      <CultureBooking language={language} />
      <CultureVip language={language} onOpenContact={onOpenContact} />
    </div>
  );
}
