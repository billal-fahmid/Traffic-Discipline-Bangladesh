import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { ReportDetailClient } from "@/components/dashboard/report-detail-client";

export const dynamic = "force-dynamic";

export default async function CitizenReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/dashboard/reports/${id}`);

  const { data: report } = await supabase.from("reports").select("*").eq("id", id).single();
  if (!report || report.reporter_id !== user.id) notFound();

  const [{ data: category }, { data: categories }] = await Promise.all([
    supabase.from("violation_categories").select("id, name_en").eq("id", report.category_id).single(),
    supabase.from("violation_categories").select("id, name_en").eq("is_active", true).order("sort_order"),
  ]);

  return (
    <>
      <Navbar />
      <main id="main-content" className="container py-10">
        <ReportDetailClient report={report} category={category ?? null} categories={categories ?? []} />
      </main>
      <Footer />
    </>
  );
}
