import type { Language } from "./i18n";

export default function LanguageSwitcher({
  language,
  onChange,
}: {
  language: Language;
  onChange: (language: Language) => void;
}) {
  return (
    <div className="language-switcher" aria-label="Language">
      <button
        type="button"
        className={language === "th" ? "active" : ""}
        aria-pressed={language === "th"}
        onClick={() => onChange("th")}
      >
        TH
      </button>
      <span aria-hidden="true">|</span>
      <button
        type="button"
        className={language === "en" ? "active" : ""}
        aria-pressed={language === "en"}
        onClick={() => onChange("en")}
      >
        EN
      </button>
    </div>
  );
}
