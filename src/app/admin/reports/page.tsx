import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge, PriorityBadge } from "@/components/case/badges";
import { REPORT_STATUS_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUSES = Object.keys(REPORT_STATUS_LABEL);

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; district?: string; q?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("reports")
    .select("id, report_code, status, priority, district, mode, created_at, violation_categories!reports_category_id_fkey(name_en)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.status) query = query.eq("status", params.status);
  if (params.district) query = query.ilike("district", `%${params.district}%`);
  if (params.q) query = query.ilike("report_code", `%${params.q.toUpperCase()}%`);

  const { data: reports } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">All Reports</h1>
        <p className="mt-1 text-muted-foreground">Every report in the system, across every officer.</p>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Search report code…"
          className="h-9 w-52 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
        />
        <input
          name="district"
          defaultValue={params.district}
          placeholder="District…"
          className="h-9 w-40 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
        />
        <select name="status" defaultValue={params.status ?? ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{REPORT_STATUS_LABEL[s as keyof typeof REPORT_STATUS_LABEL]}</option>)}
        </select>
        <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Filter</button>
        {(params.q || params.district || params.status) && (
          <Link href="/admin/reports" className="flex h-9 items-center px-3 text-sm text-muted-foreground hover:text-foreground">Clear</Link>
        )}
      </form>

      {!reports || reports.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No reports match these filters.</CardContent></Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>District</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Filed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/officer/reports/${r.id}`} className="font-medium text-primary hover:underline">{r.report_code}</Link>
                </TableCell>
                <TableCell className={cn("text-sm", r.mode === "anonymous" ? "text-muted-foreground" : "")}>
                  {r.mode === "anonymous" ? "Anonymous" : "Registered"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.violation_categories?.name_en ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.district ?? "—"}</TableCell>
                <TableCell><PriorityBadge priority={r.priority} /></TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
