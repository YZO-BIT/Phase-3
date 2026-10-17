import "server-only";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";

export type GoogleSheetsPhase = "configuration" | "authentication" | "spreadsheet_metadata" | "sheet_read" | "grid_expansion" | "header_write" | "append" | "update" | "response_validation";
export type GoogleSheetsDiagnostic = {
  phase: GoogleSheetsPhase;
  method?: string;
  spreadsheetId?: string;
  sheetName?: string;
  range?: string;
  configuration: {
    sheetIdConfigured: boolean;
    serviceAccountEmailConfigured: boolean;
    privateKeyConfigured: boolean;
    privateKeyHasBeginMarker: boolean;
    privateKeyHasEndMarker: boolean;
    privateKeyHadLiteralNewlines: boolean;
    privateKeyHadEscapedNewlines: boolean;
    privateKeyHadSurroundingQuotes: boolean;
    privateKeyNormalized: boolean;
    privateKeyParseable: boolean;
  };
  authenticationSucceeded: boolean;
  apiStatus?: number;
  apiReason?: string;
  apiMessage?: string;
  authenticationErrorType?: string;
  transportErrorType?: string;
  transportErrorCode?: string | number;
};

export class HttpError extends Error {
  constructor(public status: number, message: string, public diagnostic?: GoogleSheetsDiagnostic) { super(message); this.name = "HttpError"; }
}
export class GoogleSheetsError extends HttpError {
  constructor(public ambiguous: boolean, public upstreamStatus?: number, diagnostic?: GoogleSheetsDiagnostic) {
    super(503, "Google Sheets is unavailable. Registration or verification could not be confirmed. Please retry with the same details.", diagnostic);
    this.name = "GoogleSheetsError";
  }
}
export const PERSISTENT_STORAGE_ERROR = "Persistent private registration storage is unavailable. Registration could not be completed. Please contact the organizer.";
export const MISSING_DOSSIER_ERROR = "Registration is listed in Google Sheets, but its private registration dossier is unavailable. No private data was reconstructed; follow the organizer recovery procedure.";
export const LOCAL_GOOGLE_DISABLED_ERROR = "Local Google Sheets access is disabled. Configure a dedicated LOCAL_GOOGLE_SHEET_ID and set ALLOW_LOCAL_GOOGLE_WRITES=true, or use the isolated test fixtures.";
export const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Vary": "Cookie" };

export class BaseController {
  protected async execute(scope: string, operation: () => Promise<Response>): Promise<Response> {
    try { return await operation(); }
    catch (error) {
      const requestId = randomUUID();
      if (error instanceof ZodError) return Response.json({ error: error.issues[0]?.message ?? "Invalid registration data", requestId }, { status: 400, headers: privateHeaders });
      const status = error instanceof HttpError ? error.status : 500;
      if (status >= 500) console.error(JSON.stringify({ scope, requestId, errorType: error instanceof Error ? error.name : "UnknownError", upstreamStatus: error instanceof GoogleSheetsError ? error.upstreamStatus : undefined, googleSheets: error instanceof HttpError ? error.diagnostic : undefined }));
      return Response.json({ error: error instanceof HttpError ? error.message : "An internal error occurred. Please retry or contact the organizer.", requestId }, { status, headers: privateHeaders });
    }
  }
  protected json(value: unknown, status = 200, headers: HeadersInit = {}) {
    return Response.json(value, { status, headers: { ...privateHeaders, ...headers } });
  }
}
