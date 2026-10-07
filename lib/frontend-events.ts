import { events, type FestivalEvent } from "./events";

export type FrontendEvent = FestivalEvent & {
  officialDate: string;
  officialDay: 1 | 2;
  officialTime: string;
  officialStage: string;
  officialFee: number;
  officialVenue: string;
  officialMode: string;
  officialMembers?: number;
  hosts: readonly string[];
  isEsports: boolean;
};

const officialDetails: Record<string, Omit<FrontendEvent, keyof FestivalEvent>> = {
  cp: {
    officialDate: "17 October 2026",
    officialDay: 2,
    officialTime: "10:00 AM",
    officialStage: "Technical / Day 2",
    officialFee: 100,
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
    officialFee: 100,
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
    officialFee: 100,
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
    officialFee: 250,
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
    officialFee: 250,
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
    officialFee: 250,
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
    officialFee: 500,
    officialVenue: "TCL 302A & TCL 302B",
    officialMode: "Team (5 Players)",
    hosts: ["Yash", "Purvansh", "Tanishka"],
    isEsports: true,
  },
  karts: {
    officialDate: "16 October 2026",
    officialDay: 1,
    officialTime: "9:00 AM · Qualifying Rounds 1 & 2",
    officialStage: "Esports Qualifying",
    officialFee: 50,
    officialVenue: "CR 117",
    officialMode: "Individual",
    hosts: ["Sachin", "Sumit", "Ananya"],
    isEsports: true,
  },
  royale: {
    officialDate: "16 October 2026",
    officialDay: 1,
    officialTime: "9:00 AM · Qualifying Rounds 1 & 2",
    officialStage: "Esports Qualifying",
    officialFee: 50,
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
    officialFee: 50,
    officialVenue: "CR 116",
    officialMode: "Individual",
    hosts: ["Jhalak", "Archit"],
    isEsports: false,
  },
};

export const frontendEvents: FrontendEvent[] = events.map((event) => ({
  ...event,
  ...officialDetails[event.id],
}));

export const frontendEventById = new Map(frontendEvents.map((event) => [event.id, event]));

export const preEventReporting = "KP Nautiyal Auditorium, 5th Floor";

export const officialFinalists = frontendEvents.filter((event) => event.isEsports);

export function frontendCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function officialEvent(event: FestivalEvent | FrontendEvent) {
  return frontendEventById.get(event.id) ?? event;
}
