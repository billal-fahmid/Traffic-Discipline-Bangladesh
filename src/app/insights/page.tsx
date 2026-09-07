import { createPublicClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { InsightsContent } from "@/components/insights/insights-content";
import type { PublicDashboardStats } from "@/lib/types";

// Rendered on demand (not prerendered at build): it reads live aggregate
// stats and needs the Supabase env, which may not exist at build time.
export const dynamic = "force-dynamic";

const EMPTY_STATS: PublicDashboardStats = {
  total_reports: 0, verified_reports: 0, reports_this_week: 0, reports_this_month: 0,
  common_violations: [], vehicle_type_stats: [], bus_related_count: 0, illegal_stopping_count: 0,
};

async function loadStats(): Promise<PublicDashboardStats> {
  try {
    const supabase = await createPublicClient();
    const { data } = await supabase.rpc("get_public_dashboard_stats");
    return (data ?? EMPTY_STATS) as PublicDashboardStats;
  } catch {
    return EMPTY_STATS;
  }
}

export default async function InsightsPage() {
  const stats = await loadStats();

  return (
    <>
      <Navbar />
      <main id="main-content" className="container py-12">
        <InsightsContent stats={stats} />
      </main>
      <Footer />
    </>
  );
}
