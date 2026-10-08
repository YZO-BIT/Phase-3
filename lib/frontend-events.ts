import { editorialEvents, events, type FestivalEvent } from "./events";

export type FrontendEvent = FestivalEvent & {
  officialDate: string;
  officialDay: 1 | 2;
  officialTime: string;
  officialStage: string;
  officialVenue: string;
  officialMode: string;
  officialMembers?: number;
  hosts: readonly string[];
  isEsports: boolean;
};

const officialDetails: Record<string, Omit<FrontendEvent, keyof FestivalEvent> & Partial<Pick<FestivalEvent, "time" | "slot">>> = {
  cp: {
    officialDate: "17 October 2026",
    officialDay: 2,
    officialTime: "1:00 PM",
    officialStage: "Technical / Day 2",
    officialVenue: "TCL 302A",
    officialMode: "Individual",
    hosts: ["Akshat", "Yash"],
    isEsports: false,
  },
  ctf: {
    officialDate: "17 October 2026",
    officialDay: 2,
    officialTime: "10:00 AM",
    officialStage: "Technical / Day 2",
    officialVenue: "TCL 302B",
    officialMode: "Individual",
    officialMembers: 1,
    hosts: ["Sachin", "Aadarsh"],
    isEsports: false,
  },
  chess: {
    officialDate: "17 October 2026",
    officialDay: 2,
    officialTime: "11:00 AM",
    officialStage: "Technical / Day 2",
    officialVenue: "Sports Arena",
    officialMode: "Individual",
    hosts: ["Abhinav", "Saksham", "Tanishka"],
    isEsports: false,
  },
  hunt: {
    officialDate: "17 October 2026",
    officialDay: 2,
    officialTime: "12:00 PM",
    officialStage: "Other Competition / Day 2",
    officialVenue: "Sports Ground",
    officialMode: "Team (3–4 Players)",
    hosts: ["Ananya", "Ayushi", "Jhalak", "Vandana"],
    isEsports: false,
  },
  bgmi: {
    officialDate: "16 October 2026",
    officialDay: 1,
    officialTime: "9:00 AM · Qualifying Rounds 1 & 2",
    officialStage: "Esports Qualifying",
    officialVenue: "Seminar Hall",
    officialMode: "Squad (4 Players)",
    hosts: ["Abhinav", "Yuvraj", "Raghav"],
    isEsports: true,
  },
  ff: {
    officialDate: "16 October 2026",
    officialDay: 1,
    officialTime: "9:00 AM · Qualifying Rounds 1 & 2",
    officialStage: "Esports Qualifying",
    officialVenue: "Meeting Hall",
    officialMode: "Squad (4 Players)",
    hosts: ["Saksham", "Ayushi"],
    isEsports: true,
  },
  val: {
    officialDate: "16 October 2026",
    officialDay: 1,
    officialTime: "9:00 AM · Qualifying Rounds 1 & 2",
    officialStage: "Esports Qualifying",
    officialVenue: "TCL 302A & TCL 302B",
    officialMode: "Team (5 Players)",
    hosts: ["Yash", "Purvansh", "Tanishka"],
    isEsports: true,
  },
  karts: {
    officialDate: "16 October 2026",
    officialDay: 1,
    officialTime: "9:00 AM · Qualifying Round 1",
    time: "9:00 AM",
    slot: "9:00 AM · Qualifying Round 1",
    officialStage: "Esports Qualifying",
    officialVenue: "CR 117",
    officialMode: "Individual",
    hosts: ["Sachin", "Sumit", "Ananya"],
    isEsports: true,
  },
  royale: {
    officialDate: "16 October 2026",
    officialDay: 1,
    officialTime: "9:00 AM · Qualifying Round 1",
    time: "9:00 AM",
    slot: "9:00 AM · Qualifying Round 1",
    officialStage: "Esports Qualifying",
    officialVenue: "CR 116",
    officialMode: "Individual",
    hosts: ["Yash", "Akshat", "Aadarsh"],
    isEsports: true,
  },
  trivia: {
    officialDate: "16 October 2026",
    officialDay: 1,
    officialTime: "1:00 PM",
    officialStage: "Other Competition / Day 1",
    officialVenue: "CR 116",
    officialMode: "Individual",
    hosts: ["Jhalak", "Archit"],
    isEsports: false,
  },
};

// Fees come from the authoritative event table; this overlay only supplies presentation details.
export const frontendEvents: FrontendEvent[] = events.map((event) => ({
  ...event,
  ...officialDetails[event.id],
}));

export const frontendEventById = new Map(frontendEvents.map((event) => [event.id, event]));

export const frontendEditorialEvents = editorialEvents.map((event) => ({
  ...event,
  time: frontendEventById.get(event.id)!.time,
  slot: frontendEventById.get(event.id)!.slot,
  fee: frontendEventById.get(event.id)!.fee,
}));

export const competitionDates = [16, 17, 19] as const;
export const competitionDateSummary = "16, 17 and 19 October 2026";

export const openingCeremony = {
  date: "16 October 2026",
  time: "8:00 AM",
  label: "Opening Ceremony",
} as const;

export const preEventReporting = "K.P. Nautiyal Auditorium, 5th Floor";

export const officialFinalists = frontendEvents.filter((event) => ["bgmi", "ff", "val"].includes(event.id));

export const prizeDistribution = {
  date: "19 October 2026",
  time: "1:00 PM",
  label: "Prize Distribution / Award Distribution",
} as const;

export function frontendCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function officialEvent(event: FestivalEvent | FrontendEvent) {
  return frontendEventById.get(event.id) ?? event;
}
