import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { Card, CardContent } from "@/components/ui/card";
import { CommonViolationsChart, VehicleTypeChart } from "@/components/insights/public-dashboard-charts";
import type { PublicDashboardStats } from "@/lib/types";
import { FileText, ShieldCheck, CalendarDays, CalendarRange, Bus, ParkingCircleOff, Map as MapIcon } from "lucide-react";

export const revalidate = 60; // ISR: aggregate public stats refresh at most once a minute — no need to hit the DB on every request.

export default async function InsightsPage() {
  const supabase = await createPublicClient();
  const { data } = await supabase.rpc("get_public_dashboard_stats");
  const stats = (data ?? {
    total_reports: 0, verified_reports: 0, reports_this_week: 0, reports_this_month: 0,
    common_violations: [], vehicle_type_stats: [], bus_related_count: 0, illegal_stopping_count: 0,
  }) as PublicDashboardStats;

  const verifiedRate = stats.total_reports > 0 ? Math.round((stats.verified_reports / stats.total_reports) * 100) : 0;

  return (
    <>
      <Navbar />
      <main id="main-content" className="container py-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Public data</span>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Traffic Discipline Insights</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Aggregate statistics from citizen reports across Bangladesh. Only officer-verified
              violations are counted toward verified figures — individual reporters and vehicle
              owners are never identified here.
            </p>
          </div>
          <Link href="/map" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            <MapIcon className="h-4 w-4" /> View the traffic map →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={FileText} label="Total Reports" value={stats.total_reports} />
          <StatCard icon={ShieldCheck} label="Verified Reports" value={stats.verified_reports} sub={`${verifiedRate}% of total`} />
          <StatCard icon={CalendarDays} label="Reports This Week" value={stats.reports_this_week} />
          <StatCard icon={CalendarRange} label="Reports This Month" value={stats.reports_this_month} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card className="border-primary/30 bg-primary/[0.03]">
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Bus className="h-5 w-5" /></span>
              <div>
                <p className="font-display text-2xl font-bold">{stats.bus_related_count}</p>
                <p className="text-sm text-muted-foreground">Bus-related violations (verified)</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/30 bg-primary/[0.03]">
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><ParkingCircleOff className="h-5 w-5" /></span>
              <div>
                <p className="font-display text-2xl font-bold">{stats.illegal_stopping_count}</p>
                <p className="text-sm text-muted-foreground">Illegal stopping incidents (verified)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <p className="mb-1 font-semibold">Common Violations</p>
              <p className="mb-4 text-sm text-muted-foreground">All reports, by category</p>
              {stats.common_violations.length > 0 ? (
                <CommonViolationsChart data={stats.common_violations} />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">No data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="mb-1 font-semibold">Vehicle-Type Statistics</p>
              <p className="mb-4 text-sm text-muted-foreground">Verified violations by vehicle type</p>
              {stats.vehicle_type_stats.length > 0 ? (
                <VehicleTypeChart data={stats.vehicle_type_stats} />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">No data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <Icon className="h-5 w-5 text-primary" />
        <p className="mt-3 font-display text-3xl font-bold">{value.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
