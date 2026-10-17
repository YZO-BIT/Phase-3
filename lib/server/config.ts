import "server-only";
import { createPrivateKey } from "node:crypto";
import { isAbsolute, resolve, sep } from "node:path";
import { HttpError, PERSISTENT_STORAGE_ERROR } from "./errors";

export type GooglePrivateKeyDiagnostics = {
  hadLiteralNewlines: boolean;
  hadEscapedNewlines: boolean;
  hadSurroundingQuotes: boolean;
  hasBeginMarker: boolean;
  hasEndMarker: boolean;
  normalized: boolean;
  parseable: boolean;
};
export type ServerConfig = {
  appUrl: string; sessionSecret: string; privateStorageDir: string; privateStorageConfigured: boolean; trustProxy: boolean;
  google: { sheetId: string; sheetName: string; email: string; privateKey: string; privateKeyDiagnostics?: GooglePrivateKeyDiagnostics; localAccessDisabled?: boolean };
  admin: { email: string; passwordHash: string };
  payment: { upiId: string; payeeName: string };
};

function isKnownEphemeralRuntime() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.FUNCTIONS_WORKER_RUNTIME || process.env.NETLIFY);
}

function isLocalOrigin(origin: URL) {
  return origin.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
}

function stripSurroundingQuotes(value: string) {
  return value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) ? value.slice(1, -1).trim() : value;
}

function envValue(value: string | undefined) { return stripSurroundingQuotes((value || "").trim()); }

export function normalizeGooglePrivateKey(raw: string | undefined) {
  const original = raw || "";
  const trimmed = original.trim();
  const hadSurroundingQuotes = trimmed.length >= 2 && ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'")));
  const unquoted = stripSurroundingQuotes(trimmed);
  const hadLiteralNewlines = unquoted.includes("\n") || unquoted.includes("\r");
  const hadEscapedNewlines = /\\+n/.test(unquoted) || /\\+r/.test(unquoted);
  const value = unquoted
    .replace(/\\+r\\+n/g, "\n")
    .replace(/\\+n/g, "\n")
    .replace(/\\+r/g, "\r")
    .replace(/\r\n?/g, "\n")
    .trim();
  const hasBeginMarker = /-----BEGIN [^-]+-----/.test(value);
  const hasEndMarker = /-----END [^-]+-----/.test(value);
  let parseable = false;
  if (hasBeginMarker && hasEndMarker) {
    try { createPrivateKey({ key: value, format: "pem" }); parseable = true; } catch { /* Keep the diagnostic boolean false without exposing key material. */ }
  }
  return {
    value,
    diagnostics: { hadLiteralNewlines, hadEscapedNewlines, hadSurroundingQuotes, hasBeginMarker, hasEndMarker, normalized: parseable, parseable },
  };
}

export function readConfig(): ServerConfig {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  let origin: URL;
  try { origin = new URL(appUrl); } catch { throw new HttpError(503, "The server origin is not configured correctly."); }
  if (!/^https?:$/.test(origin.protocol) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash || (origin.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname))) throw new HttpError(503, "APP_URL must be the HTTPS website origin, or localhost for development.");
  const localDevelopment = isLocalOrigin(origin);
  const configuredStorage = envValue(localDevelopment ? process.env.LOCAL_PRIVATE_STORAGE_DIR : process.env.PRIVATE_STORAGE_DIR);
  if (localDevelopment && configuredStorage && !isAbsolute(configuredStorage)) throw new HttpError(503, "LOCAL_PRIVATE_STORAGE_DIR must be an absolute path on local development storage.");
  const privateStorageDir = resolve(/* turbopackIgnore: true */ configuredStorage || ".private");
  const publicDir = resolve("public");
  if (privateStorageDir === publicDir || privateStorageDir.startsWith(publicDir + sep)) throw new HttpError(503, "Private storage must be outside the public assets directory.");
  const allowLocalGoogleWrites = envValue(process.env.ALLOW_LOCAL_GOOGLE_WRITES).toLowerCase() === "true";
  const googleSheetId = localDevelopment ? allowLocalGoogleWrites ? envValue(process.env.LOCAL_GOOGLE_SHEET_ID) : "" : envValue(process.env.GOOGLE_SHEET_ID);
  const googleSheetName = localDevelopment ? allowLocalGoogleWrites ? envValue(process.env.LOCAL_GOOGLE_SHEET_NAME) || "Registrations" : "Registrations" : envValue(process.env.GOOGLE_SHEET_NAME) || "Registrations";
  const googleEmail = localDevelopment ? allowLocalGoogleWrites ? envValue(process.env.LOCAL_GOOGLE_SERVICE_ACCOUNT_EMAIL) : "" : envValue(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  const privateKey = normalizeGooglePrivateKey(localDevelopment && allowLocalGoogleWrites ? process.env.LOCAL_GOOGLE_PRIVATE_KEY : localDevelopment ? undefined : process.env.GOOGLE_PRIVATE_KEY);
  return {
    appUrl: origin.origin, sessionSecret: process.env.SESSION_SECRET || "", privateStorageDir, privateStorageConfigured: Boolean(configuredStorage), trustProxy: process.env.TRUST_PROXY === "true",
    google: { sheetId: googleSheetId, sheetName: googleSheetName, email: googleEmail, privateKey: privateKey.value, privateKeyDiagnostics: privateKey.diagnostics, localAccessDisabled: localDevelopment && !allowLocalGoogleWrites },
    admin: { email: (process.env.ADMIN_EMAIL || "").toLowerCase(), passwordHash: process.env.ADMIN_PASSWORD_HASH || "" },
    payment: { upiId: process.env.PAYMENT_UPI_ID || "", payeeName: process.env.PAYMENT_PAYEE_NAME || "" },
  };
}
export function assertPersistentStorageConfigured(config: ServerConfig) {
  if (!config.privateStorageConfigured || (process.env.NODE_ENV === "production" && isKnownEphemeralRuntime())) throw new HttpError(503, PERSISTENT_STORAGE_ERROR);
}
export function assertSessionConfigured(config: ServerConfig) {
  if (config.sessionSecret.length < 32) throw new HttpError(503, "Secure sessions are not configured. Please contact the organizer.");
}
export function assertPaymentConfigured(config: ServerConfig) {
  if (!/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}$/.test(config.payment.upiId) || !config.payment.payeeName.trim()) throw new HttpError(503, "Payment instructions are not configured. Please contact the organizer before paying.");
}
