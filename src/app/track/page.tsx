"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trackReport, type TrackResult } from "./actions";
import { CITIZEN_STAGE_LABEL, CITIZEN_STAGE_ORDER, toCitizenStage, type ReportStatus } from "@/lib/types";
import { Loader2, Search, CheckCircle2, Circle } from "lucide-react";

function TrackForm() {
  const params = useSearchParams();
  const [reportCode, setReportCode] = useState(params.get("code") ?? "");
  const [trackingToken, setTrackingToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await trackReport({ reportCode, trackingToken });
    setResult(res);
    setLoading(false);
  }

  const report = result?.ok ? result.report : null;
  const stage = report ? toCitizenStage(report.status as ReportStatus) : null;
  const currentIndex = stage ? CITIZEN_STAGE_ORDER.indexOf(stage) : -1;
  const isTerminalSideBranch = stage === "rejected";

  return (
    <div className="mx-auto max-w-xl">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">Track Your Report</h1>
        <p className="mt-2 text-muted-foreground">
          Enter the report code and tracking token you received at submission.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reportCode">Report code</Label>
          <Input
            id="reportCode"
            placeholder="TDB-2026-483920"
            value={reportCode}
            onChange={(e) => setReportCode(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trackingToken">Tracking token</Label>
          <Input
            id="trackingToken"
            placeholder="Paste your tracking token"
            value={trackingToken}
            onChange={(e) => setTrackingToken(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Track Report
        </Button>
      </form>

      {result && !result.ok && (
        <p role="alert" aria-live="assertive" className="mt-6 rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
          {result.error}
        </p>
      )}

      {report && (
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-bold">{report.report_code}</span>
              <Badge variant={isTerminalSideBranch ? "destructive" : "secondary"}>
                {stage ? CITIZEN_STAGE_LABEL[stage] : report.status}
              </Badge>
            </div>

            <div className="mt-6 space-y-3 border-t border-border pt-6 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium">{report.category_name_en}</span></div>
              {report.district && (
                <div className="flex justify-between"><span className="text-muted-foreground">District</span><span className="font-medium">{report.district}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Filed</span><span className="font-medium">{new Date(report.created_at).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Last updated</span><span className="font-medium">{new Date(report.updated_at).toLocaleDateString()}</span></div>
            </div>

            {!isTerminalSideBranch && (
              <div className="mt-6 space-y-4 border-t border-border pt-6">
                {CITIZEN_STAGE_ORDER.map((s, i) => (
                  <div key={s} className="flex items-center gap-3">
                    {i <= currentIndex ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/40" />
                    )}
                    <span className={i <= currentIndex ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
                      {CITIZEN_STAGE_LABEL[s]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="container py-16">
        <Suspense fallback={null}>
          <TrackForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
