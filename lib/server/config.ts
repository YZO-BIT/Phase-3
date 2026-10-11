import "server-only";
import { createPrivateKey } from "node:crypto";
import { resolve, sep } from "node:path";
import { HttpError } from "./errors";

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
  appUrl: string; sessionSecret: string; privateStorageDir: string; trustProxy: boolean;
  google: { sheetId: string; sheetName: string; email: string; privateKey: string; privateKeyDiagnostics?: GooglePrivateKeyDiagnostics };
  admin: { email: string; passwordHash: string };
  payment: { upiId: string; payeeName: string };
};

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
  const privateStorageDir = resolve(/* turbopackIgnore: true */ process.env.PRIVATE_STORAGE_DIR || ".private");
  const publicDir = resolve("public");
  if (privateStorageDir === publicDir || privateStorageDir.startsWith(publicDir + sep)) throw new HttpError(503, "Private storage must be outside the public assets directory.");
  const privateKey = normalizeGooglePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
  return {
    appUrl: origin.origin, sessionSecret: process.env.SESSION_SECRET || "", privateStorageDir, trustProxy: process.env.TRUST_PROXY === "true",
    google: { sheetId: envValue(process.env.GOOGLE_SHEET_ID), sheetName: envValue(process.env.GOOGLE_SHEET_NAME) || "Registrations", email: envValue(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL), privateKey: privateKey.value, privateKeyDiagnostics: privateKey.diagnostics },
    admin: { email: (process.env.ADMIN_EMAIL || "").toLowerCase(), passwordHash: process.env.ADMIN_PASSWORD_HASH || "" },
    payment: { upiId: process.env.PAYMENT_UPI_ID || "", payeeName: process.env.PAYMENT_PAYEE_NAME || "" },
  };
}
export function assertSessionConfigured(config: ServerConfig) {
  if (config.sessionSecret.length < 32) throw new HttpError(503, "Secure sessions are not configured. Please contact the organizer.");
}
export function assertPaymentConfigured(config: ServerConfig) {
  if (!/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}$/.test(config.payment.upiId) || !config.payment.payeeName.trim()) throw new HttpError(503, "Payment instructions are not configured. Please contact the organizer before paying.");
}
