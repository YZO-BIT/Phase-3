import "server-only";
import { access, constants, mkdir, readFile, writeFile, rename, readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import lockfile from "proper-lockfile";
import { registrationSchema, type RegistrationInput } from "../registration-data";
import { HttpError, PERSISTENT_STORAGE_ERROR } from "./errors";
import { sha256 } from "./images";

export type PrivateRecord = {
  id: string; owner: string; input: RegistrationInput; inputHash: string; createdAt: string;
  proofHash: string; proofSize: number; appendAttempted: boolean;
  verification?: { decision: "APPROVED" | "REJECTED"; by: string; at: string; remarks: string; pdfHash?: string };
};
export const isRegistrationId = (id: string) => /^PG-2026-[A-F0-9]{16}$/.test(id);

export class PrivateStore {
  constructor(private root: string) {}
  private storageError() { return new HttpError(503, PERSISTENT_STORAGE_ERROR); }
  private path(id: string, filename: string) {
    if (!isRegistrationId(id)) throw new HttpError(404, "Registration not found.");
    return join(this.root, id, filename);
  }
  private async rootExists() {
    try { return (await stat(this.root)).isDirectory(); } catch { return false; }
  }
  async ensureReady() {
    const probe = join(this.root, `.storage-check-${randomUUID()}`);
    try {
      await mkdir(this.root, { recursive: true, mode: 0o700 });
      if (!(await stat(this.root)).isDirectory()) throw new Error("Private storage root is not a directory");
      await access(this.root, constants.R_OK | constants.W_OK | constants.X_OK);
      await writeFile(probe, "", { flag: "wx", mode: 0o600 });
    } catch { throw this.storageError(); }
    finally { await unlink(probe).catch(() => undefined); }
  }
  async withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    await this.ensureReady();
    let compromised = false;
    let release: () => Promise<void>;
    try { release = await lockfile.lock(this.root, { realpath: false, stale: 120_000, update: 1000, retries: { retries: 20, minTimeout: 100, maxTimeout: 500, factor: 1.1 }, onCompromised: () => { compromised = true; } }); }
    catch { throw new HttpError(503, "Another registration update is processing. Please retry with the same details."); }
    try {
      const result = await operation();
      if (compromised) throw new HttpError(503, "Registration update could not be confirmed. Please contact the organizer.");
      return result;
    } finally { await release().catch(() => undefined); }
  }
  private async write(id: string, filename: string, bytes: Uint8Array | string) {
    const target = this.path(id, filename);
    const temporary = `${target}.${randomUUID()}.tmp`;
    try { await mkdir(join(this.root, id), { recursive: true, mode: 0o700 }); await writeFile(temporary, bytes, { flag: "wx", mode: 0o600 }); await rename(temporary, target); }
    catch { throw this.storageError(); }
    finally { await unlink(temporary).catch(() => undefined); }
  }
  async readRecord(id: string): Promise<PrivateRecord | null> {
    try { return JSON.parse(await readFile(this.path(id, "record.json"), "utf8")) as PrivateRecord; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        if (!(await this.rootExists())) throw this.storageError();
        return null;
      }
      throw this.storageError();
    }
  }
  async readAcademicYear(id: string, expectedParticipant?: { name: string; email: string }): Promise<string | null> {
    const record = await this.readRecord(id);
    if (!record || record.id !== id) return null;
    const parsed = registrationSchema.safeParse(record.input);
    if (parsed.success && expectedParticipant && (parsed.data.participant.name !== expectedParticipant.name || parsed.data.participant.email !== expectedParticipant.email)) return null;
    return parsed.success ? parsed.data.participant.year : null;
  }
  saveRecord(record: PrivateRecord) { return this.write(record.id, "record.json", JSON.stringify(record)); }
  saveProof(id: string, bytes: Uint8Array) { return this.write(id, "proof.png", bytes); }
  savePdf(id: string, bytes: Uint8Array) { return this.write(id, "registration.pdf", bytes); }
  async readProof(record: PrivateRecord) {
    try {
      const bytes = await readFile(this.path(record.id, "proof.png"));
      if (!bytes.length || bytes.length !== record.proofSize || sha256(bytes) !== record.proofHash) throw new Error("Proof integrity failure");
      return bytes;
    } catch { throw new HttpError(503, "Stored payment screenshot is unavailable. Contact the organizer."); }
  }
  async readPdf(record: PrivateRecord) {
    try {
      const bytes = await readFile(this.path(record.id, "registration.pdf"));
      if (!record.verification?.pdfHash || sha256(bytes) !== record.verification.pdfHash) throw new Error("PDF integrity failure");
      return bytes;
    } catch { throw new HttpError(503, "The approved PDF is unavailable. Contact the organizer."); }
  }
  async ownedIds(owner: string) {
    let ids: string[];
    try { ids = (await readdir(this.root)).filter(isRegistrationId); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
    const owned: string[] = [];
    for (const id of ids) if ((await this.readRecord(id))?.owner === owner) owned.push(id);
    return owned;
  }
}
