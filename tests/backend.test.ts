import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

// Only the external Google API is replaced. Controllers, auth, image decoding,
// filesystem persistence, locking, approval, and PDF generation are real.
class SheetsTransport {
  rows: string[][] = [];
  unavailable = false;
  failAfterAppend = false;
  appends = 0;
  fetch: typeof fetch = async (input, init) => {
    if (this.unavailable) return Response.json({ error: "upstream unavailable" }, { status: 503 });
    const url = new URL(String(input));
    assert.equal(url.origin, "https://sheets.googleapis.com");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-google-token");
    const range = decodeURIComponent(url.pathname.split("/values/")[1] ?? "");
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    if (url.pathname.endsWith("/values:batchUpdate")) {
      for (const update of body.data) this.apply(update.range, update.values);
      return Response.json({ totalUpdatedRows: 1 });
    }
    if (range.endsWith(":append")) {
      this.rows.push(...body.values);
      this.appends++;
      if (this.failAfterAppend) { this.failAfterAppend = false; throw new Error("Connection lost after commit"); }
      return Response.json({ updates: { updatedRows: 1 } });
    }
    if (init?.method === "PUT") {
      this.apply(range, body.values);
      return Response.json({ updatedRows: body.values.length });
    }
    return Response.json({ values: this.read(range) });
  };
  read(range: string) {
    const cells = range.split("!")[1] ?? "A1:AJ10001";
    if (cells === "A:A") return this.rows.map((row) => [row[0]]);
    if (cells === "A1:AJ1") return this.rows.length ? [this.rows[0]] : [];
    const match = cells.match(/^A(\d+):AJ(\d+)$/);
    return match ? this.rows.slice(Number(match[1]) - 1, Number(match[2])) : this.rows;
  }
  apply(range: string, values: string[][]) {
    const cell = range.split("!")[1].split(":")[0];
    const match = cell.match(/^([A-Z]+)(\d+)$/)!;
    const column = [...match[1]].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
    values.forEach((valuesRow, i) => {
      const row = Number(match[2]) - 1 + i;
      this.rows[row] ??= Array(36).fill("");
      valuesRow.forEach((value, j) => { this.rows[row][column + j] = String(value); });
    });
  }
}

const origin = "http://localhost:3000";
const payload = (enrollment = "GEHU/2026/CS/TEST001") => ({
  participant: { name: "Test Participant", enrollment, email: "participant@example.test", phone: "+91 98765 43210", college: "Test University", city: "Dehradun", branch: "CSE (Core)", year: "3rd Year" },
  eventIds: ["cp"], teamName: "", members: [], utr: "123456789012", amount: 150,
  agreements: { authentic: true, conduct: true }, idempotencyKey: "d3c67b5f-ff20-4140-96d6-077133556d4d",
});
const cookieFrom = (res: Response) => res.headers.get("set-cookie")!.split(";")[0];

async function fixture(t: TestContext) {
  let createApplication;
  try { ({ createApplication } = await import("../lib/server/application")); }
  catch { assert.fail("The server-backed registration application has not been implemented"); }
  const root = await mkdtemp(join(tmpdir(), "phase3-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const google = new SheetsTransport();
  const salt = randomBytes(16).toString("hex");
  const app = createApplication({
    appUrl: origin, sessionSecret: randomBytes(48).toString("hex"), privateStorageDir: root, trustProxy: false,
    google: { sheetId: "test-sheet", sheetName: "Registrations", email: "test@example.test", privateKey: "not-a-live-key" },
    admin: { email: "admin@example.test", passwordHash: `scrypt:${salt}:${scryptSync("test-password-12345", salt, 64).toString("hex")}` },
    payment: { upiId: "test@upi", payeeName: "Test Organizer" },
  }, { sheetFetch: google.fetch, googleToken: async () => "test-google-token" });
  const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#6ff6ff" } }).png().toBuffer();
  async function submit(data = payload(), proof: File | null = new File([image], "payment.png", { type: "image/png" }), cookie = "") {
    const form = new FormData();
    form.set("data", JSON.stringify(data));
    if (proof) form.set("screenshot", proof);
    return app.submit(new Request(`${origin}/api/registrations`, { method: "POST", headers: { origin, cookie }, body: form }));
  }
  async function login() {
    const response = await app.login(new Request(`${origin}/api/admin/login`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ email: "admin@example.test", password: "test-password-12345" }) }));
    assert.equal(response.status, 200);
    return cookieFrom(response);
  }
  const context = (id: string) => ({ params: Promise.resolve({ id }) });
  const request = (id: string, cookie: string) => new Request(`${origin}/pdf/${id}`, { headers: { cookie } });
  const decide = (id: string, cookie: string, decision = "APPROVE", remarks = "Payment checked against the bank statement") => app.decide(new Request(`${origin}/api/admin/registrations/${id}/decision`, { method: "POST", headers: { origin, cookie, "content-type": "application/json" }, body: JSON.stringify({ decision, remarks }) }), context(id));
  return { app, google, submit, login, context, request, decide, root, image };
}

test("registration persists a real image and exactly ordered PENDING/NOT_READY Google row", async (t) => {
  const f = await fixture(t);
  const res = await f.submit();
  assert.equal(res.status, 201);
  const reg = await res.json();
  assert.match(reg.id, /^PG-2026-[A-F0-9]+$/);
  assert.equal(reg.paymentStatus, "PENDING");
  assert.equal(reg.pdfStatus, "NOT_READY");
  assert.equal(reg.pdfUrl, null);
  assert.equal(f.google.rows[0].length, 36);
  const row = f.google.rows[1];
  assert.equal(row[2], "Competitive Programming");
  assert.equal(row[3], "17 October 2026");
  assert.equal(row[28], "150");
  assert.equal(row[30], "PENDING");
  assert.equal(row[34], "NOT_READY");
  assert.equal(row[35], "");
  assert.match(row[29], /\/api\/registrations\/PG-2026-[A-F0-9]+\/proof$/);
  const admin = await f.login();
  const proof = await f.app.proof(f.request(reg.id, admin), f.context(reg.id));
  assert.equal(proof.status, 200);
  assert.equal(proof.headers.get("content-type"), "image/png");
  assert.equal((await sharp(Buffer.from(await proof.arrayBuffer())).metadata()).format, "png");
});

test("missing screenshot is rejected by the backend and produces no registration", async (t) => {
  const f = await fixture(t);
  const response = await f.submit(payload(), null);
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /screenshot required/i);
  assert.equal(f.google.appends, 0);
});

test("forged, empty, oversized, and mismatched screenshot files are rejected", async (t) => {
  const f = await fixture(t);
  for (const file of [
    new File(["not an image"], "fake.png", { type: "image/png" }),
    new File([], "empty.png", { type: "image/png" }),
    new File([f.image], "proof.pdf", { type: "application/pdf" }),
    new File([f.image], "proof.jpg", { type: "image/jpeg" }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }),
  ]) {
    const response = await f.submit(payload(), file);
    assert.ok([400, 413].includes(response.status));
  }
  assert.equal(f.google.appends, 0);
});

test("PENDING PDF direct access is forbidden even with a forged query status", async (t) => {
  const f = await fixture(t);
  const response = await f.submit();
  const { id } = await response.json();
  const owner = cookieFrom(response);
  const pdf = await f.app.pdf(new Request(`${origin}/pdf/${id}?paymentStatus=APPROVED`, { headers: { cookie: owner } }), f.context(id));
  assert.equal(pdf.status, 403);
  assert.match((await pdf.json()).error, /verification pending/i);
});

test("frontend approval fields and manipulated amounts cannot alter server state", async (t) => {
  const f = await fixture(t);
  for (const forged of [{ ...payload(), paymentStatus: "APPROVED", pdfStatus: "READY" }, { ...payload(), amount: 1 }]) {
    const response = await f.submit(forged);
    assert.equal(response.status, 400);
  }
  assert.equal(f.google.appends, 0);
});

test("admin approval updates the same row and generates a protected real PDF", async (t) => {
  const f = await fixture(t);
  const created = await f.submit();
  const { id } = await created.json();
  const owner = cookieFrom(created);
  const admin = await f.login();
  const approved = await f.decide(id, admin);
  assert.equal(approved.status, 200);
  assert.equal((await approved.json()).paymentStatus, "APPROVED");
  assert.equal(f.google.appends, 1);
  assert.equal(f.google.rows[1][30], "APPROVED");
  assert.equal(f.google.rows[1][32], "admin@example.test");
  assert.ok(f.google.rows[1][33]);
  assert.equal(f.google.rows[1][34], "READY");
  assert.match(f.google.rows[1][35], /\/pdf\/PG-2026-/);
  const pdf = await f.app.pdf(f.request(id, owner), f.context(id));
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  assert.equal(pdf.headers.get("cache-control"), "private, no-store, max-age=0");
  const bytes = Buffer.from(await pdf.arrayBuffer());
  assert.ok((await PDFDocument.load(bytes)).getPageCount() > 0);
  const repeat = await f.decide(id, admin);
  assert.equal(repeat.status, 200);
  assert.deepEqual(Buffer.from(await (await f.app.pdf(f.request(id, owner), f.context(id))).arrayBuffer()), bytes);
});

test("admin rejection records remarks and permanently denies that registration's PDF", async (t) => {
  const f = await fixture(t);
  const response = await f.submit();
  const { id } = await response.json();
  const admin = await f.login();
  assert.equal((await f.decide(id, admin, "REJECT", "Reference does not match payment")).status, 200);
  assert.equal(f.google.rows[1][30], "REJECTED");
  assert.equal(f.google.rows[1][31], "Reference does not match payment");
  assert.equal(f.google.rows[1][34], "NOT_READY");
  assert.equal(f.google.rows[1][35], "");
  const pdf = await f.app.pdf(f.request(id, cookieFrom(response)), f.context(id));
  assert.equal(pdf.status, 403);
  assert.match((await pdf.json()).error, /payment rejected/i);
  assert.equal((await f.decide(id, admin)).status, 409);
});

test("concurrent double submission and retry after a lost append response never duplicate rows", async (t) => {
  const f = await fixture(t);
  const first = await f.submit();
  const owner = cookieFrom(first);
  const { id } = await first.json();
  const responses = await Promise.all([f.submit(payload(), undefined, owner), f.submit(payload(), undefined, owner)]);
  assert.ok(responses.every((res) => res.status === 200));
  assert.equal(f.google.appends, 1);
  assert.equal(f.google.rows[1][0], id);
  f.google.failAfterAppend = true;
  const other = payload("GEHU/2026/CS/TEST002");
  const failed = await f.submit(other, undefined, owner);
  assert.equal(failed.status, 503);
  assert.equal((await f.submit(other, undefined, owner)).status, 200);
  assert.equal(f.google.appends, 2);
});

test("Google failures cannot report submission or approval success or authorize a PDF", async (t) => {
  const f = await fixture(t);
  f.google.unavailable = true;
  assert.equal((await f.submit()).status, 503);
  assert.equal(f.google.appends, 0);
  f.google.unavailable = false;
  const response = await f.submit();
  const { id } = await response.json();
  const admin = await f.login();
  f.google.unavailable = true;
  assert.equal((await f.decide(id, admin)).status, 503);
  assert.equal((await f.app.pdf(f.request(id, cookieFrom(response)), f.context(id))).status, 503);
  assert.equal(f.google.rows[1][30], "PENDING");
});

test("ownership, admin authentication, CSRF, and altered admin cookies are enforced", async (t) => {
  const f = await fixture(t);
  const first = await f.submit();
  const { id } = await first.json();
  const other = await f.submit(payload("GEHU/2026/CS/OTHER"));
  const outsider = cookieFrom(other);
  assert.equal((await f.app.pdf(f.request(id, outsider), f.context(id))).status, 404);
  assert.equal((await f.app.proof(f.request(id, outsider), f.context(id))).status, 404);
  assert.equal((await f.decide(id, cookieFrom(first))).status, 401);
  assert.equal((await f.app.adminList(new Request(`${origin}/api/admin/registrations`))).status, 401);
  const admin = await f.login();
  assert.equal((await f.decide(id, admin.slice(0, -3) + "xxx")).status, 401);
  const csrf = await f.app.decide(new Request(`${origin}/api/admin/registrations/${id}/decision`, { method: "POST", headers: { origin: "https://attacker.example", cookie: admin, "content-type": "application/json" }, body: JSON.stringify({ decision: "APPROVE", remarks: "" }) }), f.context(id));
  assert.equal(csrf.status, 403);
  assert.equal(f.google.rows[1][30], "PENDING");
});

test("current Sheet status is checked again on every approved PDF download", async (t) => {
  const f = await fixture(t);
  const response = await f.submit();
  const { id } = await response.json();
  const admin = await f.login();
  assert.equal((await f.decide(id, admin)).status, 200);
  f.google.rows[1][30] = "REJECTED";
  assert.equal((await f.app.pdf(f.request(id, cookieFrom(response)), f.context(id))).status, 403);
  f.google.unavailable = true;
  assert.equal((await f.app.pdf(f.request(id, cookieFrom(response)), f.context(id))).status, 503);
});

test("admin statistics come from actual rows and conflicting or incomplete rosters are rejected", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.submit({ ...payload(), eventIds: ["cp", "ctf"], amount: 450 })).status, 400);
  assert.equal((await f.submit({ ...payload(), eventIds: ["bgmi"], amount: 400, teamName: "Test Team" })).status, 400);
  await f.submit();
  const admin = await f.login();
  const response = await f.app.adminList(new Request(`${origin}/api/admin/registrations`, { headers: { cookie: admin } }));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).statistics, { total: 1, pending: 1, approved: 0, rejected: 0, pdfs: 0 });
});
