import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/case/badges";
import { type ReportStatus } from "@/lib/types";
import { FileText, ShieldAlert, Users, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [{ data: statusCounts }, { data: districtCounts }, { data: recent }, { data: spamPending }, { count: officerCount }] =
    await Promise.all([
      supabase.from("report_status_counts").select("*"),
      supabase.from("report_district_counts").select("*").limit(5),
      supabase
        .from("reports")
        .select("id, report_code, status, priority, district, created_at, violation_categories!reports_category_id_fkey(name_en)")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("spam_flags").select("id").eq("status", "pending"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "officer"),
    ]);

  const totalReports = statusCounts?.reduce((sum, s) => sum + Number(s.count), 0) ?? 0;
  const openReports = statusCounts
    ?.filter((s) => !["closed", "rejected", "duplicate"].includes(s.status))
    .reduce((sum, s) => sum + Number(s.count), 0) ?? 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label="Total reports" value={totalReports} />
        <StatCard icon={FileText} label="Open cases" value={openReports} />
        <StatCard icon={Users} label="Active officers" value={officerCount ?? 0} />
        <StatCard icon={ShieldAlert} label="Pending spam reviews" value={spamPending?.length ?? 0} href="/admin/spam" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <p className="mb-4 text-sm font-semibold">Reports by status</p>
            <div className="space-y-2">
              {statusCounts?.map((s) => (
                <div key={s.status} className="flex items-center justify-between">
                  <StatusBadge status={s.status as ReportStatus} />
                  <span className="text-sm font-medium">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4" /> Top districts</p>
            <div className="space-y-2">
              {districtCounts?.map((d) => (
                <div key={d.district} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{d.district}</span>
                  <span className="font-medium">{d.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Recent reports</p>
          <Link href="/admin/reports" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        <div className="space-y-2">
          {recent?.map((r: any) => (
            <Link key={r.id} href={`/officer/reports/${r.id}`}>
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{r.report_code}</p>
                    <p className="text-sm text-muted-foreground">{r.violation_categories?.name_en} · {r.district ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={r.priority} />
                    <StatusBadge status={r.status} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, href }: { icon: any; label: string; value: number; href?: string }) {
  const content = (
    <Card className={href ? "transition-colors hover:border-primary/50" : ""}>
      <CardContent className="p-5">
        <Icon className="h-5 w-5 text-primary" />
        <p className="mt-3 font-display text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
