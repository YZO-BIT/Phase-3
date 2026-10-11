import "server-only";
import { JWT } from "google-auth-library";
import { z } from "zod";
import type { ServerConfig } from "./config";
import { GoogleSheetsError, HttpError, type GoogleSheetsDiagnostic, type GoogleSheetsPhase } from "./errors";

export const SHEET_COLUMNS = [
  "Registration ID", "Registration Date", "Event Name", "Event Date", "Event Time", "Team / Participant Name", "Registration Type", "Team Size",
  "Captain Name", "Captain Email", "Captain Phone", "College / University", "City",
  "Participant 1 Name", "Participant 1 Email", "Participant 1 Phone", "Participant 2 Name", "Participant 2 Email", "Participant 2 Phone",
  "Participant 3 Name", "Participant 3 Email", "Participant 3 Phone", "Participant 4 Name", "Participant 4 Email", "Participant 4 Phone",
  "Participant 5 Name", "Participant 5 Email", "Participant 5 Phone", "Payment Amount", "Payment Screenshot", "Payment Status",
  "Admin Remarks", "Verified By", "Verification Date", "PDF Status", "PDF Link", "Payment Method",
];
export const LEGACY_SHEET_COLUMNS = SHEET_COLUMNS.slice(0, -1);
export type SheetRow = { row: number; cells: string[] };
type RangeUpdate = { range: string; values: string[][] };
type RequestContext = { phase: GoogleSheetsPhase; range?: string; method?: string };
type ApiErrorDetails = { status?: number; reason?: string; message?: string };
type RecordValue = Record<string, unknown>;

const responseSchema = z.object({ values: z.array(z.array(z.union([z.string(), z.number(), z.boolean()]))).optional().default([]) });
const metadataSchema = z.object({
  spreadsheetId: z.string().optional(),
  properties: z.object({ title: z.string().optional() }).optional(),
  sheets: z.array(z.object({ properties: z.object({ title: z.string().optional(), sheetId: z.number().optional() }).optional() })).optional().default([]),
});

function record(value: unknown): RecordValue | undefined { return value && typeof value === "object" ? value as RecordValue : undefined; }
function numberValue(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : undefined; }
function safeLogText(value: unknown, extraSecret?: string) {
  if (value === undefined || value === null) return undefined;
  let text = typeof value === "string" ? value : JSON.stringify(value) || String(value);
  const configuredSecrets = [extraSecret, process.env.GOOGLE_PRIVATE_KEY, process.env.SESSION_SECRET, process.env.ADMIN_PASSWORD_HASH, process.env.PAYMENT_UPI_ID, process.env.PAYMENT_PAYEE_NAME].filter((secret): secret is string => typeof secret === "string" && secret.length >= 8);
  for (const secret of configuredSecrets) text = text.split(secret).join("[REDACTED]");
  text = text
    .replace(/-----BEGIN [\s\S]*?-----END [^-]+-----/g, "[REDACTED_PEM]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .replace(/(access[_ -]?token|refresh[_ -]?token|private[_ -]?key|client[_ -]?secret|authorization)\s*[:=]\s*["']?[^,\s}"']+/gi, "$1=[REDACTED]")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 500) || undefined;
}
function errorType(error: unknown) { return error instanceof Error ? error.name : typeof error; }
function errorCode(error: unknown) {
  const code = record(error)?.code;
  return typeof code === "string" || typeof code === "number" ? code : undefined;
}
function apiErrorDetails(error: unknown, extraSecret?: string): ApiErrorDetails {
  const root = record(error);
  const response = record(root?.response);
  const responseData = record(response?.data);
  const payload = responseData || root;
  const api = record(payload?.error) || payload || root;
  const nested = Array.isArray(api?.errors) ? record(api.errors[0]) : undefined;
  const status = numberValue(response?.status) ?? numberValue(root?.status) ?? numberValue(api?.code);
  const reason = safeLogText(nested?.reason ?? api?.status ?? api?.reason ?? payload?.error, extraSecret);
  const message = safeLogText(nested?.message ?? api?.message ?? payload?.error_description ?? payload?.message ?? root?.message ?? error, extraSecret);
  return { status, reason, message };
}
function parseResponseBody(body: string) {
  try { return JSON.parse(body.slice(0, 8192)) as unknown; } catch { return body.slice(0, 8192); }
}

export type GoogleAccessCheck = {
  spreadsheetId: string;
  spreadsheetTitle: string | null;
  sheetName: string;
  headerMatches: boolean;
  registrationRowCount: number;
  authenticationSucceeded: true;
};

export class GoogleSheetsRepository {
  private jwt: JWT;
  private base: string;
  constructor(private config: ServerConfig["google"], private transport: typeof fetch = fetch, private tokenOverride?: () => Promise<string>) {
    this.jwt = new JWT({ email: config.email, key: config.privateKey, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
    this.base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.sheetId)}`;
  }
  private range(cells: string) { return `'${this.config.sheetName.replace(/'/g, "''")}'!${cells}`; }
  private currentHeader(values: string[]) { return values.length === SHEET_COLUMNS.length && SHEET_COLUMNS.every((name, index) => values[index] === name); }
  private legacyHeader(values: string[]) { return values.length >= LEGACY_SHEET_COLUMNS.length && LEGACY_SHEET_COLUMNS.every((name, index) => values[index] === name) && !values[LEGACY_SHEET_COLUMNS.length]; }
  private validHeader(values: string[]) { return this.currentHeader(values) || this.legacyHeader(values); }
  private normalizeRow(row: string[]) { return Array.from({ length: SHEET_COLUMNS.length }, (_, index) => row[index] ?? (index === SHEET_COLUMNS.length - 1 ? "ONLINE" : "")); }
  private configurationDiagnostics() {
    const key = this.config.privateKeyDiagnostics ?? {
      hadLiteralNewlines: this.config.privateKey.includes("\n") || this.config.privateKey.includes("\r"),
      hadEscapedNewlines: false,
      hadSurroundingQuotes: false,
      hasBeginMarker: /-----BEGIN [^-]+-----/.test(this.config.privateKey),
      hasEndMarker: /-----END [^-]+-----/.test(this.config.privateKey),
      normalized: false,
      parseable: false,
    };
    return {
      sheetIdConfigured: Boolean(this.config.sheetId),
      serviceAccountEmailConfigured: Boolean(this.config.email),
      privateKeyConfigured: Boolean(this.config.privateKey),
      privateKeyHasBeginMarker: key.hasBeginMarker,
      privateKeyHasEndMarker: key.hasEndMarker,
      privateKeyHadLiteralNewlines: key.hadLiteralNewlines,
      privateKeyHadEscapedNewlines: key.hadEscapedNewlines,
      privateKeyHadSurroundingQuotes: key.hadSurroundingQuotes,
      privateKeyNormalized: key.normalized,
      privateKeyParseable: key.parseable,
    };
  }
  getSafeConfigurationDiagnostics() { return this.configurationDiagnostics(); }
  private diagnostic(context: RequestContext, extra: Partial<GoogleSheetsDiagnostic> = {}): GoogleSheetsDiagnostic {
    return {
      phase: context.phase,
      method: context.method,
      spreadsheetId: this.config.sheetId || undefined,
      sheetName: this.config.sheetName || undefined,
      range: context.range,
      configuration: this.configurationDiagnostics(),
      authenticationSucceeded: false,
      ...extra,
    };
  }
  private async request(path: string, method = "GET", body?: unknown, context: RequestContext = { phase: "sheet_read" }) {
    const requestContext = { ...context, method };
    const baseDiagnostic = this.diagnostic(requestContext);
    if (!this.config.sheetId || !this.config.email || !this.config.privateKey) {
      throw new HttpError(503, "Google Sheets registration storage is not configured. Contact the organizer.", { ...baseDiagnostic, phase: "configuration", apiReason: "missing_configuration", apiMessage: "One or more Google Sheets variables are missing." });
    }
    let token: string | null | undefined;
    try {
      token = this.tokenOverride ? await this.tokenOverride() : (await this.jwt.getAccessToken()).token;
      if (!token) throw new Error("Google authentication returned no access token.");
    } catch (error) {
      const details = apiErrorDetails(error, this.config.privateKey);
      throw new GoogleSheetsError(false, details.status, {
        ...baseDiagnostic,
        phase: "authentication",
        authenticationSucceeded: false,
        apiStatus: details.status,
        apiReason: details.reason || "authentication_failed",
        apiMessage: details.message,
        authenticationErrorType: errorType(error),
        transportErrorCode: errorCode(error),
      });
    }
    let response: Response;
    try {
      response = await this.transport(`${this.base}${path}`, { method, cache: "no-store", signal: AbortSignal.timeout(12_000), headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (error) {
      const details = apiErrorDetails(error, this.config.privateKey);
      throw new GoogleSheetsError(method !== "GET", details.status, {
        ...baseDiagnostic,
        authenticationSucceeded: true,
        apiStatus: details.status,
        apiReason: details.reason || "transport_failed",
        apiMessage: details.message,
        transportErrorType: errorType(error),
        transportErrorCode: errorCode(error),
      });
    }
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      const details = apiErrorDetails(parseResponseBody(bodyText), this.config.privateKey);
      throw new GoogleSheetsError(method !== "GET" && response.status >= 500, response.status, {
        ...baseDiagnostic,
        authenticationSucceeded: true,
        apiStatus: response.status,
        apiReason: details.reason || "google_api_request_failed",
        apiMessage: details.message,
      });
    }
    try { return await response.json(); }
    catch (error) {
      const details = apiErrorDetails(error, this.config.privateKey);
      throw new GoogleSheetsError(method !== "GET", response.status, {
        ...baseDiagnostic,
        phase: "response_validation",
        authenticationSucceeded: true,
        apiReason: "invalid_json_response",
        apiMessage: details.message || "Google returned a response that was not valid JSON.",
      });
    }
  }
  private async values(cells: string) {
    const range = this.range(cells);
    const result = responseSchema.safeParse(await this.request(`/values/${encodeURIComponent(range)}`, "GET", undefined, { phase: "sheet_read", range }));
    if (!result.success) throw new GoogleSheetsError(false, undefined, this.diagnostic({ phase: "response_validation", range }, { authenticationSucceeded: true, apiReason: "invalid_values_response", apiMessage: "Google returned an invalid values response." }));
    return result.data.values.map((row) => row.map(String));
  }
  private async spreadsheetMetadata() {
    const result = metadataSchema.safeParse(await this.request("?fields=spreadsheetId,properties(title),sheets(properties(title))", "GET", undefined, { phase: "spreadsheet_metadata" }));
    if (!result.success) throw new GoogleSheetsError(false, undefined, this.diagnostic({ phase: "response_validation" }, { authenticationSucceeded: true, apiReason: "invalid_metadata_response", apiMessage: "Google returned an invalid spreadsheet metadata response." }));
    return result.data;
  }
  async checkAccess(): Promise<GoogleAccessCheck> {
    const metadata = await this.spreadsheetMetadata();
    const sheet = metadata.sheets.find((item) => item.properties?.title === this.config.sheetName);
    if (!sheet) throw new HttpError(503, "The configured Google Sheets tab was not found. Contact the organizer.", this.diagnostic({ phase: "spreadsheet_metadata" }, { authenticationSucceeded: true, apiReason: "configured_tab_not_found", apiMessage: "The configured tab name was not returned by spreadsheet metadata." }));
    const headerRange = this.range("A1:AK1");
    const [current = []] = await this.values("A1:AK1");
    const headerMatches = this.validHeader(current);
    if (!headerMatches) throw new HttpError(503, "The Registrations tab columns do not match the required schema. Contact the organizer.", this.diagnostic({ phase: "response_validation", range: headerRange }, { authenticationSucceeded: true, apiReason: "header_schema_mismatch", apiMessage: "The first row does not match the current 37-column or compatible legacy schema." }));
    const rows = await this.listRegistrations("A1:AK10001");
    return { spreadsheetId: metadata.spreadsheetId || this.config.sheetId, spreadsheetTitle: metadata.properties?.title || null, sheetName: this.config.sheetName, headerMatches, registrationRowCount: rows.length, authenticationSucceeded: true };
  }
  async ensureHeaders() {
    const headerRange = this.range("A1:AK1");
    const [current = []] = await this.values("A1:AK1");
    if (!current.length) await this.request(`/values/${encodeURIComponent(this.range("A1:AK1"))}?valueInputOption=RAW`, "PUT", { values: [SHEET_COLUMNS] }, { phase: "header_write", range: this.range("A1:AK1") });
    else if (this.legacyHeader(current)) await this.request(`/values/${encodeURIComponent(this.range("AK1"))}?valueInputOption=RAW`, "PUT", { values: [[SHEET_COLUMNS.at(-1)]] }, { phase: "header_write", range: this.range("AK1") });
    else if (!this.currentHeader(current) && !this.legacyHeader(current)) throw new HttpError(503, "The Registrations tab columns do not match the required schema. Contact the organizer.", this.diagnostic({ phase: "response_validation", range: headerRange }, { authenticationSucceeded: true, apiReason: "header_schema_mismatch", apiMessage: "The first row does not match the required registration schema." }));
  }
  async listRegistrations(cells = "A1:AK10001"): Promise<SheetRow[]> {
    const values = await this.values(cells);
    if (!values.length) return [];
    if (!this.validHeader(values[0])) throw new HttpError(503, "The registration sheet columns are invalid. Contact the organizer.", this.diagnostic({ phase: "response_validation", range: this.range(cells) }, { authenticationSucceeded: true, apiReason: "header_schema_mismatch", apiMessage: "The first row does not match the required registration schema." }));
    const rows = values.slice(1).flatMap((row, index) => row[0] ? [{ row: index + 2, cells: this.normalizeRow(row) }] : []);
    if (new Set(rows.map((row) => row.cells[0])).size !== rows.length) throw new HttpError(503, "Duplicate registration identifiers were found in the sheet. Contact the organizer.");
    return rows;
  }
  async findRegistrationRow(id: string): Promise<number | null> {
    const values = await this.values("A:A");
    const matches = values.flatMap((row, index) => row[0] === id ? [index + 1] : []);
    if (matches.length > 1) throw new HttpError(503, "Duplicate registration identifiers were found in the sheet. Contact the organizer.");
    return matches[0] ?? null;
  }
  async getRegistrationFromSheet(id: string): Promise<SheetRow | null> {
    const row = await this.findRegistrationRow(id);
    if (!row) return null;
    const rows = await this.listRegistrations();
    const registration = rows.find((candidate) => candidate.row === row);
    if (!registration || registration.cells[0] !== id) throw new GoogleSheetsError(false, undefined, this.diagnostic({ phase: "response_validation", range: this.range(`A${row}:AK${row}`) }, { authenticationSucceeded: true, apiReason: "registration_id_mismatch", apiMessage: "The returned row did not contain the requested registration ID." }));
    return registration;
  }
  async appendRegistrationToSheet(cells: string[]) {
    if (cells.length !== LEGACY_SHEET_COLUMNS.length && cells.length !== SHEET_COLUMNS.length) throw new Error("Invalid sheet row width");
    if (await this.findRegistrationRow(cells[0])) return false;
    const row = cells.length === LEGACY_SHEET_COLUMNS.length ? [...cells, "ONLINE"] : cells;
    const range = this.range(cells.length === LEGACY_SHEET_COLUMNS.length ? "A:AJ" : "A:AK");
    await this.request(`/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, "POST", { values: [row] }, { phase: "append", range });
    return true;
  }
  updateVerificationDetails(row: number, remarks: string, by: string, at: string): RangeUpdate { return { range: this.range(`AF${row}:AH${row}`), values: [[remarks, by, at]] }; }
  updatePdfDetails(row: number, status: string, link: string): RangeUpdate { return { range: this.range(`AI${row}:AJ${row}`), values: [[status, link]] }; }
  async updateRegistrationStatus(id: string, status: "APPROVED" | "REJECTED", remarks: string, by: string, at: string, pdfLink: string) {
    const row = await this.findRegistrationRow(id);
    if (!row) throw new HttpError(404, "Registration not found.");
    const range = this.range(`AE${row}:AJ${row}`);
    await this.request("/values:batchUpdate", "POST", { valueInputOption: "RAW", data: [
      { range: this.range(`AE${row}`), values: [[status]] },
      this.updateVerificationDetails(row, remarks, by, at),
      this.updatePdfDetails(row, status === "APPROVED" ? "READY" : "NOT_READY", status === "APPROVED" ? pdfLink : ""),
    ] }, { phase: "update", range });
  }
}
