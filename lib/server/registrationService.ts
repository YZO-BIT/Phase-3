import "server-only";
import { createHmac } from "node:crypto";
import { eventDateLabel, eventScheduleLabel, events } from "../events";
import { registrationSchema, type AdminRegistrationSummary, type RegistrationInput, type RegistrationView } from "../registration-data";
import type { Principal } from "./auth";
import type { ServerConfig } from "./config";
import { assertPaymentConfigured, assertPersistentStorageConfigured, assertSessionConfigured } from "./config";
import { GoogleSheetsRepository, type SheetRow } from "./googleSheets";
import { PrivateStore, type PrivateRecord } from "./privateStore";
import { GoogleSheetsError, HttpError, MISSING_DOSSIER_ERROR } from "./errors";
import { sha256, validateScreenshot } from "./images";
import { generateRegistrationPdf } from "./pdf";

export type AdminListFilters = {
  status?: "ALL" | "PENDING" | "APPROVED" | "REJECTED";
  eventId?: string;
  day?: "16" | "17" | "19";
  search?: string;
  page?: number;
  pageSize?: number;
};

function sheetCells(record: PrivateRecord, appUrl: string): string[] {
  const input = record.input;
  const selected = events.filter((event) => input.eventIds.includes(event.id));
  const teamEvents = selected.filter((event) => event.members > 1);
  const teamSize = Math.max(1, ...selected.map((event) => event.members));
  const participants = [input.participant, ...input.members];
  return [
    record.id, record.createdAt, selected.map((event) => event.title).join("; "), selected.map(eventDateLabel).join("; "), selected.map(eventScheduleLabel).join("; "),
    teamEvents.length ? input.teamName : input.participant.name, teamEvents.length ? selected.some((event) => event.members === 1) ? "Team + Individual" : "Team" : "Individual",
    `${teamSize}${participants.length > teamSize ? " (+1 alternate)" : ""}`, input.participant.name, input.participant.email, input.participant.phone, input.participant.college, input.participant.city,
    ...Array.from({ length: 5 }, (_, index) => [participants[index]?.name ?? "", participants[index]?.email ?? "", participants[index]?.phone ?? ""]).flat(),
    String(input.amount), input.paymentMethod === "ONLINE" ? `${appUrl}/api/registrations/${record.id}/proof` : "", "PENDING", "", "", "", "NOT_READY", "", input.paymentMethod,
  ];
}
function view(row: SheetRow): RegistrationView {
  const cells = row.cells;
  const paymentStatus = cells[30];
  const pdfStatus = cells[34];
  const paymentMethod = cells[36] || "ONLINE";
  const eventNames = cells[2].split("; ").filter(Boolean);
  const selected = events.filter((event) => eventNames.includes(event.title));
  const eventIds = selected.map((event) => event.id);
  const eventDates = selected.length === eventNames.length ? selected.map(eventDateLabel).join("; ") : cells[3];
  const eventTimes = selected.length === eventNames.length ? selected.map(eventScheduleLabel).join("; ") : cells[4];
  if (!["PENDING", "APPROVED", "REJECTED"].includes(paymentStatus) || !["NOT_READY", "READY"].includes(pdfStatus) || !["ONLINE", "OFFLINE"].includes(paymentMethod) || !Number.isSafeInteger(Number(cells[28])) || Number(cells[28]) <= 0) throw new HttpError(503, "The registration record is inconsistent. Contact the organizer.");
  return {
    id: cells[0], createdAt: cells[1], eventIds, paymentMethod: paymentMethod as RegistrationView["paymentMethod"], eventNames: cells[2], eventDates, eventTimes,
    participantName: cells[8], email: cells[9], phone: cells[10], college: cells[11], city: cells[12],
    teamName: cells[6].includes("Team") ? cells[5] : "", registrationType: cells[6], teamSize: cells[7], amount: Number(cells[28]), proofUrl: cells[29],
    paymentStatus: paymentStatus as RegistrationView["paymentStatus"], pdfStatus: pdfStatus as RegistrationView["pdfStatus"],
    pdfUrl: paymentStatus === "APPROVED" && pdfStatus === "READY" ? cells[35] || null : null,
    remarks: cells[31], verifiedBy: cells[32], verifiedAt: cells[33],
  };
}

export class RegistrationService {
  constructor(private sheets: GoogleSheetsRepository, private store: PrivateStore, private config: ServerConfig) {}
  private validateStoredRecord(record: PrivateRecord, id: string, principal: Principal) {
    if (principal.role !== "admin" && record.owner !== sha256(principal.sub)) throw new HttpError(404, "Registration not found.");
    record.input = registrationSchema.parse(record.input);
    if (record.id !== id) throw new HttpError(503, "The registration record is inconsistent.");
    return record;
  }
  private async authorizedRecord(id: string, principal: Principal) {
    assertPersistentStorageConfigured(this.config);
    const record = await this.store.readRecord(id);
    if (!record) throw new HttpError(404, "Registration not found.");
    return this.validateStoredRecord(record, id, principal);
  }
  private async adminRecord(id: string, admin: Principal) {
    assertPersistentStorageConfigured(this.config);
    const record = await this.store.readRecord(id);
    if (!record) {
      const listed = await this.sheets.getRegistrationFromSheet(id);
      if (listed) throw new HttpError(503, MISSING_DOSSIER_ERROR);
      throw new HttpError(404, "Registration not found.");
    }
    return this.validateStoredRecord(record, id, admin);
  }
  private async currentRow(record: PrivateRecord) {
    const row = await this.sheets.getRegistrationFromSheet(record.id);
    if (!row) throw new HttpError(404, "Registration is not confirmed in Google Sheets. Contact the organizer.");
    const expected = sheetCells(record, this.config.appUrl);
    const stableExpected = [...expected.slice(0, 3), ...expected.slice(5, 30)];
    const stableActual = [...row.cells.slice(0, 3), ...row.cells.slice(5, 30)];
    if (stableExpected.some((cell, index) => stableActual[index] !== cell) || row.cells[36] !== expected[36]) throw new HttpError(503, "The registration details do not match the stored payment dossier. Contact the organizer.");
    return row;
  }
  async register(rawInput: unknown, screenshot: File | null, principal: Principal) {
    const input = registrationSchema.parse(rawInput);
    assertSessionConfigured(this.config);
    assertPersistentStorageConfigured(this.config);
    if (input.paymentMethod === "ONLINE") {
      assertPaymentConfigured(this.config);
      if (!screenshot) throw new HttpError(400, "Payment screenshot required for Online Payment.");
    }
    const proof = input.paymentMethod === "ONLINE" ? await validateScreenshot(screenshot!) : null;
    const identity = `${input.participant.enrollment}|${[...input.eventIds].sort().join(",")}`;
    const id = `PG-2026-${createHmac("sha256", this.config.sessionSecret).update(identity).digest("hex").slice(0, 16).toUpperCase()}`;
    const { idempotencyKey: _key, ...fingerprint } = input;
    const inputHash = sha256(JSON.stringify({ ...fingerprint, eventIds: [...input.eventIds].sort() }));
    const { paymentMethod: _paymentMethod, ...legacyFingerprint } = fingerprint;
    const { otherCourse: _otherCourse, ...legacyParticipant } = legacyFingerprint.participant;
    const legacyInputHash = sha256(JSON.stringify({ ...legacyFingerprint, participant: legacyParticipant, eventIds: [...input.eventIds].sort() }));
    return this.store.withWriteLock(async () => {
      await this.sheets.ensureHeaders();
      let record = await this.store.readRecord(id);
      const existing = await this.sheets.getRegistrationFromSheet(id);
      if (record) record.input = registrationSchema.parse(record.input);
      if (record && (record.owner !== sha256(principal.sub) || ![inputHash, legacyInputHash].includes(record.inputHash))) throw new HttpError(409, "A registration already exists for this enrollment and event selection. Use the original browser or contact the organizer.");
      if (existing) {
        if (!record) throw new HttpError(503, "The registration exists but its private payment dossier is unavailable. Contact the organizer.");
        if (record.input.paymentMethod === "ONLINE") await this.store.readProof(record);
        return { registration: view(await this.currentRow(record)), created: false };
      }
      if (record?.appendAttempted) throw new HttpError(503, "An earlier Google Sheets write could not be confirmed. No second row has been created. Contact the organizer with the same registration details.");
      if (!record) {
        record = { id, owner: sha256(principal.sub), input, inputHash, createdAt: new Date().toISOString(), proofHash: proof?.hash ?? "", proofSize: proof?.size ?? 0, appendAttempted: false };
        if (proof) await this.store.saveProof(id, proof.bytes);
        await this.store.saveRecord(record);
        if (proof) await this.store.readProof(record);
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
  async proof(id: string, principal: Principal) {
    const record = await this.authorizedRecord(id, principal);
    if (record.input.paymentMethod === "OFFLINE") throw new HttpError(404, "No payment screenshot was uploaded for this Offline Payment registration.");
    return this.store.readProof(record);
  }
  async pdf(id: string, principal: Principal) {
    const record = await this.authorizedRecord(id, principal);
    const row = await this.currentRow(record); // Fresh, uncached Google read on EVERY request.
    if (row.cells[30] === "PENDING") throw new HttpError(403, "Payment verification pending. PDF unavailable until administrator approval.");
    if (row.cells[30] === "REJECTED") throw new HttpError(403, "Payment rejected. This registration cannot access a PDF.");
    const verification = record.verification;
    if (row.cells[30] !== "APPROVED" || row.cells[34] !== "READY" || !verification || verification.decision !== "APPROVED" || row.cells[32] !== verification.by || row.cells[33] !== verification.at || row.cells[35] !== `${this.config.appUrl}/pdf/${id}`) throw new HttpError(403, "An administrator-approved PDF is not ready for this registration.");
    if (record.input.paymentMethod === "ONLINE") await this.store.readProof(record);
    return this.store.readPdf(record);
  }
  private async academicYear(registration: RegistrationView) {
    try {
      return await this.store.readAcademicYear(registration.id, { name: registration.participantName, email: registration.email });
    }
    catch (error) { if (error instanceof HttpError && error.status === 503) return null; throw error; }
  }
  async adminList(filters: AdminListFilters = {}) {
    const allRegistrations = (await this.sheets.listRegistrations()).map(view).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const statistics = { total: allRegistrations.length, pending: 0, approved: 0, rejected: 0, pdfs: 0 };
    for (const registration of allRegistrations) {
      statistics[registration.paymentStatus.toLowerCase() as "pending" | "approved" | "rejected"]++;
      if (registration.paymentStatus === "APPROVED" && registration.pdfStatus === "READY") statistics.pdfs++;
    }
    const eventCounts = events.map((event) => ({ eventId: event.id, title: event.title, dates: [...new Set(event.sessions.map((session) => session.date))].join(", "), count: allRegistrations.filter((registration) => registration.eventIds.includes(event.id)).length }));
    const search = filters.search?.trim().toLowerCase() || "";
    const filtered = allRegistrations.filter((registration) => {
      if (filters.status && filters.status !== "ALL" && registration.paymentStatus !== filters.status) return false;
      if (filters.eventId && !registration.eventIds.includes(filters.eventId)) return false;
      if (filters.day && !registration.eventIds.some((id) => events.find((event) => event.id === id)?.sessions.some((session) => String(session.date) === filters.day))) return false;
      if (search && ![registration.id, registration.participantName, registration.email, registration.eventNames].some((value) => value.toLowerCase().includes(search))) return false;
      return true;
    });
    const pageSize = Math.min(Math.max(filters.pageSize || 25, 1), 100);
    const page = Math.max(filters.page || 1, 1);
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pageRegistrations = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const registrations: AdminRegistrationSummary[] = await Promise.all(pageRegistrations.map(async (registration) => ({ ...registration, academicYear: await this.academicYear(registration) })));
    return { registrations, statistics, eventCounts, pagination: { page: currentPage, pageSize, total: filtered.length, totalPages } };
  }
  async adminDetails(id: string, admin: Principal) {
    const record = await this.adminRecord(id, admin);
    return { registration: view(await this.currentRow(record)), participant: record.input.participant, members: record.input.members, utr: record.input.utr };
  }
  async decide(id: string, decision: "APPROVE" | "REJECT", remarks: string, admin: Principal) {
    if (admin.role !== "admin") throw new HttpError(403, "Administrator authorization required.");
    assertPersistentStorageConfigured(this.config);
    return this.store.withWriteLock(async () => {
      const record = await this.authorizedRecord(id, admin);
      const row = await this.currentRow(record);
      const status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
      if (row.cells[30] !== "PENDING") {
        if (row.cells[30] !== status || record.verification?.decision !== status) throw new HttpError(409, "Only PENDING registrations can be verified. This registration was already reviewed.");
        if (status === "APPROVED") await this.pdf(id, admin);
        return view(row);
      }
      if (record.input.paymentMethod === "ONLINE") await this.store.readProof(record);
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
