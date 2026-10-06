import "server-only";
import { HttpError } from "./errors";

const MAX_BUCKETS = 10_000;
const EVICT_INTERVAL = 1_000;

export class RateLimiter {
  private buckets = new Map<string, { count: number; expires: number }>();
  private callsSinceEvict = 0;
  check(key: string, limit: number, milliseconds = 60_000) {
    const now = Date.now();
    if (++this.callsSinceEvict >= EVICT_INTERVAL) {
      this.callsSinceEvict = 0;
      for (const [k, v] of this.buckets) if (v.expires <= now) this.buckets.delete(k);
    }
    if (this.buckets.size >= MAX_BUCKETS) {
      for (const [k, v] of this.buckets) if (v.expires <= now) this.buckets.delete(k);
    }
    if (this.buckets.size >= MAX_BUCKETS) throw new HttpError(429, "Too many requests. Please wait a minute and retry.");
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.expires <= now) { bucket = { count: 0, expires: now + milliseconds }; this.buckets.set(key, bucket); }
    if (++bucket.count > limit) throw new HttpError(429, "Too many requests. Please wait a minute and retry.");
  }
}
