import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, hashIp } from "@/lib/rate-limit";

describe("rate-limit", () => {
  it("allows requests under the configured limit", async () => {
    const identity = `test-${crypto.randomUUID()}`;
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(identity, "report_submit");
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks requests once the limit is exceeded", async () => {
    const identity = `test-${crypto.randomUUID()}`;
    // report_submit's limit is 5/hour — the 6th call in the same window should be blocked.
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(identity, "report_submit");
    }
    const sixth = await checkRateLimit(identity, "report_submit");
    expect(sixth.allowed).toBe(false);
  });

  it("tracks each identity independently", async () => {
    const idA = `test-a-${crypto.randomUUID()}`;
    const idB = `test-b-${crypto.randomUUID()}`;
    for (let i = 0; i < 5; i++) await checkRateLimit(idA, "report_submit");

    const blockedA = await checkRateLimit(idA, "report_submit");
    const allowedB = await checkRateLimit(idB, "report_submit");

    expect(blockedA.allowed).toBe(false);
    expect(allowedB.allowed).toBe(true);
  });

  it("tracks each action independently for the same identity", async () => {
    const identity = `test-${crypto.randomUUID()}`;
    for (let i = 0; i < 5; i++) await checkRateLimit(identity, "report_submit");

    const submitBlocked = await checkRateLimit(identity, "report_submit");
    const trackStillAllowed = await checkRateLimit(identity, "track_lookup");

    expect(submitBlocked.allowed).toBe(false);
    expect(trackStillAllowed.allowed).toBe(true);
  });
});

describe("hashIp", () => {
  it("never returns the raw input", async () => {
    const raw = "203.0.113.42";
    const hashed = await hashIp(raw);
    expect(hashed).not.toBe(raw);
    expect(hashed).not.toContain(raw);
  });

  it("is deterministic for the same input", async () => {
    const a = await hashIp("203.0.113.42");
    const b = await hashIp("203.0.113.42");
    expect(a).toBe(b);
  });

  it("produces different hashes for different inputs", async () => {
    const a = await hashIp("203.0.113.42");
    const b = await hashIp("203.0.113.43");
    expect(a).not.toBe(b);
  });

  it("returns a hex string", async () => {
    const hashed = await hashIp("203.0.113.42");
    expect(hashed).toMatch(/^[a-f0-9]+$/);
  });
});
