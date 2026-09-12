// WHITE Search — In-Memory Sliding Window Rate Limiter
// Protects public open-source instances from abuse, scraping, and DOS attacks.

interface RateLimitRecord {
  timestamps: number[];
}

class RateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private windowMs: number;
  private maxRequests: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(windowMs = 60 * 1000, maxRequests = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Periodic cleanup of expired records every 2 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 2 * 60 * 1000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  public check(key: string, limitOverride?: number): { success: boolean; remaining: number; reset: number } {
    const limit = limitOverride ?? this.maxRequests;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let record = this.store.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(key, record);
    }

    // Filter out timestamps older than the window
    record.timestamps = record.timestamps.filter((t) => t > windowStart);

    if (record.timestamps.length >= limit) {
      const oldest = record.timestamps[0];
      const reset = Math.ceil((oldest + this.windowMs - now) / 1000);
      return { success: false, remaining: 0, reset: Math.max(reset, 1) };
    }

    record.timestamps.push(now);
    return {
      success: true,
      remaining: limit - record.timestamps.length,
      reset: Math.ceil(this.windowMs / 1000),
    };
  }

  private cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter((t) => t > windowStart);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

// Global singletons for API endpoints
export const searchRateLimiter = new RateLimiter(60 * 1000, 60); // 60 req/min
export const suggestRateLimiter = new RateLimiter(60 * 1000, 150); // 150 req/min for typing
export const previewRateLimiter = new RateLimiter(60 * 1000, 30); // 30 req/min for heavy reads

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
