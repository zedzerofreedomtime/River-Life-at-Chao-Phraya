import type { EventInfo } from "./api";
import { formatEventDate, formatPier, localizeEventTitle } from "./api";
import type { Language } from "./i18n";
import { helpTitle, type HelpTopic } from "./help";
import type { Page } from "./navigation";

export type PageName = Page;

export interface PageMetadata {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  type?: string;
  url?: string;
  robots?: string;
  jsonLd?: Record<string, any>;
}

export function generateMetadata({
  page,
  language,
  event,
  helpTopic,
}: {
  page: PageName;
  language: Language;
  event?: EventInfo | null;
  helpTopic?: HelpTopic;
}): PageMetadata {
  const en = language === "en";
  const siteName = "River Life — Chao Phraya Cruises";
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://riverlife-chaophraya.com";
  const defaultImage = `${baseUrl}/images/river-life-culture-hero-v5.webp`;

  switch (page) {
    case "tablePreview":
      return {
        title: en
          ? "Unicorn Cruise · Table layout preview — River Life"
          : "ทดลองผังโต๊ะ Unicorn Cruise — River Life",
        description: en
          ? "Illustrative table selection. Not an official deck plan or booking."
          : "ทดลองเลือกโต๊ะ ไม่ใช่ผังจริงที่เรือยืนยันหรือการจอง",
        robots: "noindex, nofollow",
        url: `${baseUrl}/table-preview`,
      };
    case "home":
      return {
        title: en
          ? "River Life — Symphony of the Chao Phraya | Luxury Dinner Cruise & Concert"
          : "River Life — ล่องเรือแม่น้ำเจ้าพระยาพร้อมคอนเสิร์ตบนเรือ UNICORN CRUISE ทุกรอบ",
        description: en
          ? "Cruise the Chao Phraya with River Life aboard the UNICORN CRUISE. Experience breathtaking night views of Wat Arun, authentic culinary dining, and unforgettable live concert sailings."
          : "สัมผัสเสน่ห์สายน้ำเจ้าพระยากับ River Life บนเรือ UNICORN CRUISE ชมวิววัดอรุณยามค่ำคืน ลิ้มรสอาหารเลิศรส และดื่มด่ำกับเสียงดนตรีคอนเสิร์ตสดสุดเอ็กซ์คลูซีฟ จองตั๋วออนไลน์ได้ทันที",
        keywords: en
          ? "Chao Phraya cruise, Bangkok dinner cruise, UNICORN CRUISE, river concerts Bangkok, Chao Phraya luxury cruise, Wat Arun night view"
          : "ล่องเรือเจ้าพระยา, ดินเนอร์แม่น้ำเจ้าพระยา, คอนเสิร์ตบนเรือ, เรือ UNICORN CRUISE, จองเรือเจ้าพระยา, ชมวิววัดอรุณ, ล่องเรือดินเนอร์หรู",
        image: defaultImage,
        type: "website",
        url: `${baseUrl}/`,
        robots: "index, follow",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "TouristAttraction",
          name: "River Life Chao Phraya Cruise",
          description: en
            ? "Luxury Chao Phraya river cruise with dining and live concerts."
            : "ประสบการณ์ล่องเรือแม่น้ำเจ้าพระยาพร้อมดินเนอร์และคอนเสิร์ต",
          touristType: ["Sightseeing", "Dining", "Live Music"],
          provider: {
            "@type": "Organization",
            name: "River Life",
            url: baseUrl,
          },
        },
      };

    case "event": {
      const eventTitle = event
        ? localizeEventTitle(event.title, language)
        : en
          ? "Concert Cruise on the Chao Phraya"
          : "ล่องเรือพร้อมคอนเสิร์ตบนเจ้าพระยา";
      const eventDate = event?.date
        ? formatEventDate(event.date, language)
        : "";
      const pierInfo = event
        ? formatPier(event.pier, event.pier_number, language)
        : "";

      return {
        title: en
          ? `${eventTitle} | Cruise Schedule & Booking — River Life`
          : `${eventTitle} | รอบล่องเรือและจองตั๋ว — River Life`,
        description: en
          ? `Book tickets for ${eventTitle} aboard UNICORN CRUISE. Departure from ${pierInfo || "Asiatique"}. Select your zone and enjoy live performances on the Chao Phraya.`
          : `ตารางรอบเรือและจองตั๋ว ${eventTitle} บนเรือ UNICORN CRUISE ขึ้นเรือที่${pierInfo || "เอเชียทีค"} ${eventDate ? `รอบวันที่ ${eventDate}` : ""} เลือกโซนที่นั่งบนดาดฟ้าหรือห้องปรับอากาศได้ทันที`,
        keywords: en
          ? "cruise booking, Chao Phraya tickets, UNICORN CRUISE schedule, river concert tickets, Asiatique cruise"
          : "จองตั๋วเรือเจ้าพระยา, ตารางเรือ UNICORN CRUISE, บัตรคอนเสิร์ตบนเรือ, ขึ้นเรือเอเชียทีค, รอบล่องเรือ",
        image: `${baseUrl}/images/boat/unicorn-night-exterior-enhanced-v1.webp`,
        type: "event",
        url: `${baseUrl}/concert`,
        robots: "index, follow",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Event",
          name: eventTitle,
          description: en
            ? "Chao Phraya river cruises with an on-board concert on every sailing."
            : "ล่องเรือแม่น้ำเจ้าพระยาพร้อมคอนเสิร์ตทุกรอบ",
          image: `${baseUrl}/images/boat/unicorn-night-exterior-enhanced-v1.webp`,
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: {
            "@type": "Place",
            name: pierInfo || "Asiatique The Riverfront Pier",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Bangkok",
              addressCountry: "TH",
            },
          },
          offers: event?.zones?.map((zone) => ({
            "@type": "Offer",
            name: zone.name,
            price: zone.price,
            priceCurrency: "THB",
            availability:
              zone.available > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/SoldOut",
            url: `${baseUrl}/checkout`,
          })),
        },
      };
    }

    case "checkout":
      return {
        title: en
          ? "Choose Zone & Guests | River Life"
          : "เลือกโซนและจำนวนคน | River Life",
        description: en
          ? "Choose a zone and guest count aboard UNICORN CRUISE. Specific tables and seats are not assigned at booking."
          : "เลือกโซนและจำนวนผู้ร่วมเดินทางบนเรือ UNICORN CRUISE ยังไม่ระบุโต๊ะหรือเลขที่นั่งเฉพาะ",
        image: defaultImage,
        robots: "noindex, nofollow",
        url: `${baseUrl}/checkout`,
      };

    case "payment":
      return {
        title: en
          ? "Payment & Checkout | River Life"
          : "ชำระเงินและยืนยันการจอง | River Life",
        description: en
          ? "Complete your Chao Phraya cruise booking payment securely via PromptPay QR or bank transfer."
          : "ชำระเงินค่าบัตรล่องเรือ River Life อย่างปลอดภัยผ่าน PromptPay QR Code หรือโอนเงิน",
        image: defaultImage,
        robots: "noindex, nofollow",
        url: `${baseUrl}/payment`,
      };

    case "success":
      return {
        title: en
          ? "Booking Confirmed | River Life"
          : "การจองสำเร็จ | River Life",
        description: en
          ? "Thank you for booking with River Life. Your digital cruise tickets and boarding pass are ready."
          : "ขอบคุณที่จองบัตรล่องเรือกับ River Life บัตรดิจิทัลและ QR Code สำหรับขึ้นเรือพร้อมใช้งานแล้ว",
        image: defaultImage,
        robots: "noindex, nofollow",
        url: `${baseUrl}/success`,
      };

    case "tickets":
    case "orders":
      return {
        title: en
          ? "My Ticket Wallet | River Life"
          : "กระเป๋าบัตรของฉัน | River Life",
        description: en
          ? "View and manage your River Life cruise boarding passes and QR codes."
          : "ดูและจัดการบัตรดิจิทัล ตั๋วขึ้นเรือ และประวัติการจองล่องเรือของคุณ",
        image: defaultImage,
        robots: "noindex, nofollow",
        url: `${baseUrl}/tickets`,
      };

    case "help": {
      const topicTitle = helpTopic ? helpTitle(helpTopic, language) : "";
      return {
        title: en
          ? `${topicTitle ? `${topicTitle} — ` : ""}Help Center & FAQ | River Life`
          : `${topicTitle ? `${topicTitle} — ` : ""}ศูนย์ช่วยเหลือและคำถามที่พบบ่อย | River Life`,
        description: en
          ? "Find answers about pier locations, boarding times, tickets, cancellations, and on-board dining facilities."
          : "รวมข้อมูลสำคัญเกี่ยวกับการขึ้นเรือ ท่าเรือ การเปลี่ยนรอบ การคืนบัตร และสิ่งอำนวยความสะดวกบนเรือ River Life",
        keywords: en
          ? "Chao Phraya cruise FAQ, Asiatique boarding pier, cruise cancellation policy, dress code"
          : "คำถามที่พบบ่อย ล่องเรือ, การขึ้นเรือเอเชียทีค, นโยบายยกเลิกบัตร, จุดจอดรถ, ข้อมูลท่าเรือ",
        image: defaultImage,
        type: "article",
        url: `${baseUrl}/help/${helpTopic || "faq"}`,
        robots: "index, follow",
      };
    }

    case "dashboard":
    case "sales":
    case "operator":
      return {
        title: `${page === "sales" ? "Sales workspace" : page === "operator" ? "Boarding & check-in" : "Admin Dashboard"} | River Life`,
        description:
          "River Life administrative dashboard and management system.",
        robots: "noindex, nofollow",
      };

    case "auth":
      return {
        title: en
          ? "Sign In / Register | River Life"
          : "เข้าสู่ระบบ / ลงทะเบียน | River Life",
        description: en
          ? "Sign in to manage your cruise tickets and reservations."
          : "เข้าสู่ระบบเพื่อจัดการบัตรและข้อมูลการจองของคุณ",
        robots: "noindex, nofollow",
      };

    default:
      return {
        title: siteName,
        description: "River Life Chao Phraya Cruises",
        robots: "index, follow",
      };
  }
}

/**
 * Injects/updates meta tags, OpenGraph, Twitter, canonical, and JSON-LD in the document head
 */
export function applyMetadata(meta: PageMetadata): void {
  if (typeof document === "undefined") return;

  // 1. Document Title
  document.title = meta.title;

  // Helper to get or create a meta tag
  const setMeta = (
    nameOrProperty: "name" | "property",
    key: string,
    content: string | undefined,
  ) => {
    if (!content) return;
    let element = document.querySelector(
      `meta[${nameOrProperty}="${key}"]`,
    ) as HTMLMetaElement | null;
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute(nameOrProperty, key);
      document.head.appendChild(element);
    }
    element.setAttribute("content", content);
  };

  // 2. Standard Meta Tags
  setMeta("name", "description", meta.description);
  if (meta.keywords) {
    setMeta("name", "keywords", meta.keywords);
  }
  setMeta("name", "robots", meta.robots || "index, follow");

  // 3. OpenGraph Tags (Facebook, Line, etc.)
  setMeta("property", "og:title", meta.title);
  setMeta("property", "og:description", meta.description);
  setMeta("property", "og:type", meta.type || "website");
  setMeta("property", "og:site_name", "River Life");
  if (meta.image) {
    setMeta("property", "og:image", meta.image);
  }
  if (meta.url) {
    setMeta("property", "og:url", meta.url);
  }

  // 4. Twitter Card Tags
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", meta.title);
  setMeta("name", "twitter:description", meta.description);
  if (meta.image) {
    setMeta("name", "twitter:image", meta.image);
  }

  // 5. Canonical Link
  if (meta.url) {
    let canonical = document.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", meta.url);
  }

  // 6. JSON-LD Structured Data
  const jsonLdId = "river-life-jsonld";
  let jsonLdScript = document.getElementById(
    jsonLdId,
  ) as HTMLScriptElement | null;
  if (meta.jsonLd) {
    if (!jsonLdScript) {
      jsonLdScript = document.createElement("script");
      jsonLdScript.id = jsonLdId;
      jsonLdScript.type = "application/ld+json";
      document.head.appendChild(jsonLdScript);
    }
    jsonLdScript.textContent = JSON.stringify(meta.jsonLd);
  } else if (jsonLdScript) {
    jsonLdScript.remove();
  }
}
