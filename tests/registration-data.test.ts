import assert from "node:assert/strict";
import { test } from "node:test";
import { participantSchema, registrationSchema } from "../lib/registration-data";

const participant = {
  name: "Test Participant", enrollment: "GEHU/2026/CS/COURSE001", email: "participant@example.test",
  phone: "+91 98765 43210", college: "Test University", city: "Dehradun", branch: "CSE (Core)", year: "3rd Year",
};
const registration = {
  participant, eventIds: ["cp"], teamName: "", members: [], utr: "123456789012", amount: 100,
  agreements: { authentic: true, conduct: true }, idempotencyKey: "d3c67b5f-ff20-4140-96d6-077133556d4d",
};

test("Other course requires a bounded custom course name", () => {
  assert.throws(() => participantSchema.parse({ ...participant, branch: "Other" }), /course is required/i);
  const parsed = participantSchema.parse({ ...participant, branch: "Other", otherCourse: "Robotics Engineering" });
  assert.equal(parsed.otherCourse, "Robotics Engineering");
  assert.throws(() => participantSchema.parse({ ...participant, branch: "Other", otherCourse: "   " }), /course is required/i);
});

test("predefined course selections cannot carry a hidden custom course", () => {
  assert.throws(() => participantSchema.parse({ ...participant, otherCourse: "Robotics Engineering" }), /only when Other/i);
  assert.equal(participantSchema.parse(participant).otherCourse, "");
});

test("payment method is an explicit online/offline allowlist", () => {
  assert.equal(registrationSchema.parse({ ...registration, paymentMethod: "OFFLINE" }).paymentMethod, "OFFLINE");
  assert.equal(registrationSchema.parse(registration).paymentMethod, "ONLINE");
  assert.throws(() => registrationSchema.parse({ ...registration, paymentMethod: "CASH" }), /payment method/i);
});

test("offline registrations accept missing or blank UTR and retain legacy references", () => {
  const { utr: _utr, ...withoutUtr } = registration;
  assert.equal(registrationSchema.parse({ ...withoutUtr, paymentMethod: "OFFLINE" }).utr, "");
  for (const utr of ["", "   "]) assert.equal(registrationSchema.parse({ ...registration, utr, paymentMethod: "OFFLINE" }).utr, "");
  assert.equal(registrationSchema.parse({ ...registration, paymentMethod: "OFFLINE" }).utr, "123456789012");
});

test("online and legacy-default registrations still require a valid 12-digit UTR", () => {
  const { utr: _utr, ...withoutUtr } = registration;
  for (const paymentMethod of ["ONLINE", undefined]) {
    assert.throws(() => registrationSchema.parse({ ...withoutUtr, paymentMethod }), /12-digit bank reference \/ UTR/i);
    for (const utr of ["", "   ", "123", "12345678901a", "1234567890123"]) {
      assert.throws(() => registrationSchema.parse({ ...registration, paymentMethod, utr }), /12-digit bank reference \/ UTR/i);
    }
    assert.equal(registrationSchema.parse({ ...registration, paymentMethod }).utr, registration.utr);
  }
});

test("omitting an offline UTR cannot bypass other registration validations or request allowlists", () => {
  const offline = { ...registration, paymentMethod: "OFFLINE", utr: "" };
  for (const invalid of [
    { ...offline, amount: 1 }, { ...offline, paymentStatus: "APPROVED" },
    { ...offline, participant: { ...participant, name: "" } }, { ...offline, agreements: { authentic: false, conduct: true } },
    { ...offline, eventIds: ["cp", "chess"], amount: 200 }, { ...offline, utr: { $ne: null } },
  ]) assert.equal(registrationSchema.safeParse(invalid).success, false);
});
