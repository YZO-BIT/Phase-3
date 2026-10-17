import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const renderCards = () => {
  const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", `
    import { createRequire } from "node:module";
    const require = createRequire(process.cwd() + "/package.json");
    require.extensions[".css"] = (module) => { module.exports = {}; };
    const React = require("react");
    const { renderToStaticMarkup } = require("react-dom/server");
    const { RegistrationCard } = require("./components/admin/RegistrationCard.tsx");
    const registration = {
      id: "PG-2026-1234567890ABCDEF", createdAt: "2026-10-17T10:00:00.000Z", participantName: "Test Participant",
      email: "participant@example.test", phone: "+91 98765 43210", college: "Test University", city: "Dehradun",
      eventIds: ["cp"], paymentMethod: "ONLINE", teamName: "", eventNames: "Competitive Programming",
      eventDates: "17 October 2026", eventTimes: "17 October 2026 · 12:00 PM – 4:00 PM", registrationType: "Individual",
      teamSize: "1", amount: 100, proofUrl: "", paymentStatus: "PENDING", pdfStatus: "NOT_READY", pdfUrl: null,
      remarks: "", verifiedBy: "", verifiedAt: "", academicYear: "3rd Year",
    };
    const render = (academicYear) => renderToStaticMarkup(React.createElement(RegistrationCard, { registration: { ...registration, academicYear }, onOpen() {} }));
    console.log(JSON.stringify({ current: render("3rd Year"), missing: render(null) }));
  `], { cwd: process.cwd(), encoding: "utf8", timeout: 30_000 });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  return JSON.parse(child.stdout) as { current: string; missing: string };
};

test("registration card shows academic year before the details action", () => {
  const html = renderCards().current;
  assert.match(html, /<dt>Academic Year<\/dt><dd>3rd Year<\/dd>/);
  assert.ok(html.indexOf("Academic Year") < html.indexOf("View Payment &amp; Details"));
});

test("registration card shows a clear fallback when academic year is unavailable", () => {
  assert.match(renderCards().missing, /<dt>Academic Year<\/dt><dd>Not provided<\/dd>/);
});
