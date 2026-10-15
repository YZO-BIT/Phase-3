import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("CTF selection UI presents an individual ₹50 option", () => {
  const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", `
    import { createRequire } from "node:module";
    const require = createRequire(process.cwd() + "/package.json");
    require.extensions[".css"] = (module) => { module.exports = {}; };
    const React = require("react");
    const { renderToStaticMarkup } = require("react-dom/server");
    const { EventSelection } = require("./components/registration/EventSelection.tsx");
    const { TeamFields } = require("./components/registration/RegistrySteps.tsx");
    const { frontendEventById } = require("./lib/frontend-events.ts");
    console.log(renderToStaticMarkup(React.createElement(EventSelection, { variant: "cyber", selectedIds: ["ctf", "trivia"], onSelect() {} })));
    console.log("TEAM_FIELDS:" + renderToStaticMarkup(React.createElement(TeamFields, { participant: { name: "Test Participant", enrollment: "GEHU/2026/CS/TEST001" }, selectedEvents: [frontendEventById.get("ctf")], teamName: "", setTeamName() {}, members: [], setMembers() {} })));
  `], { cwd: process.cwd(), encoding: "utf8", timeout: 30_000 });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  const ctfMarkup = child.stdout.split("<label").find((markup) => markup.includes("<h3>Capture the Flag (CTF)</h3>"));
  assert.ok(ctfMarkup, "CTF event entry should be rendered");
  assert.match(ctfMarkup, /Individual/);
  assert.match(ctfMarkup, /₹50/);
  assert.doesNotMatch(ctfMarkup, /Team \(2–3 Players\)|₹100/);
  const teamMarkup = child.stdout.split("TEAM_FIELDS:")[1];
  assert.ok(teamMarkup, "CTF team-field rendering should be captured");
  assert.match(teamMarkup, /Individual Tracks Selected/);
  assert.doesNotMatch(teamMarkup, /Official Squad \/ Team Name|Secondary Roster Members/);
});
