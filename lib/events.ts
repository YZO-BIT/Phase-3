export type PortalVariant = "editorial" | "cyber";
export type CompetitionDate = 16 | 17 | 19;
export const EVENT_TIMEZONE = "Asia/Kolkata";
export const EVENT_TIMEZONE_LABEL = "IST (Asia/Kolkata)";

export type EventSession = {
  date: CompetitionDate;
  start: number;
  end: number;
  slot: string;
  time: string;
};

export type FestivalEvent = {
  id: string;
  title: string;
  icon: string;
  day: 1 | 2;
  date: CompetitionDate;
  start: number;
  end: number;
  slot: string;
  time: string;
  sessions: readonly EventSession[];
  mode: string;
  members: number;
  fee: number;
  feeUnit?: "team" | "squad";
  venue: string;
  description: string;
  editorialDescription: string;
  editorialVenue: string;
};

const qualifierSessions: readonly EventSession[] = [
  { date: 16, start: 600, end: 780, slot: "10:00 AM – 1:00 PM", time: "10:00 AM" },
  { date: 16, start: 840, end: 960, slot: "2:00 PM – 4:00 PM", time: "2:00 PM" },
  { date: 19, start: 540, end: 690, slot: "9:00 AM – 11:30 AM", time: "9:00 AM" },
];

const technicalSessions: readonly EventSession[] = [
  { date: 17, start: 720, end: 960, slot: "12:00 PM – 4:00 PM", time: "12:00 PM" },
];

export const events: FestivalEvent[] = [
  {
    id: "cp", title: "Competitive Programming", icon: "terminal", day: 2, date: 17, start: 720, end: 960,
    slot: "12:00 PM – 4:00 PM", time: "12:00 PM", sessions: technicalSessions,
    mode: "Individual", members: 1, fee: 100, venue: "Lab 301, CSE Wing",
    description: "Algorithmic speed contest solving intense data structure & combinatorial puzzles in C++, Java, or Python.",
    editorialDescription: "Algorithm Synthesis • 120 Mins", editorialVenue: "CSE LAB 301",
  },
  {
    id: "ctf", title: "Capture the Flag (CTF)", icon: "security", day: 2, date: 17, start: 720, end: 960,
    slot: "12:00 PM – 4:00 PM", time: "12:00 PM", sessions: technicalSessions,
    mode: "Individual", members: 1, fee: 50, venue: "Cyber Command Lab 4",
    description: "Jeopardy-style offensive cybersecurity covering binary exploitation, cryptography, network forensics & web app pentesting.",
    editorialDescription: "Reverse Eng & Binary Pwn", editorialVenue: "CYBER COMMAND",
  },
  {
    id: "chess", title: "Chess Championship", icon: "chess", day: 2, date: 17, start: 720, end: 960,
    slot: "12:00 PM – 4:00 PM", time: "12:00 PM", sessions: technicalSessions,
    mode: "Individual", members: 1, fee: 100, venue: "Auditorium Foyer",
    description: "Swiss-system rapid tournament (10 min + 5 sec increment) evaluating cold strategic anticipation under pressure.",
    editorialDescription: "FIDE Blitz Swiss System • 5+3", editorialVenue: "AUDITORIUM FOYER",
  },
  {
    id: "hunt", title: "Campus Treasure Hunt", icon: "explore", day: 2, date: 17, start: 720, end: 960,
    slot: "12:00 PM – 4:00 PM", time: "12:00 PM", sessions: technicalSessions,
    mode: "Team (3–4 Players)", members: 4, fee: 300, feeUnit: "team", venue: "Central Amphitheatre",
    description: "Physical and cryptanalytic scavenger race across the GEHU Clement Town grounds, decrypting hidden coordinates.",
    editorialDescription: "Cryptic Geo-Caching Route", editorialVenue: "AMPHITHEATRE",
  },
  {
    id: "bgmi", title: "BGMI Tournament", icon: "target", day: 1, date: 16, start: 600, end: 780,
    slot: "10:00 AM – 1:00 PM", time: "10:00 AM", sessions: qualifierSessions,
    mode: "Squad (4 Players)", members: 4, fee: 300, feeUnit: "squad", venue: "Main Seminar Hall B",
    description: "Battle royale showdown in custom rooms. 16-squad lobbies competing across Erangel, Miramar, and Sanhok.",
    editorialDescription: "Erangel Tactical Custom Scrims", editorialVenue: "SEMINAR HALL B",
  },
  {
    id: "ff", title: "Free Fire MAX", icon: "local_fire_department", day: 1, date: 16, start: 600, end: 780,
    slot: "10:00 AM – 1:00 PM", time: "10:00 AM", sessions: qualifierSessions,
    mode: "Squad (4 Players)", members: 4, fee: 300, feeUnit: "squad", venue: "Esports Pods Zone 1",
    description: "Rapid-fire tactical squad combat. Multi-round survival brackets testing weapon control and zone rotations.",
    editorialDescription: "Bermuda Clash Squad Elimination", editorialVenue: "ESPORTS POD 1",
  },
  {
    id: "val", title: "Valorant Championship", icon: "sports_esports", day: 1, date: 16, start: 600, end: 780,
    slot: "10:00 AM – 1:00 PM", time: "10:00 AM", sessions: qualifierSessions,
    mode: "Team (5 Players)", members: 5, fee: 500, feeUnit: "team", venue: "GEHU Esports Arena",
    description: "5v5 tactical shooter bracket. LAN setting on high-refresh rigs with standard competitive map vetoes and overtime.",
    editorialDescription: "5v5 Tournament LAN Draft", editorialVenue: "ESPORTS ARENA",
  },
  {
    id: "karts", title: "Smash Karts", icon: "electric_bolt", day: 1, date: 16, start: 600, end: 780,
    slot: "10:00 AM – 1:00 PM", time: "10:00 AM", sessions: qualifierSessions,
    mode: "Individual", members: 1, fee: 80, venue: "Lab 204, Tech Block",
    description: "Frantic 3D multiplayer arena combat. Power-ups, rockets, spikes, and elimination point ladders.",
    editorialDescription: "High-Speed Chaos Elimination", editorialVenue: "TECH BLOCK LAB 204",
  },
  {
    id: "royale", title: "Clash Royale 1v1", icon: "swords", day: 1, date: 16, start: 600, end: 780,
    slot: "10:00 AM – 1:00 PM", time: "10:00 AM", sessions: qualifierSessions,
    mode: "Individual", members: 1, fee: 80, venue: "Student Activity Hall",
    description: "Head-to-head mobile RTS duels. Standard tournament cap rules with live projection in the tech lounge.",
    editorialDescription: "Standardized Level 11 Draft", editorialVenue: "ACTIVITY HALL",
  },
  {
    id: "trivia", title: "Turbo Trivia", icon: "psychology", day: 1, date: 16, start: 600, end: 690,
    slot: "10:00 AM – 11:30 AM", time: "10:00 AM", sessions: [
      { date: 16, start: 600, end: 690, slot: "10:00 AM – 11:30 AM", time: "10:00 AM" },
    ],
    mode: "Individual", members: 1, fee: 80, venue: "Main Seminar Hall A",
    description: "High-speed interactive buzzer quiz on computer history, gaming easter eggs, cyber lore, and sci-fi trivia.",
    editorialDescription: "Speed-Run Tech History & Pop-Culture", editorialVenue: "MAIN SEMINAR HALL",
  },
];

export const editorialEvents = [...events.slice(0, 6), events[7], events[6], ...events.slice(8)];

export function sessionsOverlap(first: EventSession, second: EventSession) {
  return first.date === second.date && first.start < second.end && second.start < first.end;
}

export function eventsConflict(first: FestivalEvent, second: FestivalEvent) {
  return first.sessions.some((firstSession) => second.sessions.some((secondSession) => sessionsOverlap(firstSession, secondSession)));
}

export function getConflictingEvent(candidate: FestivalEvent, selectedIds: string[]) {
  return events.find((event) => selectedIds.includes(event.id) && event.id !== candidate.id && eventsConflict(candidate, event));
}

export function eventScheduleLabel(event: FestivalEvent) {
  return event.sessions.map((session) => `${session.date} October 2026 · ${session.slot}`).join("; ");
}

export function eventDateLabel(event: FestivalEvent) {
  return [...new Set(event.sessions.map((session) => session.date))].map((date) => `${date} October 2026`).join(" & ");
}

export function overlappingSessionLabel(first: FestivalEvent, second: FestivalEvent) {
  return [...new Set(first.sessions.flatMap((firstSession) => second.sessions.filter((secondSession) => sessionsOverlap(firstSession, secondSession)).map((session) => `${session.date} October 2026 · ${session.slot}`)))].join("; ");
}

export const currency = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
