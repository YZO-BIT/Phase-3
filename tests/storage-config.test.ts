import assert from "node:assert/strict";
import { test } from "node:test";
import { assertPersistentStorageConfigured, readConfig } from "../lib/server/config";
import { GoogleSheetsRepository } from "../lib/server/googleSheets";
import { LOCAL_GOOGLE_DISABLED_ERROR, MISSING_DOSSIER_ERROR, PERSISTENT_STORAGE_ERROR } from "../lib/server/errors";

const names = [
  "APP_URL", "PRIVATE_STORAGE_DIR", "LOCAL_PRIVATE_STORAGE_DIR", "GOOGLE_SHEET_ID", "GOOGLE_SHEET_NAME",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY", "LOCAL_GOOGLE_SHEET_ID", "LOCAL_GOOGLE_SHEET_NAME",
  "LOCAL_GOOGLE_SERVICE_ACCOUNT_EMAIL", "LOCAL_GOOGLE_PRIVATE_KEY", "ALLOW_LOCAL_GOOGLE_WRITES", "NODE_ENV",
];

function preserveEnvironment() {
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  return () => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  };
}

test("storage errors expose the expected stable organizer messages", () => {
  assert.equal(PERSISTENT_STORAGE_ERROR, "Persistent private registration storage is unavailable. Registration could not be completed. Please contact the organizer.");
  assert.equal(MISSING_DOSSIER_ERROR, "Registration is listed in Google Sheets, but its private registration dossier is unavailable. No private data was reconstructed; follow the organizer recovery procedure.");
});

test("production configuration reports missing durable storage before registration work", () => {
  const restore = preserveEnvironment();
  try {
    Object.assign(process.env, { APP_URL: "https://example.test", PRIVATE_STORAGE_DIR: "", NODE_ENV: "production" });
    const config = readConfig();
    assert.equal(config.privateStorageConfigured, false);
    assert.throws(() => assertPersistentStorageConfigured(config), new RegExp(PERSISTENT_STORAGE_ERROR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  } finally { restore(); }
});

test("localhost ignores production targets and disables Google Sheets by default", async () => {
  const restore = preserveEnvironment();
  let requests = 0;
  try {
    Object.assign(process.env, {
      APP_URL: "http://localhost:3000", PRIVATE_STORAGE_DIR: "/production-only", GOOGLE_SHEET_ID: "production-sheet",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "production@example.test", GOOGLE_PRIVATE_KEY: "production-key",
    });
    for (const name of ["LOCAL_PRIVATE_STORAGE_DIR", "LOCAL_GOOGLE_SHEET_ID", "LOCAL_GOOGLE_SHEET_NAME", "LOCAL_GOOGLE_SERVICE_ACCOUNT_EMAIL", "LOCAL_GOOGLE_PRIVATE_KEY", "ALLOW_LOCAL_GOOGLE_WRITES"]) delete process.env[name];
    const config = readConfig();
    assert.equal(config.privateStorageConfigured, false);
    assert.equal(config.google.sheetId, "");
    assert.equal(config.google.email, "");
    assert.equal(config.google.privateKey, "");
    assert.equal(config.google.localAccessDisabled, true);
    const sheets = new GoogleSheetsRepository(config.google, async () => { requests++; return Response.json({}); }, async () => "must-not-authenticate");
    await assert.rejects(() => sheets.checkAccess(), new RegExp(LOCAL_GOOGLE_DISABLED_ERROR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(requests, 0);
  } finally { restore(); }
});

test("localhost uses only explicitly approved local storage and Google targets", () => {
  const restore = preserveEnvironment();
  try {
    Object.assign(process.env, {
      APP_URL: "http://localhost:3000", PRIVATE_STORAGE_DIR: "/production-only", GOOGLE_SHEET_ID: "production-sheet",
      LOCAL_PRIVATE_STORAGE_DIR: "/tmp/phase3-hotfix-private", ALLOW_LOCAL_GOOGLE_WRITES: "true",
      LOCAL_GOOGLE_SHEET_ID: "development-sheet", LOCAL_GOOGLE_SHEET_NAME: "Development Registrations",
      LOCAL_GOOGLE_SERVICE_ACCOUNT_EMAIL: "local@example.test", LOCAL_GOOGLE_PRIVATE_KEY: "local-key",
    });
    const config = readConfig();
    assert.equal(config.privateStorageDir, "/tmp/phase3-hotfix-private");
    assert.equal(config.privateStorageConfigured, true);
    assert.equal(config.google.sheetId, "development-sheet");
    assert.equal(config.google.sheetName, "Development Registrations");
    assert.equal(config.google.email, "local@example.test");
    assert.equal(config.google.localAccessDisabled, false);
  } finally { restore(); }
});

test("localhost rejects relative local private storage", () => {
  const restore = preserveEnvironment();
  try {
    Object.assign(process.env, { APP_URL: "http://localhost:3000", LOCAL_PRIVATE_STORAGE_DIR: ".private" });
    assert.throws(() => readConfig(), /LOCAL_PRIVATE_STORAGE_DIR must be an absolute path/i);
  } finally { restore(); }
});
