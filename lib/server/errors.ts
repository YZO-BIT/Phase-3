import "server-only";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "HttpError"; }
}
export class GoogleSheetsError extends HttpError {
  constructor(public ambiguous: boolean, public upstreamStatus?: number) {
    super(503, "Google Sheets is unavailable. Registration or verification could not be confirmed. Please retry with the same details.");
    this.name = "GoogleSheetsError";
  }
}
export const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Vary": "Cookie" };

export class BaseController {
  protected async execute(scope: string, operation: () => Promise<Response>): Promise<Response> {
    try { return await operation(); }
    catch (error) {
      const requestId = randomUUID();
      if (error instanceof ZodError) return Response.json({ error: error.issues[0]?.message ?? "Invalid registration data", requestId }, { status: 400, headers: privateHeaders });
      const status = error instanceof HttpError ? error.status : 500;
      if (status >= 500) console.error(JSON.stringify({ scope, requestId, errorType: error instanceof Error ? error.name : "UnknownError", upstreamStatus: error instanceof GoogleSheetsError ? error.upstreamStatus : undefined }));
      return Response.json({ error: error instanceof HttpError ? error.message : "An internal error occurred. Please retry or contact the organizer.", requestId }, { status, headers: privateHeaders });
    }
  }
  protected json(value: unknown, status = 200, headers: HeadersInit = {}) {
    return Response.json(value, { status, headers: { ...privateHeaders, ...headers } });
  }
}
