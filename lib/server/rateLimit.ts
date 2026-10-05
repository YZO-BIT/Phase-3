import "server-only";
import { HttpError } from "./errors";

export class RateLimiter {
  private buckets = new Map<string, { count: number; expires: number }>();
  check(key: string, limit: number, milliseconds = 60_000) {
    const now = Date.now();
    if (this.buckets.size > 5000) for (const [key, value] of this.buckets) if (value.expires <= now) this.buckets.delete(key);
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.expires <= now) { bucket = { count: 0, expires: now + milliseconds }; this.buckets.set(key, bucket); }
    if (++bucket.count > limit) throw new HttpError(429, "Too many requests. Please wait a minute and retry.");
  }
}
