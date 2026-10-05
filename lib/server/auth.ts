import "server-only";
import { createHmac, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import type { ServerConfig } from "./config";
import { assertSessionConfigured } from "./config";
import { HttpError } from "./errors";

export const OWNER_COOKIE = "pg_participant";
export const ADMIN_COOKIE = "pg_admin_session";
const sessionSchema = z.object({ sub: z.string().min(1).max(254), role: z.enum(["participant", "admin"]), exp: z.number().int(), nonce: z.uuid() }).strict();
export type Principal = z.infer<typeof sessionSchema>;
const scryptAsync = promisify(scrypt);

function cookieValue(header: string, name: string) {
  return header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}
export class AuthService {
  constructor(private config: ServerConfig) {}
  private signature(body: string) { assertSessionConfigured(this.config); return createHmac("sha256", this.config.sessionSecret).update(body).digest(); }
  private encode(principal: Principal) {
    const body = Buffer.from(JSON.stringify(principal)).toString("base64url");
    return `${body}.${this.signature(body).toString("base64url")}`;
  }
  read(request: Request, role: Principal["role"]): Principal | null {
    const token = cookieValue(request.headers.get("cookie") || "", role === "admin" ? ADMIN_COOKIE : OWNER_COOKIE);
    if (!token) return null;
    if (token.length > 2000) return null;
    const parts = token.split(".");
    if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return null;
    const supplied = Buffer.from(parts[1], "base64url");
    if (!timingSafeEqual(this.signature(parts[0]), supplied)) return null;
    try {
      const principal = sessionSchema.parse(JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")));
      if (principal.role !== role || principal.exp <= Date.now() / 1000 || (role === "admin" && principal.sub !== this.config.admin.email)) return null;
      return principal;
    } catch { return null; }
  }
  requireAdmin(request: Request) {
    const principal = this.read(request, "admin");
    if (!principal) throw new HttpError(401, "Administrator authentication required.");
    return principal;
  }
  requireReader(request: Request) {
    const principal = this.read(request, "admin") || this.read(request, "participant");
    if (!principal) throw new HttpError(401, "Use the browser that submitted this registration, or sign in as an administrator.");
    return principal;
  }
  owner(request: Request) {
    const principal = this.read(request, "participant") || { sub: randomUUID(), role: "participant" as const, exp: Math.floor(Date.now() / 1000) + 30 * 86400, nonce: randomUUID() };
    return { principal, cookie: this.cookie(OWNER_COOKIE, this.encode(principal), 30 * 86400) };
  }
  csrf(request: Request) {
    if (request.headers.get("origin") !== this.config.appUrl || request.headers.get("sec-fetch-site") === "cross-site") throw new HttpError(403, "Cross-site request denied.");
  }
  cookie(name: string, value: string, maxAge: number) {
    return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${this.config.appUrl.startsWith("https:") ? "; Secure" : ""}`;
  }
  async login(email: string, password: string) {
    assertSessionConfigured(this.config);
    const match = this.config.admin.passwordHash.match(/^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/);
    if (!match || !this.config.admin.email) throw new HttpError(503, "Administrator access is not configured.");
    const actual = await scryptAsync(password, match[1], 64) as Buffer;
    if (!timingSafeEqual(actual, Buffer.from(match[2], "hex")) || email.toLowerCase() !== this.config.admin.email) throw new HttpError(401, "Incorrect administrator email or password.");
    return this.cookie(ADMIN_COOKIE, this.encode({ sub: this.config.admin.email, role: "admin", exp: Math.floor(Date.now() / 1000) + 8 * 3600, nonce: randomUUID() }), 8 * 3600);
  }
}
