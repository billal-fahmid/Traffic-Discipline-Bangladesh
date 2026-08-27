import { format, startOfDay, startOfWeek, startOfMonth, subDays, subWeeks, subMonths, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";

export interface TrendPoint {
  label: string;
  count: number;
}

/** Buckets a list of ISO created_at timestamps into a daily series over the last N days. */
export function dailyTrend(dates: string[], days = 30): TrendPoint[] {
  const end = startOfDay(new Date());
  const start = subDays(end, days - 1);
  const buckets = new Map<string, number>();
  for (const d of eachDayOfInterval({ start, end })) buckets.set(format(d, "MMM d"), 0);

  for (const iso of dates) {
    const d = startOfDay(new Date(iso));
    if (d < start) continue;
    const key = format(d, "MMM d");
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets, ([label, count]) => ({ label, count }));
}

/** Buckets into a weekly series (week starting Monday) over the last N weeks. */
export function weeklyTrend(dates: string[], weeks = 12): TrendPoint[] {
  const end = startOfWeek(new Date(), { weekStartsOn: 1 });
  const start = subWeeks(end, weeks - 1);
  const buckets = new Map<string, number>();
  for (const d of eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })) buckets.set(format(d, "MMM d"), 0);

  for (const iso of dates) {
    const d = startOfWeek(new Date(iso), { weekStartsOn: 1 });
    if (d < start) continue;
    const key = format(d, "MMM d");
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets, ([label, count]) => ({ label, count }));
}

/** Buckets into a monthly series over the last N months. */
export function monthlyTrend(dates: string[], months = 12): TrendPoint[] {
  const end = startOfMonth(new Date());
  const start = subMonths(end, months - 1);
  const buckets = new Map<string, number>();
  for (const d of eachMonthOfInterval({ start, end })) buckets.set(format(d, "MMM yyyy"), 0);

  for (const iso of dates) {
    const d = startOfMonth(new Date(iso));
    if (d < start) continue;
    const key = format(d, "MMM yyyy");
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets, ([label, count]) => ({ label, count }));
}
