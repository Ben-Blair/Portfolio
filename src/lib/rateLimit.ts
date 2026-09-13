/**
 * Crude per-IP limiter. Fine for a portfolio; swap for Upstash if this ever gets real traffic.
 *
 * Shared by every route that spends money on a model call, and deliberately one budget rather than
 * one per route: two endpoints with 20 requests each is a 40-request budget, and the cheapest way
 * around the limit on the expensive endpoint would be to take the allowance the other one wasn't
 * using. The counter is keyed on the caller, not on what they called.
 *
 * In-memory, so it resets on deploy and doesn't hold across instances. That's the "crude" part.
 */
const RATE_LIMIT = { windowMs: 60_000, max: 20 };
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    // Opportunistic cleanup so the map can't grow without bound.
    if (hits.size > 5000) {
      for (const [key, value] of hits) if (now > value.resetAt) hits.delete(key);
    }
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT.max;
}

/**
 * Who's calling, as well as it can be known.
 *
 * Vercel appends the real client IP to `x-forwarded-for`, so the first entry is whatever a client
 * chose to send — take the last one instead so it can't be spoofed to dodge the limit.
 */
export function clientIp(req: Request) {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ??
    "unknown"
  );
}
