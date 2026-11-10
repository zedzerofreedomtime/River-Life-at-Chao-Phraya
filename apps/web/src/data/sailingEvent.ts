import type { EventInfo } from "./api";
import { cruiseDisplayText, type Sailing } from "./cruises";
// Public pages use the same inventory as booking, including boarding times and seat prices.
export function sailingEvent(base: EventInfo, sailing?: Sailing): EventInfo {
  const time = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Bangkok",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(new Date(value))
      : "—";
  const date = sailing?.departure_at
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(sailing.departure_at))
    : null;
  return {
    ...base,
    sailing_id: sailing?.id,
    title: sailing ? cruiseDisplayText(sailing.title) : base.title,
    date,
    date_is_preview: base.demo,
    boarding: time(sailing?.boarding_at ?? null),
    departure: time(sailing?.departure_at ?? null),
    pier: sailing ? cruiseDisplayText(sailing.pier) : "—",
    pier_number: 0,
    zones: (sailing?.tables ?? []).map((table) => ({
      id: table.id,
      name: table.id,
      price: table.seat_price ?? table.price / table.seats,
      capacity: table.seats,
      available:
        table.available_seats?.length ?? (table.available ? table.seats : 0),
    })),
  };
}
