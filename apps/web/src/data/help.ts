import type { Language } from "./i18n";

export const helpTopics = [
  "contact",
  "privacy",
  "faq",
  "payment",
  "refunds",
  "tickets",
] as const;
export type HelpTopic = (typeof helpTopics)[number];
// Keep existing routes intact while only publishing confirmed contact details.
export const visibleHelpTopics = [
  "contact",
  "privacy",
  "payment",
  "refunds",
  "tickets",
] as const satisfies readonly HelpTopic[];

const titles: Record<HelpTopic, readonly [string, string]> = {
  privacy: ["การใช้ข้อมูลส่วนบุคคล", "Privacy information"],
  contact: ["ติดต่อเรา", "Contact us"],
  faq: ["ช่วยเหลือ / คำถามที่พบบ่อย", "Help & FAQ"],
  payment: ["การชำระเงิน", "Payments"],
  refunds: ["การเลื่อนงาน / คืนเงิน", "Postponement & refunds"],
  tickets: ["เงื่อนไขการใช้บัตร", "Ticket terms"],
};

export function helpTitle(topic: HelpTopic, language: Language): string {
  return titles[topic][language === "en" ? 1 : 0];
}
