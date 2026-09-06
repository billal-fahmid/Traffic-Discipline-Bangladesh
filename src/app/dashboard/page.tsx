import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CITIZEN_STAGE_LABEL, toCitizenStage, type ReportStatus } from "@/lib/types";
import { logout } from "../(auth)/actions";
import { PushToggle } from "@/components/dashboard/push-toggle";
import { PlusCircle, FileText, Bell, LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: reports }, { data: notifications }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase
      .from("reports")
      .select("id, report_code, status, created_at, vehicle_type, resolution_summary, violation_categories!reports_category_id_fkey(name_en)")
      .eq("reporter_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", user!.id)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <>
      <Navbar />
      <main id="main-content" className="container py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h1 className="font-display text-2xl font-bold">{profile?.full_name || "Citizen"}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <PushToggle />
            <Button asChild>
              <Link href="/report"><PlusCircle className="h-4 w-4" /> New Report</Link>
            </Button>
            <form action={logout}>
              <Button type="submit" variant="outline"><LogOut className="h-4 w-4" /> Sign Out</Button>
            </form>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Your reports</h2>
            </div>
            {!reports || reports.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  You haven't filed any reports yet.
                  <div className="mt-4">
                    <Button asChild size="sm"><Link href="/report">File your first report</Link></Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reports.map((r: any) => (
                  <Card key={r.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{r.report_code}</p>
                          <p className="text-sm text-muted-foreground">
                            {r.violation_categories?.name_en ?? "—"} · {new Date(r.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary">{CITIZEN_STAGE_LABEL[toCitizenStage(r.status as ReportStatus)]}</Badge>
                      </div>
                      {r.resolution_summary && (
                        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Action Taken</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm">{r.resolution_summary}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Notifications</h2>
            </div>
            {!notifications || notifications.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">No new notifications.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <Card key={n.id}>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
