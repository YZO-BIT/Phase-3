import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const renderInitialMarkup = () => {
  const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", `
    import { createRequire } from "node:module";
    const require = createRequire(process.cwd() + "/package.json");
    require.extensions[".css"] = (module) => { module.exports = {}; };
    const React = require("react");
    const { renderToStaticMarkup } = require("react-dom/server");
    const { EventsCatalog } = require("./components/EventsCatalog.tsx");
    const { CyberSchedule } = require("./components/CyberSchedule.tsx");
    const { ParticipantFields } = require("./components/registration/ParticipantFields.tsx");
    const participant = { name: "", enrollment: "", email: "", phone: "", college: "", city: "", branch: "CSE (Core)", year: "3rd Year", otherCourse: "" };
    console.log(JSON.stringify({
      catalog: renderToStaticMarkup(React.createElement(EventsCatalog)),
      schedule: renderToStaticMarkup(React.createElement(CyberSchedule)),
      registration: renderToStaticMarkup(React.createElement(ParticipantFields, { variant: "cyber", value: participant, onChange() {} })),
    }));
  `], { cwd: process.cwd(), encoding: "utf8", timeout: 30_000 });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  return JSON.parse(child.stdout) as { catalog: string; schedule: string; registration: string };
};

test("initial client-component markup is deterministic and contains no extension-injected attributes", () => {
  const markup = renderInitialMarkup();
  for (const html of Object.values(markup)) assert.doesNotMatch(html, /fdprocessedid/);

  const activeFilters = markup.catalog.match(/aria-pressed="true"/g) || [];
  assert.equal(activeFilters.length, 1);
  assert.match(markup.catalog, />All Events \(10\)<\/button>/);
  assert.match(markup.catalog, />Day 1 \(6\)<\/button>/);

  for (const label of ["16 October · Qualifying", "17 October · Competitions", "19 October · Finals"]) assert.match(markup.schedule, new RegExp(label));
  assert.match(markup.schedule, /aria-pressed="true"[^>]*>16 October · Qualifying/);
  assert.doesNotMatch(markup.schedule, /aria-pressed="true"[^>]*>17 October · Competitions/);
  assert.doesNotMatch(markup.schedule, /aria-pressed="true"[^>]*>19 October · Finals/);

  assert.match(markup.registration, />Student ID \*</);
  assert.match(markup.registration, /placeholder="e\.g\. 24011205"/);
  assert.match(markup.registration, />Year of Study \*</);
});
