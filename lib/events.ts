export type PortalVariant = "editorial" | "cyber";

export type FestivalEvent = {
  id: string;
  title: string;
  icon: string;
  day: 1 | 2;
  date: 16 | 17;
  start: number;
  end: number;
  slot: string;
  time: string;
  mode: string;
  members: number;
  fee: number;
  feeUnit?: "team" | "squad";
  venue: string;
  description: string;
  editorialDescription: string;
  editorialVenue: string;
  overlap?: "A" | "B" | "C" | "D";
};

export const events: FestivalEvent[] = [
  {
    id: "cp", title: "Competitive Programming", icon: "terminal", day: 2, date: 17,
    start: 600, end: 780, slot: "10:00 AM – 1:00 PM", time: "10:00 AM",
    mode: "Individual", members: 1, fee: 150, venue: "Lab 301, CSE Wing",
    description: "Algorithmic speed contest solving intense data structure & combinatorial puzzles in C++, Java, or Python.",
    editorialDescription: "Algorithm Synthesis • 120 Mins", editorialVenue: "CSE LAB 301",
  },
  {
    id: "ctf", title: "Capture the Flag (CTF)", icon: "security", day: 2, date: 17,
    start: 660, end: 960, slot: "11:00 AM – 4:00 PM", time: "11:00 AM",
    mode: "Team (2–3 Players)", members: 3, fee: 300, feeUnit: "team", venue: "Cyber Command Lab 4", overlap: "A",
    description: "Jeopardy-style offensive cybersecurity covering binary exploitation, cryptography, network forensics & web app pentesting.",
    editorialDescription: "Reverse Eng & Binary Pwn", editorialVenue: "CYBER COMMAND",
  },
  {
    id: "chess", title: "Chess Championship", icon: "chess", day: 2, date: 17,
    start: 840, end: 1050, slot: "2:00 PM – 5:30 PM", time: "02:00 PM",
    mode: "Individual", members: 1, fee: 100, venue: "Auditorium Foyer",
    description: "Swiss-system rapid tournament (10 min + 5 sec increment) evaluating cold strategic anticipation under pressure.",
    editorialDescription: "FIDE Blitz Swiss System • 5+3", editorialVenue: "AUDITORIUM FOYER",
  },
  {
    id: "hunt", title: "Campus Treasure Hunt", icon: "explore", day: 2, date: 17,
    start: 870, end: 1020, slot: "2:30 PM – 5:00 PM", time: "02:30 PM",
    mode: "Team (3–4 Players)", members: 4, fee: 250, feeUnit: "team", venue: "Central Amphitheatre", overlap: "B",
    description: "Physical and cryptanalytic scavenger race across the GEHU Clement Town grounds, decrypting hidden coordinates.",
    editorialDescription: "Cryptic Geo-Caching Route", editorialVenue: "AMPHITHEATRE",
  },
  {
    id: "bgmi", title: "BGMI Tournament", icon: "target", day: 1, date: 16,
    start: 600, end: 900, slot: "10:00 AM – 3:00 PM", time: "10:00 AM",
    mode: "Squad (4 Players)", members: 4, fee: 400, feeUnit: "squad", venue: "Main Seminar Hall B",
    description: "Battle royale showdown in custom rooms. 16-squad lobbies competing across Erangel, Miramar, and Sanhok.",
    editorialDescription: "Erangel Tactical Custom Scrims", editorialVenue: "SEMINAR HALL B",
  },
  {
    id: "ff", title: "Free Fire MAX", icon: "local_fire_department", day: 1, date: 16,
    start: 690, end: 930, slot: "11:30 AM – 3:30 PM", time: "11:30 AM",
    mode: "Squad (4 Players)", members: 4, fee: 350, feeUnit: "squad", venue: "Esports Pods Zone 1", overlap: "C",
    description: "Rapid-fire tactical squad combat. Multi-round survival brackets testing weapon control and zone rotations.",
    editorialDescription: "Bermuda Clash Squad Elimination", editorialVenue: "ESPORTS POD 1",
  },
  {
    id: "val", title: "Valorant Championship", icon: "sports_esports", day: 1, date: 16,
    start: 570, end: 960, slot: "9:30 AM – 4:00 PM", time: "09:30 AM",
    mode: "Team (5 Players)", members: 5, fee: 500, feeUnit: "team", venue: "GEHU Esports Arena",
    description: "5v5 tactical shooter bracket. LAN setting on high-refresh rigs with standard competitive map vetoes and overtime.",
    editorialDescription: "5v5 Tournament LAN Draft", editorialVenue: "ESPORTS ARENA",
  },
  {
    id: "karts", title: "Smash Karts", icon: "electric_bolt", day: 1, date: 16,
    start: 960, end: 1110, slot: "4:00 PM – 6:30 PM", time: "04:00 PM",
    mode: "Individual", members: 1, fee: 80, venue: "Lab 204, Tech Block",
    description: "Frantic 3D multiplayer arena combat. Power-ups, rockets, spikes, and elimination point ladders.",
    editorialDescription: "High-Speed Chaos Elimination", editorialVenue: "TECH BLOCK LAB 204",
  },
  {
    id: "royale", title: "Clash Royale 1v1", icon: "swords", day: 1, date: 16,
    start: 660, end: 840, slot: "11:00 AM – 2:00 PM", time: "11:00 AM",
    mode: "Individual", members: 1, fee: 100, venue: "Student Activity Hall", overlap: "D",
    description: "Head-to-head mobile RTS duels. Standard tournament cap rules with live projection in the tech lounge.",
    editorialDescription: "Standardized Level 11 Draft", editorialVenue: "ACTIVITY HALL",
  },
  {
    id: "trivia", title: "Turbo Trivia", icon: "psychology", day: 2, date: 17,
    start: 900, end: 1050, slot: "3:00 PM – 5:30 PM", time: "03:00 PM",
    mode: "Individual", members: 1, fee: 80, venue: "Main Seminar Hall A",
    description: "High-speed interactive buzzer quiz on computer history, gaming easter eggs, cyber lore, and sci-fi trivia.",
    editorialDescription: "Speed-Run Tech History & Pop-Culture", editorialVenue: "MAIN SEMINAR HALL",
  },
];

export const editorialEvents = [
  ...events.slice(0, 6), events[7], events[6], ...events.slice(8),
];

export function getConflictingEvent(candidate: FestivalEvent, selectedIds: string[]) {
  return events.find((event) =>
    selectedIds.includes(event.id) && event.id !== candidate.id &&
    event.date === candidate.date && event.start < candidate.end && candidate.start < event.end,
  );
}

export const currency = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
