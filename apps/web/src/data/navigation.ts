import { helpTopics, type HelpTopic } from "./help";

export const pagePaths = {
  home: "/",
  event: "/concert",
  checkout: "/checkout",
  payment: "/payment",
  success: "/success",
  orders: "/orders",
  tickets: "/tickets",
  auth: "/auth",
  dashboard: "/dashboard",
  sales: "/sales",
  operator: "/operator",
  help: "/help/faq",
} as const;

export type Page = keyof typeof pagePaths;
export const staffHome = (role: string): Page | null => role === "admin" ? "dashboard" : role === "sales" ? "sales" : role === "operator" ? "operator" : null;
export type NavigationMenu = "events" | "help" | null;

const pathPages = new Map<string, Page>(
  (Object.keys(pagePaths) as Page[]).map((page) => [pagePaths[page], page]),
);

export function pageFromPath(pathname: string): Page {
  return pathname.startsWith("/help/")
    ? "help"
    : (pathPages.get(pathname) ?? "home");
}

export function helpFromPath(pathname: string): HelpTopic {
  const topic = pathname.split("/")[2];
  return helpTopics.includes(topic as HelpTopic) ? (topic as HelpTopic) : "faq";
}
