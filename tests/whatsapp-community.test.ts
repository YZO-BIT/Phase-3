import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { getWhatsAppCommunityInviteUrl, normalizeWhatsAppCommunityUrl } from "../lib/whatsapp";

const officialUrl = "https://chat.whatsapp.com/Kd4hu9LIUdm811J2EWKUX2";

function renderConfirmation() {
  const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", `
    import { createRequire } from "node:module";
    const require = createRequire(process.cwd() + "/package.json");
    require.extensions[".css"] = (module) => { module.exports = {}; };
    const React = require("react");
    const { renderToStaticMarkup } = require("react-dom/server");
    const { events } = require("./lib/events.ts");
    const { Confirmation, } = require("./components/registration/RegistrySteps.tsx");
    const participant = { name: "Test Participant", enrollment: "GEHU/2026/CS/TEST001", email: "participant@example.test", phone: "+91 98765 43210", college: "Test University", city: "Dehradun", branch: "CSE (Core)", year: "3rd Year", otherCourse: "" };
    const registration = { id: "PG-2026-1234567890ABCDEF", createdAt: "2026-01-01T00:00:00.000Z", eventIds: ["cp"], paymentMethod: "OFFLINE", teamName: "", eventNames: "Competitive Programming", eventDates: "17 October 2026", eventTimes: "17 October 2026 · 12:00 PM – 4:00 PM", registrationType: "Individual", teamSize: "1", amount: 100, proofUrl: "", paymentStatus: "PENDING", pdfStatus: "NOT_READY", pdfUrl: null, remarks: "", verifiedBy: "", verifiedAt: "" };
    const props = { participant, selectedEvents: [events.find((event) => event.id === "cp")], registration, onRefresh: async () => {}, onReset() {} };
    console.log(JSON.stringify({ success: renderToStaticMarkup(React.createElement(Confirmation, { ...props, communityInviteUrl: ${JSON.stringify(officialUrl)} })), missing: renderToStaticMarkup(React.createElement(Confirmation, { ...props, communityInviteUrl: null })) }));
  `], { cwd: process.cwd(), encoding: "utf8", timeout: 30_000 });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  return JSON.parse(child.stdout) as { success: string; missing: string };
}

test("WhatsApp community configuration accepts only HTTPS chat.whatsapp.com invitations", () => {
  assert.equal(getWhatsAppCommunityInviteUrl(""), officialUrl);
  assert.equal(getWhatsAppCommunityInviteUrl(officialUrl), officialUrl);
  assert.equal(getWhatsAppCommunityInviteUrl("https://example.com/community"), null);
  assert.equal(normalizeWhatsAppCommunityUrl(officialUrl), officialUrl);
  assert.equal(normalizeWhatsAppCommunityUrl(""), null);
  assert.equal(normalizeWhatsAppCommunityUrl("https://example.com/community"), null);
  assert.equal(normalizeWhatsAppCommunityUrl("http://chat.whatsapp.com/Kd4hu9LIUdm811J2EWKUX2"), null);
  assert.equal(normalizeWhatsAppCommunityUrl("https://chat.whatsapp.com/Kd4hu9LIUdm811J2EWKUX2?invite=unsafe"), null);
});

test("successful confirmation shows exactly one safe WhatsApp Community invitation", () => {
  const { success, missing } = renderConfirmation();
  assert.equal((success.match(/Join WhatsApp Community/g) || []).length, 1);
  assert.match(success, new RegExp(`href="${officialUrl.replaceAll("/", "\\/")}"`));
  assert.match(success, /target="_blank"/);
  assert.match(success, /rel="noopener noreferrer"/);
  assert.match(success, /Payment Verification Pending/);
  assert.match(success, /PDF Not Ready/);
  assert.doesNotMatch(success, /Registration Confirmed/);
  assert.doesNotMatch(success, /event-specific|group invite/i);
  assert.doesNotMatch(missing, /Join WhatsApp Community/);
  assert.match(missing, /community invitation link is currently unavailable/i);
});

test("the initial registration form does not show a community invitation before persistence", () => {
  const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", `
    import { createRequire } from "node:module";
    const require = createRequire(process.cwd() + "/package.json");
    require.extensions[".css"] = (module) => { module.exports = {}; };
    const React = require("react");
    const { renderToStaticMarkup } = require("react-dom/server");
    const { CyberRegistration } = require("./components/registration/Registration.tsx");
    console.log(renderToStaticMarkup(React.createElement(CyberRegistration, { communityInviteUrl: ${JSON.stringify(officialUrl)} })));
  `], { cwd: process.cwd(), encoding: "utf8", timeout: 30_000 });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  assert.doesNotMatch(child.stdout, /Join WhatsApp Community/);
});
