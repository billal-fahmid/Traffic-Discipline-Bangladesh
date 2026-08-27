/**
 * Sliding-window rate limiter. Uses Upstash Redis when configured
 * (recommended for serverless deployments where each invocation gets
 * a fresh process), and falls back to an in-memory map for local dev.
 *
 * Applied to: anonymous report submission, evidence upload requests,
 * and the anonymous tracking lookup endpoint.
 */

type WindowConfig = { limit: number; windowSeconds: number };

const WINDOWS: Record<string, WindowConfig> = {
  report_submit: { limit: 5, windowSeconds: 60 * 60 }, // 5 reports / hour / identity
  evidence_upload: { limit: 20, windowSeconds: 60 * 60 },
  track_lookup: { limit: 15, windowSeconds: 60 * 10 },
  officer_action: { limit: 120, windowSeconds: 60 * 60 }, // generous — guards against a compromised session/script, not normal case work
};

const memoryStore = new Map<string, number[]>();

function checkInMemory(key: string, cfg: WindowConfig) {
  const now = Date.now();
  const windowMs = cfg.windowSeconds * 1000;
  const hits = (memoryStore.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  memoryStore.set(key, hits);
  return { allowed: hits.length <= cfg.limit, remaining: Math.max(0, cfg.limit - hits.length) };
}

async function checkUpstash(key: string, cfg: WindowConfig) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  // Fixed-window counter via Upstash REST pipeline: INCR + EXPIRE (NX).
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, cfg.windowSeconds.toString(), "NX"],
    ]),
  });
  if (!res.ok) return null;
  const [{ result: count }] = (await res.json()) as { result: number }[];
  return { allowed: count <= cfg.limit, remaining: Math.max(0, cfg.limit - count) };
}

/**
 * @param identity e.g. `ip:<sha256-hash>` for anonymous or `user:<uuid>` for registered
 * @param action one of the WINDOWS keys
 */
export async function checkRateLimit(identity: string, action: keyof typeof WINDOWS) {
  const cfg = WINDOWS[action];
  const key = `ratelimit:${action}:${identity}`;

  const upstashResult = await checkUpstash(key, cfg).catch(() => null);
  if (upstashResult) return upstashResult;

  return checkInMemory(key, cfg);
}

/** Hash an IP address so raw IPs never touch the database (see submitted_ip_hash). */
export async function hashIp(ip: string) {
  const enc = new TextEncoder().encode(ip + (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "salt"));
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
