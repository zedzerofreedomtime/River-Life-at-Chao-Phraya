/** Illustrative UI fixtures only. Never use these IDs/capacities as sale inventory. */
export type PreviewDeck = "upper" | "lower";
export type PreviewTable = {
  id: string;
  deck: PreviewDeck;
  seats: number;
  x: number;
  y: number;
  status: "available" | "sold" | "held" | "blocked";
  kind?: "banquet";
};
// Photo-led schematic: upper centre banquet run; lower centre buffet island.
// Keep every dining fixture clear of the tapered bow and the aft stair openings.
const upperRows = [31, 39, 47, 55, 63, 71];
export const previewTables: PreviewTable[] = [
  ...(["upper", "lower"] as const).flatMap((deck) =>
    Array.from(
      { length: deck === "upper" ? 18 : 12 },
      (_, i): PreviewTable => ({
        id: `${deck === "upper" ? "U" : "L"}${String(i + 1).padStart(2, "0")}`,
        deck,
        seats: 4,
        kind: deck === "upper" && i % 3 === 1 ? "banquet" : undefined,
        x:
          deck === "upper"
            ? [26, 50, 74][i % 3]
            : i % 2 === 0
              ? 26
              : 74,
        y:
          deck === "upper"
            ? upperRows[Math.floor(i / 3)]
            : 31 + Math.floor(i / 2) * 8,
        status:
          i === 5
            ? "sold"
            : i === 9
              ? "held"
              : i === 16
                ? "blocked"
                : "available",
      }),
    ),
  ),
];
export const previewStatus = {
  available: { th: "ว่าง (ตัวอย่าง)", en: "Available (demo)" },
  selected: { th: "เลือกแล้ว", en: "Selected" },
  sold: { th: "จองแล้ว (ตัวอย่าง)", en: "Sold (demo)" },
  held: { th: "พักไว้ (ตัวอย่าง)", en: "Held (demo)" },
  blocked: { th: "ปิดใช้ (ตัวอย่าง)", en: "Blocked (demo)" },
};
