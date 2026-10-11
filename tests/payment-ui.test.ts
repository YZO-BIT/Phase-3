import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

// The backend suite runs with react-server conditions. Render the real client
// component in a normal React process; only CSS imports are stubbed for Node.
const renderPayments = () => {
  const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", `
    import { createRequire } from "node:module";
    const require = createRequire(process.cwd() + "/package.json");
    require.extensions[".css"] = (module) => { module.exports = {}; };
    const React = require("react");
    const { renderToStaticMarkup } = require("react-dom/server");
    const { Payment } = require("./components/registration/RegistrySteps.tsx");
    const props = { total: 100, eventIds: ["cp"], utr: "", setUtr() {}, screenshot: null, setScreenshot() {}, setPaymentMethod() {} };
    const html = Object.fromEntries(["ONLINE", "OFFLINE"].map((paymentMethod) => [paymentMethod, renderToStaticMarkup(React.createElement(Payment, { ...props, paymentMethod }))]));
    console.log(JSON.stringify(html));
  `], { cwd: process.cwd(), encoding: "utf8", timeout: 30_000 });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  return JSON.parse(child.stdout) as { ONLINE: string; OFFLINE: string };
};

test("payment UI hides UTR, screenshot, and QR for offline while preserving online requirements", () => {
  const html = renderPayments();
  assert.doesNotMatch(html.OFFLINE, /payment-utr|12-Digit Bank Reference|payment-proof|qr_code_2/);
  assert.match(html.OFFLINE, /Pending Verification/);
  assert.match(html.ONLINE, /<input[^>]*id="payment-utr"[^>]*pattern="\[0-9\]\{12\}"[^>]*required=""/);
  assert.match(html.ONLINE, /<input[^>]*id="payment-proof"[^>]*required=""/);
  assert.match(html.ONLINE, /Official Treasury Gateway|qr_code_2/);
});
