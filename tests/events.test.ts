import assert from "node:assert/strict";
import { test } from "node:test";
import { events, getConflictingEvent } from "../lib/events";
import { competitionDates, frontendEventById, officialFinalists, openingCeremony, preEventReporting, prizeDistribution } from "../lib/frontend-events";

test("every Phase 3 event has its final date and preserved start time and price", () => {
  const expected: Record<string, [number, number, number]> = {
    bgmi: [16, 600, 300], ff: [16, 690, 300], karts: [16, 960, 80],
    val: [16, 570, 500], royale: [16, 660, 80], cp: [17, 780, 100],
    ctf: [17, 660, 100], chess: [17, 840, 100], hunt: [17, 870, 300], trivia: [17, 900, 80],
  };
  assert.equal(events.length, 10);
  for (const event of events) {
    assert.deepEqual([event.date, event.start, event.fee], expected[event.id], event.title);
    assert.equal(event.day, event.date === 16 ? 1 : 2);
  }
});

test("same-slot Clash Royale and Smash Karts conflict in both directions without changing unrelated game rules", () => {
  const games = events.filter((event) => event.date === 16);
  for (const candidate of games) for (const selected of games) {
    if (candidate.id === selected.id) continue;
    const sameSlotPair = [candidate.id, selected.id].sort().join(",") === "karts,royale";
    const existingOverlap = selected.start < candidate.end && candidate.start < selected.end;
    assert.equal(Boolean(getConflictingEvent(candidate, [selected.id])), sameSlotPair || existingOverlap, `${candidate.id} + ${selected.id}`);
  }
});

test("CP uses the confirmed 1 PM–4 PM slot and existing interval conflict validation", () => {
  const cp = events.find((event) => event.id === "cp")!;
  assert.deepEqual([cp.start, cp.end, cp.time, cp.slot], [780, 960, "1:00 PM", "1:00 PM – 4:00 PM"]);
  assert.equal(frontendEventById.get("cp")!.officialTime, "1:00 PM");
  assert.equal(getConflictingEvent(cp, ["chess"])?.id, "chess");
  assert.equal(getConflictingEvent(cp, ["ff", "karts"]), undefined);
});

test("three official competition dates preserve ceremony, finalists, reporting venue, and prize time", () => {
  assert.deepEqual(competitionDates, [16, 17, 19]);
  assert.deepEqual(officialFinalists.map((event) => event.id).sort(), ["bgmi", "ff", "val"]);
  assert.equal(openingCeremony.date, "16 October 2026");
  assert.equal(openingCeremony.time, "8:00 AM");
  assert.equal(prizeDistribution.date, "19 October 2026");
  assert.equal(prizeDistribution.time, "1:00 PM");
  assert.equal(preEventReporting, "K.P. Nautiyal Auditorium, 5th Floor");
  assert.equal(frontendEventById.get("karts")!.officialTime, frontendEventById.get("royale")!.officialTime);
});

test("conflict protection follows the corrected dates", () => {
  assert.equal(getConflictingEvent(events.find((e) => e.id === "val")!, ["bgmi"])?.id, "bgmi");
  assert.equal(getConflictingEvent(events.find((e) => e.id === "ctf")!, ["cp"])?.id, "cp");
  assert.equal(getConflictingEvent(events.find((e) => e.id === "bgmi")!, ["cp"]), undefined);
});
