import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { REPORT_STATUS_LABEL } from "@/lib/types";
import { dailyTrend, weeklyTrend, monthlyTrend } from "@/lib/analytics";
import { TrendChart, DistributionChart, VerifiedVsRejectedChart } from "@/components/admin/analytics-charts";

export const dynamic = "force-dynamic";

const CONFIRMED = new Set(["verified", "assigned", "action_recommended", "action_taken", "closed"]);
const STATUSES = Object.keys(REPORT_STATUS_LABEL);

interface Filters {
  dateFrom?: string;
  dateTo?: string;
  district?: string;
  location?: string;
  category?: string;
  vehicleType?: string;
  status?: string;
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase.from("violation_categories").select("id, slug, name_en").order("sort_order");

  let query = supabase
    .from("reports")
    .select("created_at, status, category_id, vehicle_type, is_illegal_stoppage, district, location_label")
    .order("created_at", { ascending: false })
    .limit(8000);

  if (params.dateFrom) query = query.gte("created_at", params.dateFrom);
  if (params.dateTo) query = query.lte("created_at", `${params.dateTo}T23:59:59`);
  if (params.district) query = query.ilike("district", `%${params.district}%`);
  if (params.location) query = query.ilike("location_label", `%${params.location}%`);
  if (params.vehicleType) query = query.ilike("vehicle_type", `%${params.vehicleType}%`);
  if (params.status) query = query.eq("status", params.status);
  if (params.category) {
    const cat = categories?.find((c) => c.slug === params.category);
    if (cat) query = query.eq("category_id", cat.id);
  }

  const { data: reports } = await query;
  const rows = reports ?? [];
  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));

  const allDates = rows.map((r) => r.created_at);
  const busDates = rows
    .filter((r) => categoryById.get(r.category_id)?.slug === "illegal-bus-stoppage" || (r.vehicle_type ?? "").toLowerCase().includes("bus"))
    .map((r) => r.created_at);
  const stoppingDates = rows.filter((r) => r.is_illegal_stoppage).map((r) => r.created_at);

  const verifiedCount = rows.filter((r) => CONFIRMED.has(r.status)).length;
  const rejectedCount = rows.filter((r) => r.status === "rejected").length;
  const duplicateCount = rows.filter((r) => r.status === "duplicate").length;
  const pendingCount = rows.length - verifiedCount - rejectedCount - duplicateCount;

  const distributionMap = new Map<string, number>();
  for (const r of rows) {
    const name = categoryById.get(r.category_id)?.name_en ?? "Uncategorized";
    distributionMap.set(name, (distributionMap.get(name) ?? 0) + 1);
  }
  const distribution = Array.from(distributionMap, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  const hasFilters = Object.values(params).some(Boolean);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Admin Analytics</h1>
        <p className="mt-1 text-muted-foreground">{rows.length.toLocaleString()} reports match the current filters.</p>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <input type="date" name="dateFrom" defaultValue={params.dateFrom} className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm" />
        <input type="date" name="dateTo" defaultValue={params.dateTo} className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm" />
        <input name="district" defaultValue={params.district} placeholder="District…" className="h-9 w-36 rounded-md border border-input bg-background px-3 text-sm shadow-sm" />
        <input name="location" defaultValue={params.location} placeholder="Location / landmark…" className="h-9 w-44 rounded-md border border-input bg-background px-3 text-sm shadow-sm" />
        <select name="category" defaultValue={params.category ?? ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm">
          <option value="">All violations</option>
          {categories?.map((c) => <option key={c.slug} value={c.slug}>{c.name_en}</option>)}
        </select>
        <input name="vehicleType" defaultValue={params.vehicleType} placeholder="Vehicle type…" className="h-9 w-36 rounded-md border border-input bg-background px-3 text-sm shadow-sm" />
        <select name="status" defaultValue={params.status ?? ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{REPORT_STATUS_LABEL[s as keyof typeof REPORT_STATUS_LABEL]}</option>)}
        </select>
        <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Filter</button>
        {hasFilters && <Link href="/admin/analytics" className="flex h-9 items-center px-3 text-sm text-muted-foreground hover:text-foreground">Clear</Link>}
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <p className="mb-1 font-semibold">Daily Reports</p>
            <p className="mb-4 text-sm text-muted-foreground">Last 30 days</p>
            <TrendChart data={dailyTrend(allDates, 30)} label="Reports" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="mb-1 font-semibold">Weekly Reports</p>
            <p className="mb-4 text-sm text-muted-foreground">Last 12 weeks</p>
            <TrendChart data={weeklyTrend(allDates, 12)} label="Reports" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="mb-1 font-semibold">Monthly Reports</p>
            <p className="mb-4 text-sm text-muted-foreground">Last 12 months</p>
            <TrendChart data={monthlyTrend(allDates, 12)} label="Reports" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="mb-1 font-semibold">Verified vs Rejected</p>
            <p className="mb-4 text-sm text-muted-foreground">Outcome breakdown for filtered reports</p>
            <VerifiedVsRejectedChart verified={verifiedCount} rejected={rejectedCount} pending={pendingCount} duplicate={duplicateCount} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <p className="mb-1 font-semibold">Violation Distribution</p>
            <p className="mb-4 text-sm text-muted-foreground">By category, filtered reports</p>
            {distribution.length > 0 ? <DistributionChart data={distribution} /> : <p className="py-12 text-center text-sm text-muted-foreground">No data yet.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="mb-1 font-semibold">Bus Violation Trend</p>
            <p className="mb-4 text-sm text-muted-foreground">Bus-category or bus-tagged vehicle reports, last 12 months</p>
            <TrendChart data={monthlyTrend(busDates, 12)} label="Bus violations" color="#0891b2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="mb-1 font-semibold">Illegal Stopping Trend</p>
            <p className="mb-4 text-sm text-muted-foreground">Reports flagged as illegal stoppage, last 12 months</p>
            <TrendChart data={monthlyTrend(stoppingDates, 12)} label="Illegal stoppings" color="#d92b3f" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
