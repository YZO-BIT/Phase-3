import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test, type TestContext } from "node:test";
import { pathToFileURL } from "node:url";

const script = resolve("scripts/check-google.ts");
const tsx = pathToFileURL(createRequire(resolve("package.json")).resolve("tsx")).href;

async function runCheck(t: TestContext, overrides: Record<string, string> = {}) {
  const root = await mkdtemp(join(tmpdir(), "phase3-google-env-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  // Intentionally malformed test key fails locally during signing, without a network call.
  const localValues = [
    "APP_URL=http://localhost:3000",
    `LOCAL_PRIVATE_STORAGE_DIR=${join(root, ".private")}`,
    "ALLOW_LOCAL_GOOGLE_WRITES=true",
    "LOCAL_GOOGLE_SHEET_ID=local-test-sheet-id",
    "LOCAL_GOOGLE_SERVICE_ACCOUNT_EMAIL=local-test-service@example.test",
    'LOCAL_GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\ninvalid-test-key\\n-----END PRIVATE KEY-----\\n"',
    "LOCAL_GOOGLE_SHEET_NAME=Local Test Tab",
  ];
  await writeFile(join(root, ".env.local"), localValues.join("\n"), { mode: 0o600 });
  const env = { ...process.env };
  for (const name of Object.keys(env)) {
    if (/^(GOOGLE_|LOCAL_GOOGLE_|ADMIN_|PAYMENT_)/.test(name) || ["APP_URL", "PRIVATE_STORAGE_DIR", "LOCAL_PRIVATE_STORAGE_DIR", "ALLOW_LOCAL_GOOGLE_WRITES", "SESSION_SECRET", "NODE_ENV", "__NEXT_PROCESSED_ENV"].includes(name)) delete env[name];
  }
  const child = spawnSync(process.execPath, ["--conditions=react-server", "--import", tsx, script], {
    cwd: root, env: { ...env, ...overrides }, encoding: "utf8", timeout: 30_000,
  });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 1);
  const output = `${child.stdout}\n---STDERR---\n${child.stderr}`.trim();
  const jsonLine = output.split(/\r?\n/).map((l) => l.trim()).find((l) => l.startsWith("{"));
  if (!jsonLine) {
    throw new Error(`No JSON found in output:\nSTDOUT: ${child.stdout}\nSTDERR: ${child.stderr}`);
  }
  const diagnostic = JSON.parse(jsonLine);
  return { diagnostic, output };
}

test("Google diagnostic CLI loads local Next.js environment files before reading configuration", async (t) => {
  const { diagnostic, output } = await runCheck(t);
  const google = diagnostic.googleSheets;
  assert.equal(google.configuration.sheetIdConfigured, true);
  assert.equal(google.configuration.serviceAccountEmailConfigured, true);
  assert.equal(google.configuration.privateKeyConfigured, true);
  assert.equal(google.configuration.privateKeyHasBeginMarker, true);
  assert.equal(google.configuration.privateKeyHasEndMarker, true);
  assert.equal(google.configuration.privateKeyParseable, false);
  assert.equal(google.phase, "authentication");
  assert.equal(google.authenticationSucceeded, false);
  for (const value of ["local-test-sheet-id", "local-test-service@example.test", "invalid-test-key", "Local Test Tab", "BEGIN PRIVATE KEY"]) {
    assert.equal(output.includes(value), false, "CLI must not print environment values");
  }
  for (const name of ["spreadsheetId", "sheetName", "range", "apiMessage"]) assert.equal(name in google, false);
});

test("Google diagnostic CLI preserves injected local environment precedence over .env.local", async (t) => {
  const { diagnostic } = await runCheck(t, { LOCAL_GOOGLE_PRIVATE_KEY: "" });
  const google = diagnostic.googleSheets;
  assert.equal(google.phase, "configuration");
  assert.equal(google.configuration.sheetIdConfigured, true);
  assert.equal(google.configuration.serviceAccountEmailConfigured, true);
  assert.equal(google.configuration.privateKeyConfigured, false);
});

test("production Google diagnostic CLI does not load .env.local", async (t) => {
  const { diagnostic } = await runCheck(t, { NODE_ENV: "production" });
  const google = diagnostic.googleSheets;
  assert.equal(google.phase, "configuration");
  assert.equal(google.configuration.sheetIdConfigured, false);
  assert.equal(google.configuration.serviceAccountEmailConfigured, false);
  assert.equal(google.configuration.privateKeyConfigured, false);
});
