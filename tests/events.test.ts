import assert from "node:assert/strict";
import { test } from "node:test";
import { events, getConflictingEvent } from "../lib/events";

test("every Phase 3 event has its final date and preserved start time and price", () => {
  const expected: Record<string, [number, number, number]> = {
    bgmi: [16, 600, 300], ff: [16, 690, 300], karts: [16, 960, 80],
    val: [16, 570, 500], royale: [16, 660, 80], cp: [17, 600, 100],
    ctf: [17, 660, 100], chess: [17, 840, 100], hunt: [17, 870, 300], trivia: [17, 900, 80],
  };
  assert.equal(events.length, 10);
  for (const event of events) {
    assert.deepEqual([event.date, event.start, event.fee], expected[event.id], event.title);
    assert.equal(event.day, event.date === 16 ? 1 : 2);
  }
});

test("conflict protection follows the corrected dates", () => {
  assert.equal(getConflictingEvent(events.find((e) => e.id === "val")!, ["bgmi"])?.id, "bgmi");
  assert.equal(getConflictingEvent(events.find((e) => e.id === "ctf")!, ["cp"])?.id, "cp");
  assert.equal(getConflictingEvent(events.find((e) => e.id === "bgmi")!, ["cp"]), undefined);
});
