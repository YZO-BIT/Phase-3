import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test, type TestContext } from "node:test";
import { normalizeGooglePrivateKey, readConfig, type ServerConfig } from "../lib/server/config";
import { BaseController, GoogleSheetsError } from "../lib/server/errors";
import { GoogleSheetsRepository, LEGACY_SHEET_COLUMNS, SHEET_COLUMNS } from "../lib/server/googleSheets";

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const google: ServerConfig["google"] = { sheetId: "test-spreadsheet", sheetName: "Registrations", email: "test@example.test", privateKey };

class LogBoundary extends BaseController {
  run(operation: () => Promise<unknown>) {
    return this.execute("registration.submit", async () => { await operation(); return this.json({ ok: true }); });
  }
}

async function captureFailure(t: TestContext, operation: () => Promise<unknown>) {
  const entries: Record<string, any>[] = [];
  t.mock.method(console, "error", (line: string) => entries.push(JSON.parse(line)));
  const response = await new LogBoundary().run(operation);
  assert.equal(response.status, 503);
  assert.deepEqual(Object.keys(await response.json()).sort(), ["error", "requestId"]);
  assert.equal(entries.length, 1);
  return { log: entries[0], serialized: JSON.stringify(entries) };
}

function headerFixture(header: string[]) {
  const writes: { range: string; values: string[][] }[] = [];
  const transport: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === "/v4/spreadsheets/test-spreadsheet") return Response.json({ spreadsheetId: google.sheetId, sheets: [{ properties: { title: google.sheetName } }] });
    const range = decodeURIComponent(url.pathname.split("/values/")[1] || "");
    if (init?.method !== "GET") {
      writes.push({ range, values: JSON.parse(String(init?.body)).values });
      return Response.json({ updatedRows: 1 });
    }
    const match = range.match(/!A1:(AJ|AK)(?:1|10001)$/);
    assert.ok(match, `Unexpected header range: ${range}`);
    // A real Sheets response cannot include cells outside the requested range.
    return Response.json({ values: [header.slice(0, match[1] === "AJ" ? 36 : 37)] });
  };
  return { sheets: new GoogleSheetsRepository(google, transport, async () => "test-access-token"), writes };
}

test("private-key normalization accepts actual newlines, escaped newlines, double-escaped newlines, and quoted values", () => {
  const variants = [
    privateKey,
    privateKey.replace(/\n/g, "\\n"),
    privateKey.replace(/\n/g, "\\\\n"),
    JSON.stringify(privateKey),
    `'${privateKey.replace(/\n/g, "\\n")}'`,
    privateKey.replace(/\n/g, "\r\n"),
  ];
  for (const raw of variants) {
    const normalized = normalizeGooglePrivateKey(raw);
    assert.equal(normalized.value.trim(), privateKey.trim());
    assert.equal(normalized.diagnostics.hasBeginMarker, true);
    assert.equal(normalized.diagnostics.hasEndMarker, true);
    assert.equal(normalized.diagnostics.normalized, true);
    assert.equal(normalized.diagnostics.parseable, true);
  }
});

test("readConfig strips accidental quotes from Google identifiers and records safe key diagnostics", () => {
  const names = ["APP_URL", "PRIVATE_STORAGE_DIR", "GOOGLE_SHEET_ID", "GOOGLE_SHEET_NAME", "GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY"];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    process.env.APP_URL = "http://localhost:3000";
    process.env.PRIVATE_STORAGE_DIR = ".private";
    process.env.GOOGLE_SHEET_ID = '"test-spreadsheet"';
    process.env.GOOGLE_SHEET_NAME = "'Registrations'";
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = '"test@example.test"';
    process.env.GOOGLE_PRIVATE_KEY = JSON.stringify(privateKey);
    const config = readConfig();
    assert.equal(config.google.sheetId, "test-spreadsheet");
    assert.equal(config.google.sheetName, "Registrations");
    assert.equal(config.google.email, "test@example.test");
    assert.equal(config.google.privateKeyDiagnostics?.hadSurroundingQuotes, true);
    assert.equal(config.google.privateKeyDiagnostics?.hadEscapedNewlines, true);
    assert.equal(config.google.privateKeyDiagnostics?.parseable, true);
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test("Sheets API diagnostics preserve status, reason, message, auth state, and range without exposing credentials", async (t) => {
  const transport: typeof fetch = async () => Response.json({ error: { code: 403, status: "PERMISSION_DENIED", message: "The caller does not have permission", errors: [{ reason: "forbidden" }] } }, { status: 403 });
  const sheets = new GoogleSheetsRepository(google, transport, async () => "test-access-token");
  const { log, serialized } = await captureFailure(t, () => sheets.ensureHeaders());
  assert.equal(log.upstreamStatus, 403);
  assert.equal(log.googleSheets.phase, "sheet_read");
  assert.equal(log.googleSheets.method, "GET");
  assert.equal(log.googleSheets.spreadsheetId, google.sheetId);
  assert.equal(log.googleSheets.sheetName, google.sheetName);
   assert.equal(log.googleSheets.range, "'Registrations'!A1:AK1");
  assert.equal(log.googleSheets.authenticationSucceeded, true);
  assert.equal(log.googleSheets.apiStatus, 403);
  assert.equal(log.googleSheets.apiReason, "forbidden");
  assert.equal(log.googleSheets.apiMessage, "The caller does not have permission");
  assert.equal(serialized.includes("test-access-token"), false);
});

test("authentication diagnostics identify invalid_grant without logging access tokens, refresh tokens, or credentials", async (t) => {
  let requests = 0;
  const token = async () => {
    throw Object.assign(new Error("invalid_grant: Invalid JWT Signature."), {
      name: "GaxiosError",
      response: { status: 400, data: { error: "invalid_grant", error_description: "Invalid JWT Signature.", access_token: "auth-access-secret", refresh_token: "auth-refresh-secret" } },
      config: { headers: { authorization: "Bearer auth-access-secret" }, data: { assertion: "signed-jwt-secret", private_key: privateKey } },
    });
  };
  const sheets = new GoogleSheetsRepository(google, async () => { requests++; return Response.json({}); }, token);
  const { log, serialized } = await captureFailure(t, () => sheets.ensureHeaders());
  assert.equal(requests, 0);
  assert.equal(log.googleSheets.phase, "authentication");
  assert.equal(log.googleSheets.authenticationSucceeded, false);
  assert.equal(log.googleSheets.authenticationErrorType, "GaxiosError");
  assert.equal(log.googleSheets.apiStatus, 400);
  assert.equal(log.googleSheets.apiReason, "invalid_grant");
  assert.equal(log.googleSheets.apiMessage, "Invalid JWT Signature.");
  for (const secret of [privateKey, "auth-access-secret", "auth-refresh-secret", "signed-jwt-secret"]) assert.equal(serialized.includes(secret), false);
});

test("upstream messages cannot echo configured application or payment secrets", async (t) => {
  const names = ["SESSION_SECRET", "ADMIN_PASSWORD_HASH", "PAYMENT_UPI_ID", "PAYMENT_PAYEE_NAME"];
  const values = { SESSION_SECRET: "session-secret-value-123", ADMIN_PASSWORD_HASH: "scrypt:salt:password-hash-value", PAYMENT_UPI_ID: "private-upi@bank", PAYMENT_PAYEE_NAME: "Private Organizer" };
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    Object.assign(process.env, values);
    const token = "access-token-value-123";
    const message = `${Object.values(values).join(" ")} ${privateKey} Bearer ${token} refresh_token="refresh-token-value-123"`;
    const transport: typeof fetch = async () => Response.json({ error: { status: "INVALID_ARGUMENT", message } }, { status: 400 });
    const sheets = new GoogleSheetsRepository(google, transport, async () => token);
    const { serialized, log } = await captureFailure(t, () => sheets.ensureHeaders());
    for (const secret of [...Object.values(values), privateKey, token, "refresh-token-value-123"]) assert.equal(serialized.includes(secret), false);
    assert.match(log.googleSheets.apiMessage, /REDACTED/);
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test("current 37-column headers are accepted without rewriting the payment method column", async () => {
  const { sheets, writes } = headerFixture(SHEET_COLUMNS);
  await sheets.ensureHeaders();
  assert.deepEqual(writes, []);
});

test("invalid payment method headers are rejected without repairing or writing data", async (t) => {
  for (const operation of ["ensureHeaders", "checkAccess"] as const) {
    await t.test(operation, async () => {
      const { sheets, writes } = headerFixture([...LEGACY_SHEET_COLUMNS, "Unexpected Existing Column"]);
      await assert.rejects(() => sheets[operation](), /columns do not match/i);
      assert.deepEqual(writes, []);
    });
  }
});

test("legacy 36-column headers remain readable and append only the payment method header", async () => {
  const { sheets, writes } = headerFixture(LEGACY_SHEET_COLUMNS);
  const result = await sheets.checkAccess();
  assert.equal(result.headerMatches, true);
  assert.deepEqual(writes, []);
  await sheets.ensureHeaders();
  assert.deepEqual(writes, [{ range: "'Registrations'!AK1", values: [["Payment Method"]] }]);
});

test("read-only Google access check performs metadata and header reads without creating or repairing data", async (t) => {
  const requests: { method: string; path: string }[] = [];
  const transport: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    requests.push({ method: init?.method || "GET", path: url.pathname });
    assert.equal(init?.method, "GET");
    assert.equal(init?.body, undefined);
    if (url.pathname === "/v4/spreadsheets/test-spreadsheet") return Response.json({ spreadsheetId: google.sheetId, properties: { title: "Phase 3" }, sheets: [{ properties: { title: "Registrations" } }] });
    const range = decodeURIComponent(url.pathname.split("/values/")[1] || "");
    if (range.endsWith("A1:AK1")) return Response.json({ values: [SHEET_COLUMNS] });
    if (range.endsWith("A1:AK10001")) return Response.json({ values: [SHEET_COLUMNS] });
    throw new Error(`Unexpected diagnostic range: ${range}`);
  };
  const sheets = new GoogleSheetsRepository(google, transport, async () => "test-access-token");
  const result = await sheets.checkAccess();
  assert.equal(result.authenticationSucceeded, true);
  assert.equal(result.spreadsheetId, google.sheetId);
  assert.equal(result.spreadsheetTitle, "Phase 3");
  assert.equal(result.sheetName, "Registrations");
  assert.equal(result.headerMatches, true);
  assert.equal(result.registrationRowCount, 0);
  assert.deepEqual(requests.map(({ method }) => method), ["GET", "GET", "GET"]);
  assert.equal(requests.filter(({ method }) => method !== "GET").length, 0);
  assert.equal(requests[0].path, "/v4/spreadsheets/test-spreadsheet");
});

test("read-only access check reports a missing tab without attempting a write", async (t) => {
  let writes = 0;
  const transport: typeof fetch = async (input, init) => {
    if (init?.method !== "GET") writes++;
    return Response.json({ spreadsheetId: google.sheetId, sheets: [{ properties: { title: "Wrong Tab" } }] });
  };
  const sheets = new GoogleSheetsRepository(google, transport, async () => "test-access-token");
  const { log } = await captureFailure(t, () => sheets.checkAccess());
  assert.equal(log.googleSheets.phase, "spreadsheet_metadata");
  assert.equal(log.googleSheets.apiReason, "configured_tab_not_found");
  assert.equal(log.googleSheets.authenticationSucceeded, true);
  assert.equal(writes, 0);
});

test("append and update API failures identify the write phase and range", async (t) => {
  await t.test("append", async (t) => {
    const transport: typeof fetch = async (_input, init) => init?.method === "POST"
      ? Response.json({ error: { status: "INVALID_ARGUMENT", message: "Unable to parse range" } }, { status: 400 })
      : Response.json({ values: [] });
    const sheets = new GoogleSheetsRepository(google, transport, async () => "test-access-token");
    const { log } = await captureFailure(t, () => sheets.appendRegistrationToSheet(["PG-2026-1234567890ABCDEF", ...Array(35).fill("")]));
    assert.equal(log.googleSheets.phase, "append");
    assert.equal(log.googleSheets.method, "POST");
    assert.equal(log.googleSheets.range, "'Registrations'!A:AJ");
  });
  await t.test("update", async (t) => {
    const id = "PG-2026-1234567890ABCDEF";
    const transport: typeof fetch = async (_input, init) => init?.method === "POST"
      ? Response.json({ error: { status: "PERMISSION_DENIED", message: "Forbidden" } }, { status: 403 })
      : Response.json({ values: [["Registration ID"], [id]] });
    const sheets = new GoogleSheetsRepository(google, transport, async () => "test-access-token");
    const { log } = await captureFailure(t, () => sheets.updateRegistrationStatus(id, "REJECTED", "test", "admin@example.test", "2026-10-06", ""));
    assert.equal(log.googleSheets.phase, "update");
    assert.equal(log.googleSheets.method, "POST");
    assert.equal(log.googleSheets.range, "'Registrations'!AE2:AJ2");
  });
});

test("missing Google configuration logs only presence diagnostics", async (t) => {
  const sheets = new GoogleSheetsRepository({ ...google, privateKey: "" }, async () => { throw new Error("request should not run"); }, async () => { throw new Error("auth should not run"); });
  const { log } = await captureFailure(t, () => sheets.ensureHeaders());
  assert.equal(log.googleSheets.phase, "configuration");
  assert.equal(log.googleSheets.configuration.sheetIdConfigured, true);
  assert.equal(log.googleSheets.configuration.serviceAccountEmailConfigured, true);
  assert.equal(log.googleSheets.configuration.privateKeyConfigured, false);
});

test("transport failures preserve ambiguous append behavior while redacting bearer tokens", async () => {
  const token = "test-access-token";
  const transport: typeof fetch = async (_input, init) => {
    if (init?.method !== "POST") return Response.json({ values: [] });
    throw Object.assign(new TypeError(`fetch failed Bearer ${token}`), { code: "ECONNRESET" });
  };
  const sheets = new GoogleSheetsRepository(google, transport, async () => token);
  await assert.rejects(() => sheets.appendRegistrationToSheet(["PG-2026-1234567890ABCDEF", ...Array(35).fill("")]), (error: unknown) => {
    assert.ok(error instanceof GoogleSheetsError);
    assert.equal(error.ambiguous, true);
    assert.equal(error.diagnostic?.phase, "append");
    assert.equal(error.diagnostic?.authenticationSucceeded, true);
    assert.equal(error.diagnostic?.transportErrorType, "TypeError");
    assert.equal(error.diagnostic?.transportErrorCode, "ECONNRESET");
    assert.equal(JSON.stringify(error.diagnostic).includes(token), false);
    return true;
  });
});
