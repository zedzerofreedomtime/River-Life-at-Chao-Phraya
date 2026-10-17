import { createContext } from "react";
import type { EventInfo } from "../../data/api";

export const defaultProgramme = { title: "Concert on the River", boarding: "", departure: "" };
export const CruiseProgrammeContext = createContext<Pick<EventInfo, "title" | "boarding" | "departure">>(defaultProgramme);
