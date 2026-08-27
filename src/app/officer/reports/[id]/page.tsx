import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { CaseDetailClient } from "@/components/case/case-detail-client";

export const dynamic = "force-dynamic";

export default async function OfficerCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["officer", "admin", "super_admin"].includes(profile.role)) notFound();

  const { data: report } = await supabase.from("reports").select("*").eq("id", id).single();
  if (!report) notFound();

  const [{ data: category }, { data: notes }, { data: history }, { data: evidence }, { data: officers }, { data: duplicates }] =
    await Promise.all([
      supabase.from("violation_categories").select("*").eq("id", report.category_id).single(),
      supabase
        .from("report_notes")
        .select("*, profiles:author_id(full_name)")
        .eq("report_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("report_status_history")
        .select("*, profiles:changed_by(full_name)")
        .eq("report_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("report_evidence").select("*").eq("report_id", id),
      profile.role !== "officer"
        ? supabase.from("profiles").select("id, full_name, district, is_active").eq("role", "officer").eq("is_active", true)
        : Promise.resolve({ data: null }),
      supabase
        .from("report_duplicate_suggestions")
        .select("*, candidate:candidate_report_id(report_code)")
        .eq("report_id", id)
        .eq("status", "pending")
        .order("score", { ascending: false }),
    ]);

  const allCategories = (await supabase.from("violation_categories").select("id, slug, name_en").eq("is_active", true)).data ?? [];

  return (
    <>
      <Navbar />
      <main id="main-content" className="container py-10">
        <CaseDetailClient
          report={report}
          category={category ?? null}
          notes={notes ?? []}
          history={history ?? []}
          evidence={evidence ?? []}
          officers={officers ?? []}
          duplicates={duplicates ?? []}
          allCategories={allCategories}
          currentUserId={user.id}
          currentRole={profile.role as "officer" | "admin" | "super_admin"}
        />
      </main>
      <Footer />
    </>
  );
}
