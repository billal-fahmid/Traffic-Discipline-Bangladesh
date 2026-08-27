import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { SpamResolveButtons } from "@/components/admin/spam-resolve-buttons";

export const dynamic = "force-dynamic";

export default async function AdminSpamPage() {
  const supabase = await createClient();
  const { data: flags } = await supabase
    .from("spam_flags")
    .select("*, reports(report_code), flagger:flagged_by(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  const pending = flags?.filter((f) => f.status === "pending") ?? [];
  const resolved = flags?.filter((f) => f.status !== "pending") ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Suspicious / Spam Report Review</h1>
        <p className="mt-1 text-muted-foreground">Reports flagged by officers for manual review.</p>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold">Pending review ({pending.length})</p>
        {pending.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nothing pending review.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {pending.map((f: any) => (
              <Card key={f.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div>
                    {f.reports?.report_code && (
                      <Link href={`/officer/reports/${f.report_id}`} className="font-medium text-primary hover:underline">
                        {f.reports.report_code}
                      </Link>
                    )}
                    <p className="mt-1 text-sm text-muted-foreground">{f.reason}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Flagged by {f.flagger?.full_name ?? "an officer"} · {new Date(f.created_at).toLocaleString()}
                    </p>
                  </div>
                  <SpamResolveButtons flagId={f.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {resolved.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-semibold">Recently resolved</p>
          <div className="space-y-2">
            {resolved.slice(0, 10).map((f: any) => (
              <Card key={f.id}>
                <CardContent className="flex items-center justify-between p-4 text-sm">
                  <span>{f.reports?.report_code ?? "—"} — {f.reason}</span>
                  <span className="text-muted-foreground">
                    {f.status === "confirmed_spam" ? "Confirmed spam" : "Dismissed"}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
