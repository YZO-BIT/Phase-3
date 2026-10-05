import "server-only";
import { z } from "zod";
import QRCode from "qrcode";
import { events, getConflictingEvent } from "../events";
import { MAX_SCREENSHOT_BYTES, registrationSchema } from "../registration-data";
import { AuthService, ADMIN_COOKIE } from "./auth";
import type { ServerConfig } from "./config";
import { assertPaymentConfigured } from "./config";
import { BaseController, HttpError, privateHeaders } from "./errors";
import { isRegistrationId } from "./privateStore";
import { RateLimiter } from "./rateLimit";
import { RegistrationService } from "./registrationService";

export type IdContext = { params: Promise<{ id: string }> };
const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(1).max(256) }).strict();
const decisionSchema = z.object({ decision: z.enum(["APPROVE", "REJECT"]), remarks: z.string().trim().max(500).default("") }).strict().refine((input) => input.decision !== "REJECT" || input.remarks.length > 0, "Enter a reason for rejection");

async function bodyBytes(request: Request, maximum: number) {
  const declared = Number(request.headers.get("content-length"));
  if (declared > maximum) throw new HttpError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body is required.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maximum) { await reader.cancel(); throw new HttpError(413, "Request is too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
async function jsonBody(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") throw new HttpError(400, "Send a JSON request body.");
  try { return JSON.parse((await bodyBytes(request, 8192)).toString("utf8")); }
  catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, "Invalid JSON request body."); }
}
async function idFrom(context: IdContext) {
  const { id } = await context.params;
  if (!isRegistrationId(id)) throw new HttpError(404, "Registration not found.");
  return id;
}

export class RegistrationController extends BaseController {
  private limiter = new RateLimiter();
  constructor(private service: RegistrationService, public auth: AuthService, private config: ServerConfig) { super(); }
  private ip(request: Request) {
    return this.config.trustProxy ? (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) || "direct") : "direct";
  }
  submit = async (request: Request) => {
    let cookie: string | undefined;
    const response = await this.execute("registration.submit", async () => {
      this.auth.csrf(request);
      this.limiter.check(`submit:${this.ip(request)}`, 20);
      const contentType = request.headers.get("content-type") || "";
      if (!contentType.startsWith("multipart/form-data;")) throw new HttpError(400, "Payment screenshot required. Submit the registration with an image upload.");
      const bytes = await bodyBytes(request, MAX_SCREENSHOT_BYTES + 65536);
      let form: FormData;
      try { form = await new Response(bytes, { headers: { "content-type": contentType } }).formData(); }
      catch { throw new HttpError(400, "Invalid registration upload."); }
      if ([...form.keys()].some((key) => !["data", "screenshot"].includes(key)) || form.getAll("data").length !== 1 || form.getAll("screenshot").length > 1) throw new HttpError(400, "Unexpected or duplicate registration fields.");
      const screenshot = form.get("screenshot");
      if (!(screenshot instanceof File) || !screenshot.size) throw new HttpError(400, "Payment screenshot required.");
      const data = form.get("data");
      if (typeof data !== "string" || data.length > 32768) throw new HttpError(400, "Invalid registration data.");
      let input: unknown;
      try { input = JSON.parse(data); } catch { throw new HttpError(400, "Invalid registration data."); }
      const validated = registrationSchema.parse(input);
      const owner = this.auth.owner(request);
      cookie = owner.cookie;
      const result = await this.service.register(validated, screenshot, owner.principal);
      return this.json(result.registration, result.created ? 201 : 200);
    });
    // Preserve ownership even when Google applied a write but its response was lost.
    if (cookie) response.headers.set("Set-Cookie", cookie);
    return response;
  };
  session = (request: Request) => this.execute("session.create", async () => {
    this.auth.csrf(request);
    this.limiter.check(`session:${this.ip(request)}`, 30);
    return this.json({ ready: true }, 200, { "Set-Cookie": this.auth.owner(request).cookie });
  });
  owned = (request: Request) => this.execute("registration.owned", async () => {
    const owner = this.auth.read(request, "participant");
    if (!owner) return this.json({ registrations: [] });
    this.limiter.check(`owned:${owner.sub}`, 20);
    return this.json({ registrations: await this.service.owned(owner) });
  });
  status = (request: Request, context: IdContext) => this.execute("registration.status", async () => {
    const principal = this.auth.requireReader(request);
    this.limiter.check(`status:${principal.sub}`, 30);
    return this.json(await this.service.status(await idFrom(context), principal));
  });
  proof = (request: Request, context: IdContext) => this.execute("registration.proof", async () => {
    const principal = this.auth.requireReader(request);
    this.limiter.check(`proof:${principal.sub}`, 30);
    const id = await idFrom(context);
    const bytes = await this.service.proof(id, principal);
    return new Response(bytes, { headers: { ...privateHeaders, "Content-Type": "image/png", "Content-Disposition": `inline; filename="payment-${id}.png"`, "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'" } });
  });
  pdf = (request: Request, context: IdContext) => this.execute("registration.pdf", async () => {
    const principal = this.auth.requireReader(request);
    this.limiter.check(`pdf:${principal.sub}`, 15);
    const id = await idFrom(context);
    const bytes = await this.service.pdf(id, principal);
    return new Response(bytes, { headers: { ...privateHeaders, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="registration-${id}.pdf"`, "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'" } });
  });
  login = (request: Request) => this.execute("admin.login", async () => {
    this.auth.csrf(request);
    this.limiter.check(`login:${this.ip(request)}`, 10, 15 * 60_000);
    const input = loginSchema.parse(await jsonBody(request));
    const cookie = await this.auth.login(input.email, input.password);
    return this.json({ authenticated: true }, 200, { "Set-Cookie": cookie });
  });
  logout = (request: Request) => this.execute("admin.logout", async () => {
    this.auth.csrf(request);
    this.auth.requireAdmin(request);
    return this.json({ authenticated: false }, 200, { "Set-Cookie": this.auth.cookie(ADMIN_COOKIE, "", 0) });
  });
  adminList = (request: Request) => this.execute("admin.list", async () => {
    const admin = this.auth.requireAdmin(request);
    this.limiter.check(`admin-list:${admin.sub}`, 30);
    return this.json(await this.service.adminList());
  });
  adminDetails = (request: Request, context: IdContext) => this.execute("admin.details", async () => {
    const admin = this.auth.requireAdmin(request);
    this.limiter.check(`admin-details:${admin.sub}`, 60);
    return this.json(await this.service.adminDetails(await idFrom(context), admin));
  });
  decide = (request: Request, context: IdContext) => this.execute("admin.decision", async () => {
    this.auth.csrf(request);
    const admin = this.auth.requireAdmin(request);
    this.limiter.check(`decision:${admin.sub}`, 30);
    const { decision, remarks } = decisionSchema.parse(await jsonBody(request));
    return this.json(await this.service.decide(await idFrom(context), decision, remarks, admin));
  });
  payment = (request: Request) => this.execute("payment.instructions", async () => {
    this.limiter.check(`payment:${this.ip(request)}`, 60);
    const ids = (new URL(request.url).searchParams.get("events") || "").split(",");
    const selected = events.filter((event) => ids.includes(event.id));
    if (!selected.length || ids.length !== selected.length || selected.some((event) => getConflictingEvent(event, ids))) throw new HttpError(400, "Select valid, non-overlapping events.");
    assertPaymentConfigured(this.config);
    const amount = selected.reduce((sum, event) => sum + event.fee, 0);
    const query = new URLSearchParams({ pa: this.config.payment.upiId, pn: this.config.payment.payeeName, am: amount.toFixed(2), cu: "INR", tn: "technIEEEks26 Phase 3 Registration" });
    const upiUrl = `upi://pay?${query}`;
    return this.json({ amount, upiId: this.config.payment.upiId, payeeName: this.config.payment.payeeName, upiUrl, qrDataUrl: await QRCode.toDataURL(upiUrl, { width: 300, margin: 2, errorCorrectionLevel: "M" }) });
  });
}
