import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge, PriorityBadge } from "@/components/case/badges";
import { Inbox, ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OfficerDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: newReports }, { data: myReports }] = await Promise.all([
    supabase
      .from("reports")
      .select("id, report_code, status, priority, district, created_at, violation_categories!reports_category_id_fkey(name_en)")
      .is("officer_id", null)
      .in("status", ["submitted", "received"])
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(50),
    supabase
      .from("reports")
      .select("id, report_code, status, priority, district, created_at, violation_categories!reports_category_id_fkey(name_en)")
      .eq("officer_id", user!.id)
      .not("status", "in", "(closed,rejected,duplicate)")
      .order("priority", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <>
      <Navbar />
      <main id="main-content" className="container py-12">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold">Officer Console</h1>
          <p className="mt-1 text-muted-foreground">Review new reports and manage your assigned cases.</p>
        </div>

        <Tabs defaultValue="new">
          <TabsList>
            <TabsTrigger value="new">
              <Inbox className="mr-1.5 h-4 w-4" /> New Reports ({newReports?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="mine">
              <ClipboardList className="mr-1.5 h-4 w-4" /> My Cases ({myReports?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new">
            <ReportTable rows={newReports} emptyLabel="No new reports waiting right now." />
          </TabsContent>
          <TabsContent value="mine">
            <ReportTable rows={myReports} emptyLabel="You have no active assigned cases." />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </>
  );
}

function ReportTable({ rows, emptyLabel }: { rows: any[] | null; emptyLabel: string }) {
  if (!rows || rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">{emptyLabel}</CardContent>
      </Card>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Report</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>District</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Filed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>
              <Link href={`/officer/reports/${r.id}`} className="font-medium text-primary hover:underline">
                {r.report_code}
              </Link>
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
  );
}
