import { describe, it, expect } from "vitest";
import { dailyTrend, weeklyTrend, monthlyTrend } from "@/lib/analytics";

describe("dailyTrend", () => {
  it("returns exactly N buckets for N days", () => {
    const result = dailyTrend([], 30);
    expect(result).toHaveLength(30);
  });

  it("counts a timestamp from today into today's bucket", () => {
    const now = new Date().toISOString();
    const result = dailyTrend([now], 7);
    const total = result.reduce((sum, r) => sum + r.count, 0);
    expect(total).toBe(1);
    expect(result[result.length - 1].count).toBe(1); // most recent bucket is last
  });

  it("excludes timestamps outside the window", () => {
    const longAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString();
    const result = dailyTrend([longAgo], 7);
    const total = result.reduce((sum, r) => sum + r.count, 0);
    expect(total).toBe(0);
  });

  it("all counts are non-negative integers", () => {
    const dates = Array.from({ length: 50 }, () => new Date().toISOString());
    const result = dailyTrend(dates, 30);
    for (const point of result) {
      expect(Number.isInteger(point.count)).toBe(true);
      expect(point.count).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("weeklyTrend", () => {
  it("returns exactly N buckets for N weeks", () => {
    expect(weeklyTrend([], 12)).toHaveLength(12);
  });

  it("counts a recent timestamp into the series", () => {
    const now = new Date().toISOString();
    const result = weeklyTrend([now], 4);
    const total = result.reduce((sum, r) => sum + r.count, 0);
    expect(total).toBe(1);
  });
});

describe("monthlyTrend", () => {
  it("returns exactly N buckets for N months", () => {
    expect(monthlyTrend([], 12)).toHaveLength(12);
  });

  it("counts a recent timestamp into the series", () => {
    const now = new Date().toISOString();
    const result = monthlyTrend([now], 6);
    const total = result.reduce((sum, r) => sum + r.count, 0);
    expect(total).toBe(1);
  });

  it("handles an empty input without throwing", () => {
    expect(() => monthlyTrend([], 12)).not.toThrow();
  });
});
