import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { ReportConsole } from "@/components/officer/report-console";

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

        <ReportConsole newReports={newReports} myReports={myReports} />
      </main>
      <Footer />
    </>
  );
}
