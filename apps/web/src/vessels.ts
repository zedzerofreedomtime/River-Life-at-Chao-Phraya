export type Vessel = {
  id: string;
  name: string;
  nameEn: string;
  image: string;
  pier: string;
  capacity: number;
  availability: "open" | "coming-soon";
  summary: string;
};

// Kept separate from an individual sailing/event. New vessels can be added here
// now, and this list can later be loaded from the fleet API without changing
// the catalogue or routing UI.
export const vessels: Vessel[] = [
  {
    id: "unicorn-cruise",
    name: "ยูนิคอร์นครูซ",
    nameEn: "UNICORN CRUISE",
    image: "/images/boat/unicorn-night-exterior.jpg",
    pier: "ICONSIAM",
    capacity: 350,
    availability: "open",
    summary: "คอนเสิร์ตและดินเนอร์บนแม่น้ำเจ้าพระยา",
  },
];
