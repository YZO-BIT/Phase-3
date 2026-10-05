import "server-only";
import { JWT } from "google-auth-library";
import { z } from "zod";
import type { ServerConfig } from "./config";
import { GoogleSheetsError, HttpError } from "./errors";

export const SHEET_COLUMNS = [
  "Registration ID", "Registration Date", "Event Name", "Event Date", "Event Time", "Team / Participant Name", "Registration Type", "Team Size",
  "Captain Name", "Captain Email", "Captain Phone", "College / University", "City",
  "Participant 1 Name", "Participant 1 Email", "Participant 1 Phone", "Participant 2 Name", "Participant 2 Email", "Participant 2 Phone",
  "Participant 3 Name", "Participant 3 Email", "Participant 3 Phone", "Participant 4 Name", "Participant 4 Email", "Participant 4 Phone",
  "Participant 5 Name", "Participant 5 Email", "Participant 5 Phone", "Payment Amount", "Payment Screenshot", "Payment Status",
  "Admin Remarks", "Verified By", "Verification Date", "PDF Status", "PDF Link",
];
export type SheetRow = { row: number; cells: string[] };
type RangeUpdate = { range: string; values: string[][] };
const responseSchema = z.object({ values: z.array(z.array(z.union([z.string(), z.number(), z.boolean()]))).optional().default([]) });

export class GoogleSheetsRepository {
  private jwt: JWT;
  private base: string;
  constructor(private config: ServerConfig["google"], private transport: typeof fetch = fetch, private tokenOverride?: () => Promise<string>) {
    this.jwt = new JWT({ email: config.email, key: config.privateKey, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
    this.base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.sheetId)}`;
  }
  private range(cells: string) { return `'${this.config.sheetName.replace(/'/g, "''")}'!${cells}`; }
  private async request(path: string, method = "GET", body?: unknown) {
    if (!this.config.sheetId || !this.config.email || !this.config.privateKey) throw new HttpError(503, "Google Sheets registration storage is not configured. Contact the organizer.");
    try {
      const token = this.tokenOverride ? await this.tokenOverride() : (await this.jwt.getAccessToken()).token;
      if (!token) throw new GoogleSheetsError(false);
      const response = await this.transport(`${this.base}${path}`, { method, cache: "no-store", signal: AbortSignal.timeout(12_000), headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (!response.ok) throw new GoogleSheetsError(response.status >= 500, response.status);
      return await response.json();
    } catch (error) { if (error instanceof HttpError) throw error; throw new GoogleSheetsError(method !== "GET"); }
  }
  private async values(cells: string) {
    const result = responseSchema.safeParse(await this.request(`/values/${encodeURIComponent(this.range(cells))}`));
    if (!result.success) throw new GoogleSheetsError(false);
    return result.data.values.map((row) => row.map(String));
  }
  async ensureHeaders() {
    const [current = []] = await this.values("A1:AJ1");
    if (!current.length) await this.request(`/values/${encodeURIComponent(this.range("A1:AJ1"))}?valueInputOption=RAW`, "PUT", { values: [SHEET_COLUMNS] });
    else if (SHEET_COLUMNS.some((name, index) => name !== current[index]) || current.length !== 36) throw new HttpError(503, "The Registrations tab columns do not match the required schema. Contact the organizer.");
  }
  async listRegistrations(): Promise<SheetRow[]> {
    const values = await this.values("A1:AJ10001");
    if (!values.length) return [];
    if (SHEET_COLUMNS.some((name, index) => values[0][index] !== name)) throw new HttpError(503, "The registration sheet columns are invalid. Contact the organizer.");
    const rows = values.slice(1).flatMap((row, index) => row[0] ? [{ row: index + 2, cells: Array.from({ length: 36 }, (_, i) => row[i] ?? "") }] : []);
    if (new Set(rows.map((row) => row.cells[0])).size !== rows.length) throw new HttpError(503, "Duplicate registration identifiers were found in the sheet. Contact the organizer.");
    return rows;
  }
  async findRegistrationRow(id: string): Promise<number | null> {
    const rows = await this.values("A:A");
    const matches = rows.flatMap((row, index) => row[0] === id ? [index + 1] : []);
    if (matches.length > 1) throw new HttpError(503, "Duplicate registration identifiers were found in the sheet. Contact the organizer.");
    return matches[0] ?? null;
  }
  async getRegistrationFromSheet(id: string): Promise<SheetRow | null> {
    const row = await this.findRegistrationRow(id);
    if (!row) return null;
    const [cells = []] = await this.values(`A${row}:AJ${row}`);
    if (cells[0] !== id) throw new GoogleSheetsError(false);
    return { row, cells: Array.from({ length: 36 }, (_, index) => cells[index] ?? "") };
  }
  async appendRegistrationToSheet(cells: string[]) {
    if (cells.length !== 36) throw new Error("Invalid sheet row width");
    if (await this.findRegistrationRow(cells[0])) return false;
    await this.request(`/values/${encodeURIComponent(this.range("A:AJ"))}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, "POST", { values: [cells] });
    return true;
  }
  updateVerificationDetails(row: number, remarks: string, by: string, at: string): RangeUpdate { return { range: this.range(`AF${row}:AH${row}`), values: [[remarks, by, at]] }; }
  updatePdfDetails(row: number, status: string, link: string): RangeUpdate { return { range: this.range(`AI${row}:AJ${row}`), values: [[status, link]] }; }
  async updateRegistrationStatus(id: string, status: "APPROVED" | "REJECTED", remarks: string, by: string, at: string, pdfLink: string) {
    const row = await this.findRegistrationRow(id);
    if (!row) throw new HttpError(404, "Registration not found.");
    await this.request("/values:batchUpdate", "POST", { valueInputOption: "RAW", data: [
      { range: this.range(`AE${row}`), values: [[status]] },
      this.updateVerificationDetails(row, remarks, by, at),
      this.updatePdfDetails(row, status === "APPROVED" ? "READY" : "NOT_READY", status === "APPROVED" ? pdfLink : ""),
    ] });
  }
}
