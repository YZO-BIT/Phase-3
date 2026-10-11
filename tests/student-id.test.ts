import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const renderParticipantFields = () => {
  const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", `
    import { createRequire } from "node:module";
    const require = createRequire(process.cwd() + "/package.json");
    require.extensions[".css"] = (module) => { module.exports = {}; };
    const React = require("react");
    const { renderToStaticMarkup } = require("react-dom/server");
    const { ParticipantFields } = require("./components/registration/ParticipantFields.tsx");
    const participant = { name: "", enrollment: "", email: "", phone: "", college: "", city: "", branch: "CSE (Core)", year: "3rd Year", otherCourse: "" };
    console.log(renderToStaticMarkup(React.createElement(ParticipantFields, { variant: "cyber", value: participant, onChange() {} })));
  `], { cwd: process.cwd(), encoding: "utf8", timeout: 30_000 });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  return child.stdout;
};

test("registration form presents Student ID and the requested example without changing the enrollment field", () => {
  const html = renderParticipantFields();
  assert.match(html, />Student ID \*</);
  assert.match(html, /placeholder="e\.g\. 24011205"/);
  assert.doesNotMatch(html, /Enrollment Number \/ Student ID|e\.g\. GEHU\/2023\/8492/);
});
