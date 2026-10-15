import assert from "node:assert/strict";
import { test } from "node:test";
import { events, getConflictingEvent } from "../lib/events";
import { competitionDates, closingCeremony, frontendEventById, officialFinalists, openingCeremony, preEventReporting } from "../lib/frontend-events";

test("every Phase 3 event has its final date and preserved start time and price", () => {
  const expected: Record<string, [number, number, number]> = {
    bgmi: [16, 600, 300], ff: [16, 600, 300], karts: [16, 600, 80],
    val: [16, 600, 500], royale: [16, 600, 80], cp: [17, 720, 100],
    ctf: [17, 720, 50], chess: [17, 720, 100], hunt: [17, 720, 300], trivia: [16, 600, 80],
  };
  assert.equal(events.length, 10);
  for (const event of events) {
    assert.deepEqual([event.date, event.start, event.fee], expected[event.id], event.title);
    assert.equal(event.day, event.date === 16 ? 1 : 2);
  }
});

test("CTF is an individual ₹50 competition without changing other team event contracts", () => {
  const ctf = events.find((event) => event.id === "ctf")!;
  const hunt = events.find((event) => event.id === "hunt")!;
  assert.deepEqual({ mode: ctf.mode, members: ctf.members, fee: ctf.fee, feeUnit: ctf.feeUnit }, { mode: "Individual", members: 1, fee: 50, feeUnit: undefined });
  const ctfFrontend = frontendEventById.get("ctf")!;
  assert.equal(ctfFrontend.officialMode, "Individual");
  assert.equal("officialMembers" in ctfFrontend, false);
  assert.deepEqual({ mode: hunt.mode, members: hunt.members, fee: hunt.fee, feeUnit: hunt.feeUnit }, { mode: "Team (3–4 Players)", members: 4, fee: 300, feeUnit: "team" });
});

test("all 16 October qualifying entries conflict with each other, including Royale and Karts", () => {
  const qualifying = ["bgmi", "ff", "karts", "royale", "val"];
  for (const candidateId of qualifying) {
    const candidate = events.find((event) => event.id === candidateId)!;
    for (const selectedId of qualifying) {
      if (candidateId !== selectedId) assert.equal(getConflictingEvent(candidate, [selectedId])?.id, selectedId, `${candidateId} + ${selectedId}`);
    }
  }
});

test("the 17 October competitions share the authoritative 12 PM–4 PM interval", () => {
  const cp = events.find((event) => event.id === "cp")!;
  assert.deepEqual([cp.start, cp.end, cp.time, cp.slot], [720, 960, "12:00 PM", "12:00 PM – 4:00 PM"]);
  assert.equal(frontendEventById.get("cp")!.officialTime, "12:00 PM–4:00 PM");
  for (const id of ["ctf", "chess", "hunt"]) assert.equal(getConflictingEvent(cp, [id])?.id, id);
  assert.equal(getConflictingEvent(cp, ["trivia"]), undefined);
});

test("three official competition dates preserve ceremonies, finalists, and reporting venue", () => {
  assert.deepEqual(competitionDates, [16, 17, 19]);
  assert.deepEqual(officialFinalists.map((event) => event.id).sort(), ["bgmi", "ff", "karts", "royale", "val"]);
  assert.equal(openingCeremony.date, "16 October 2026");
  assert.equal(openingCeremony.time, "9:00 AM–10:00 AM");
  assert.equal(closingCeremony.date, "19 October 2026");
  assert.equal(closingCeremony.time, "12:00 PM–4:00 PM");
  assert.equal(preEventReporting, "K.P. Nautiyal Auditorium, 5th Floor");
  assert.equal(frontendEventById.get("trivia")!.officialTime, "10:00 AM–11:30 AM");
});

test("Turbo Trivia conflicts with the 16 October qualifier but not a different-date competition", () => {
  const trivia = events.find((event) => event.id === "trivia")!;
  assert.equal(getConflictingEvent(trivia, ["bgmi"])?.id, "bgmi");
  assert.equal(getConflictingEvent(trivia, ["cp"]), undefined);
});

test("all five 19 October Final Round entries share one overlapping session", () => {
  for (const candidate of officialFinalists) {
    const other = officialFinalists.find((event) => event.id !== candidate.id)!;
    assert.equal(getConflictingEvent(candidate, [other.id])?.id, other.id);
    assert.ok(candidate.sessions.some((session) => session.date === 19 && session.start === 540 && session.end === 690));
  }
});
