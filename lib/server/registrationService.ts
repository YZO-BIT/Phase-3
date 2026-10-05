import "server-only";
import { createHmac } from "node:crypto";
import { events } from "../events";
import { registrationSchema, type RegistrationInput, type RegistrationView } from "../registration-data";
import type { Principal } from "./auth";
import type { ServerConfig } from "./config";
import { assertPaymentConfigured, assertSessionConfigured } from "./config";
import { GoogleSheetsRepository, type SheetRow } from "./googleSheets";
import { PrivateStore, type PrivateRecord } from "./privateStore";
import { GoogleSheetsError, HttpError } from "./errors";
import { sha256, validateScreenshot } from "./images";
import { generateRegistrationPdf } from "./pdf";

function sheetCells(record: PrivateRecord, appUrl: string): string[] {
  const input = record.input;
  const selected = events.filter((event) => input.eventIds.includes(event.id));
  const teamEvents = selected.filter((event) => event.members > 1);
  const teamSize = Math.max(1, ...selected.map((event) => event.members));
  const participants = [input.participant, ...input.members];
  return [
    record.id, record.createdAt, selected.map((event) => event.title).join("; "), selected.map((event) => `${event.date} October 2026`).join("; "), selected.map((event) => event.time).join("; "),
    teamEvents.length ? input.teamName : input.participant.name, teamEvents.length ? selected.some((event) => event.members === 1) ? "Team + Individual" : "Team" : "Individual",
    `${teamSize}${participants.length > teamSize ? " (+1 alternate)" : ""}`, input.participant.name, input.participant.email, input.participant.phone, input.participant.college, input.participant.city,
    ...Array.from({ length: 5 }, (_, index) => [participants[index]?.name ?? "", participants[index]?.email ?? "", participants[index]?.phone ?? ""]).flat(),
    String(input.amount), `${appUrl}/api/registrations/${record.id}/proof`, "PENDING", "", "", "", "NOT_READY", "",
  ];
}
function view(row: SheetRow): RegistrationView {
  const cells = row.cells;
  const paymentStatus = cells[30];
  const pdfStatus = cells[34];
  if (!["PENDING", "APPROVED", "REJECTED"].includes(paymentStatus) || !["NOT_READY", "READY"].includes(pdfStatus) || !Number.isSafeInteger(Number(cells[28])) || Number(cells[28]) <= 0) throw new HttpError(503, "The registration record is inconsistent. Contact the organizer.");
  return {
    id: cells[0], createdAt: cells[1], eventNames: cells[2], eventDates: cells[3], eventTimes: cells[4],
    participantName: cells[8], email: cells[9], phone: cells[10], college: cells[11], city: cells[12],
    teamName: cells[6].includes("Team") ? cells[5] : "", registrationType: cells[6], teamSize: cells[7], amount: Number(cells[28]), proofUrl: cells[29],
    paymentStatus: paymentStatus as RegistrationView["paymentStatus"], pdfStatus: pdfStatus as RegistrationView["pdfStatus"],
    pdfUrl: paymentStatus === "APPROVED" && pdfStatus === "READY" ? cells[35] || null : null,
    remarks: cells[31], verifiedBy: cells[32], verifiedAt: cells[33],
  };
}

export class RegistrationService {
  constructor(private sheets: GoogleSheetsRepository, private store: PrivateStore, private config: ServerConfig) {}
  private async authorizedRecord(id: string, principal: Principal) {
    const record = await this.store.readRecord(id);
    if (!record || (principal.role !== "admin" && record.owner !== sha256(principal.sub))) throw new HttpError(404, "Registration not found.");
    registrationSchema.parse(record.input);
    if (record.id !== id) throw new HttpError(503, "The registration record is inconsistent.");
    return record;
  }
  private async currentRow(record: PrivateRecord) {
    const row = await this.sheets.getRegistrationFromSheet(record.id);
    if (!row) throw new HttpError(404, "Registration is not confirmed in Google Sheets. Contact the organizer.");
    const expected = sheetCells(record, this.config.appUrl);
    if (expected.slice(0, 30).some((cell, index) => row.cells[index] !== cell)) throw new HttpError(503, "The registration details do not match the stored payment dossier. Contact the organizer.");
    return row;
  }
  async register(rawInput: unknown, screenshot: File, principal: Principal) {
    const input = registrationSchema.parse(rawInput);
    assertSessionConfigured(this.config);
    assertPaymentConfigured(this.config);
    const proof = await validateScreenshot(screenshot);
    const identity = `${input.participant.enrollment}|${[...input.eventIds].sort().join(",")}`;
    const id = `PG-2026-${createHmac("sha256", this.config.sessionSecret).update(identity).digest("hex").slice(0, 16).toUpperCase()}`;
    const { idempotencyKey: _key, ...fingerprint } = input;
    const inputHash = sha256(JSON.stringify({ ...fingerprint, eventIds: [...input.eventIds].sort() }));
    return this.store.withWriteLock(async () => {
      await this.sheets.ensureHeaders();
      let record = await this.store.readRecord(id);
      const existing = await this.sheets.getRegistrationFromSheet(id);
      if (record && (record.owner !== sha256(principal.sub) || record.inputHash !== inputHash)) throw new HttpError(409, "A registration already exists for this enrollment and event selection. Use the original browser or contact the organizer.");
      if (existing) {
        if (!record) throw new HttpError(503, "The registration exists but its private payment dossier is unavailable. Contact the organizer.");
        await this.store.readProof(record);
        return { registration: view(await this.currentRow(record)), created: false };
      }
      if (record?.appendAttempted) throw new HttpError(503, "An earlier Google Sheets write could not be confirmed. No second row has been created. Contact the organizer with the same registration details.");
      if (!record) {
        record = { id, owner: sha256(principal.sub), input, inputHash, createdAt: new Date().toISOString(), proofHash: proof.hash, proofSize: proof.size, appendAttempted: false };
        await this.store.saveProof(id, proof.bytes);
        await this.store.saveRecord(record);
        await this.store.readProof(record);
      }
      record.appendAttempted = true;
      await this.store.saveRecord(record);
      try { await this.sheets.appendRegistrationToSheet(sheetCells(record, this.config.appUrl)); }
      catch (error) {
        // A timeout can occur AFTER Google commits. Never blindly append again.
        if (error instanceof GoogleSheetsError && !error.ambiguous) { record.appendAttempted = false; await this.store.saveRecord(record); }
        throw error;
      }
      const confirmed = await this.currentRow(record);
      if (confirmed.cells[30] !== "PENDING" || confirmed.cells[34] !== "NOT_READY" || confirmed.cells[35]) throw new HttpError(503, "Initial registration state could not be confirmed.");
      return { registration: view(confirmed), created: true };
    });
  }
  async status(id: string, principal: Principal) { return view(await this.currentRow(await this.authorizedRecord(id, principal))); }
  async owned(principal: Principal) {
    const ids = new Set(await this.store.ownedIds(sha256(principal.sub)));
    if (!ids.size) return [];
    return (await this.sheets.listRegistrations()).filter((row) => ids.has(row.cells[0])).map(view).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async proof(id: string, principal: Principal) { return this.store.readProof(await this.authorizedRecord(id, principal)); }
  async pdf(id: string, principal: Principal) {
    const record = await this.authorizedRecord(id, principal);
    const row = await this.currentRow(record); // Fresh, uncached Google read on EVERY request.
    if (row.cells[30] === "PENDING") throw new HttpError(403, "Payment verification pending. PDF unavailable until administrator approval.");
    if (row.cells[30] === "REJECTED") throw new HttpError(403, "Payment rejected. This registration cannot access a PDF.");
    const verification = record.verification;
    if (row.cells[30] !== "APPROVED" || row.cells[34] !== "READY" || !verification || verification.decision !== "APPROVED" || row.cells[32] !== verification.by || row.cells[33] !== verification.at || row.cells[35] !== `${this.config.appUrl}/pdf/${id}`) throw new HttpError(403, "An administrator-approved PDF is not ready for this registration.");
    await this.store.readProof(record);
    return this.store.readPdf(record);
  }
  async adminList() {
    const registrations = (await this.sheets.listRegistrations()).map(view).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const statistics = { total: registrations.length, pending: 0, approved: 0, rejected: 0, pdfs: 0 };
    for (const registration of registrations) {
      statistics[registration.paymentStatus.toLowerCase() as "pending" | "approved" | "rejected"]++;
      if (registration.paymentStatus === "APPROVED" && registration.pdfStatus === "READY") statistics.pdfs++;
    }
    return { registrations, statistics };
  }
  async adminDetails(id: string, admin: Principal) {
    const record = await this.authorizedRecord(id, admin);
    return { registration: view(await this.currentRow(record)), participant: record.input.participant, members: record.input.members, utr: record.input.utr };
  }
  async decide(id: string, decision: "APPROVE" | "REJECT", remarks: string, admin: Principal) {
    if (admin.role !== "admin") throw new HttpError(403, "Administrator authorization required.");
    return this.store.withWriteLock(async () => {
      const record = await this.authorizedRecord(id, admin);
      const row = await this.currentRow(record);
      const status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
      if (row.cells[30] !== "PENDING") {
        if (row.cells[30] !== status || record.verification?.decision !== status) throw new HttpError(409, "Only PENDING registrations can be verified. This registration was already reviewed.");
        if (status === "APPROVED") await this.pdf(id, admin);
        return view(row);
      }
      await this.store.readProof(record);
      const at = new Date().toISOString();
      if (status === "APPROVED") {
        const bytes = await generateRegistrationPdf(record, admin.sub, at);
        await this.store.savePdf(id, bytes);
        record.verification = { decision: status, by: admin.sub, at, remarks, pdfHash: sha256(bytes) };
        await this.store.saveRecord(record);
        await this.store.readPdf(record);
      } else {
        record.verification = { decision: status, by: admin.sub, at, remarks };
        await this.store.saveRecord(record);
      }
      await this.sheets.updateRegistrationStatus(id, status, remarks, admin.sub, at, `${this.config.appUrl}/pdf/${id}`);
      const confirmed = await this.currentRow(record);
      if (confirmed.cells[30] !== status || confirmed.cells[31] !== remarks || confirmed.cells[32] !== admin.sub || confirmed.cells[33] !== at || confirmed.cells[34] !== (status === "APPROVED" ? "READY" : "NOT_READY")) throw new GoogleSheetsError(false);
      return view(confirmed);
    });
  }
}
