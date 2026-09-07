"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CommonViolationsChart, VehicleTypeChart } from "@/components/insights/public-dashboard-charts";
import { useLanguage } from "@/lib/i18n/language-context";
import type { PublicDashboardStats } from "@/lib/types";
import { FileText, ShieldCheck, CalendarDays, CalendarRange, Bus, ParkingCircleOff, Map as MapIcon } from "lucide-react";

export function InsightsContent({ stats }: { stats: PublicDashboardStats }) {
  const { t } = useLanguage();
  const i = t.insights;
  const verifiedRate = stats.total_reports > 0 ? Math.round((stats.verified_reports / stats.total_reports) * 100) : 0;

  return (
    <>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">{i.kicker}</span>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">{i.title}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{i.subtitle}</p>
        </div>
        <Link href="/map" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <MapIcon className="h-4 w-4" /> {i.viewMap} →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label={i.totalReports} value={stats.total_reports} />
        <StatCard icon={ShieldCheck} label={i.verifiedReports} value={stats.verified_reports} sub={`${verifiedRate}% ${i.ofTotal}`} />
        <StatCard icon={CalendarDays} label={i.reportsThisWeek} value={stats.reports_this_week} />
        <StatCard icon={CalendarRange} label={i.reportsThisMonth} value={stats.reports_this_month} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="border-primary/30 bg-primary/[0.03]">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Bus className="h-5 w-5" /></span>
            <div>
              <p className="font-display text-2xl font-bold">{stats.bus_related_count}</p>
              <p className="text-sm text-muted-foreground">{i.busRelated}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/[0.03]">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><ParkingCircleOff className="h-5 w-5" /></span>
            <div>
              <p className="font-display text-2xl font-bold">{stats.illegal_stopping_count}</p>
              <p className="text-sm text-muted-foreground">{i.illegalStopping}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <p className="mb-1 font-semibold">{i.commonViolationsTitle}</p>
            <p className="mb-4 text-sm text-muted-foreground">{i.commonViolationsSub}</p>
            {stats.common_violations.length > 0 ? (
              <CommonViolationsChart data={stats.common_violations} />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">{i.noData}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="mb-1 font-semibold">{i.vehicleTypeTitle}</p>
            <p className="mb-4 text-sm text-muted-foreground">{i.vehicleTypeSub}</p>
            {stats.vehicle_type_stats.length > 0 ? (
              <VehicleTypeChart data={stats.vehicle_type_stats} />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">{i.noData}</p>
            )}
          </CardContent>
        </Card>
      </div>
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
