import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PriorityBadge } from "@/components/case/badges";
import { QuickAssignRow } from "@/components/admin/quick-assign-row";

export const dynamic = "force-dynamic";

export default async function AdminAssignmentsPage() {
  const supabase = await createClient();

  const [{ data: unassigned }, { data: officers }] = await Promise.all([
    supabase
      .from("reports")
      .select("id, report_code, priority, district, created_at, violation_categories!reports_category_id_fkey(name_en)")
      .is("officer_id", null)
      .not("status", "in", "(closed,rejected,duplicate)")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(100),
    supabase.from("profiles").select("id, full_name, district").eq("role", "officer").eq("is_active", true),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Report Assignment</h1>
        <p className="mt-1 text-muted-foreground">Unassigned reports, ordered by priority then age.</p>
      </div>

      {!unassigned || unassigned.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nothing waiting — every open report is assigned.</CardContent></Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>District</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Filed</TableHead>
              <TableHead>Assign to</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unassigned.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell><Link href={`/officer/reports/${r.id}`} className="font-medium text-primary hover:underline">{r.report_code}</Link></TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.violation_categories?.name_en ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.district ?? "—"}</TableCell>
                <TableCell><PriorityBadge priority={r.priority} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                <TableCell><QuickAssignRow reportId={r.id} officers={officers ?? []} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
