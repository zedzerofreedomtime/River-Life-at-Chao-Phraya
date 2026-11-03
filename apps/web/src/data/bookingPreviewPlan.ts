export type PreviewDeck = "upper" | "lower";
export type PreviewTable = {
  seatPrice?: number;
  availableSeats?: string[];
  id: string;
  deck: PreviewDeck;
  price: number;
  unavailable: boolean;
  seats: number;
  x: number;
  y: number;
  side: "port" | "starboard";
  nearStage: boolean;
};

// Illustrative inventory only. Do not publish as Unicorn's approved deck plan.
export const previewTables: PreviewTable[] = (
  ["upper", "lower"] as const
).flatMap((deck) =>
  Array.from({ length: 8 }, (_, i) => ({
    id: `${deck === "upper" ? "U" : "L"}${String(i + 1).padStart(2, "0")}`,
    deck,
    price: deck === "upper" ? 4800 : 4000,
    unavailable: i === 5,
    seats: 4,
    x: 280 + (i % 4) * 150,
    y: i < 4 ? 150 : 410,
    side: i < 4 ? ("port" as const) : ("starboard" as const),
    nearStage: i % 4 === 0,
  })),
);
