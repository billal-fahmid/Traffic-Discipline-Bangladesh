"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trackReport, type TrackResult } from "./actions";
import { CITIZEN_STAGE_ORDER, TERMINAL_STATUSES, toCitizenStage, type ReportStatus } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/language-context";
import { Loader2, Search, CheckCircle2, Circle, RefreshCw } from "lucide-react";

// Live-tracking poll interval. The lookup RPC is rate-limited to 15 calls per
// 10 minutes per IP (see rate-limit.ts), so this must stay well under that
// while a form submit + occasional manual refresh also shares the budget.
const AUTO_REFRESH_MS = 45_000;

function TrackForm() {
  const { t } = useLanguage();
  const params = useSearchParams();
  const [reportCode, setReportCode] = useState(params.get("code") ?? "");
  const [trackingToken, setTrackingToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const credsRef = useRef({ reportCode: "", trackingToken: "" });

  async function lookup(code: string, token: string, showSpinner: boolean) {
    if (showSpinner) setLoading(true);
    const res = await trackReport({ reportCode: code, trackingToken: token });
    setResult(res);
    setLastCheckedAt(new Date());
    if (showSpinner) setLoading(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    credsRef.current = { reportCode, trackingToken };
    await lookup(reportCode, trackingToken, true);
  }

  const report = result?.ok ? result.report : null;
  const stage = report ? toCitizenStage(report.status as ReportStatus) : null;
  const currentIndex = stage ? CITIZEN_STAGE_ORDER.indexOf(stage) : -1;
  const isTerminalSideBranch = stage === "rejected";
  const isSettled = report ? TERMINAL_STATUSES.includes(report.status as ReportStatus) : false;

  // Real-time-ish tracking: once a lookup succeeds, keep silently re-polling
  // in the background so status changes made by an officer show up without
  // the citizen re-entering their code and token. Stops once the report
  // reaches a terminal status, or the tab is hidden, to save the rate budget.
  useEffect(() => {
    if (!result?.ok || isSettled) return;
    const interval = setInterval(() => {
      if (document.hidden) return;
      const { reportCode: code, trackingToken: token } = credsRef.current;
      if (code && token) lookup(code, token, false);
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.ok, isSettled]);

  return (
    <div className="mx-auto max-w-xl">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">{t.track.title}</h1>
        <p className="mt-2 text-muted-foreground">{t.track.subtitle}</p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reportCode">{t.track.reportCodeLabel}</Label>
          <Input
            id="reportCode"
            placeholder="TDB-2026-483920"
            value={reportCode}
            onChange={(e) => setReportCode(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trackingToken">{t.track.trackingTokenLabel}</Label>
          <Input
            id="trackingToken"
            placeholder={t.track.trackingTokenPlaceholder}
            value={trackingToken}
            onChange={(e) => setTrackingToken(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {t.track.submit}
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
                {stage ? t.track.stages[stage] : report.status}
              </Badge>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              {isSettled ? (
                <span>{t.track.closedNote}</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  {t.track.liveNote}
                </span>
              )}
              <button
                type="button"
                onClick={() => lookup(credsRef.current.reportCode, credsRef.current.trackingToken, true)}
                disabled={loading}
                className="flex items-center gap-1 hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                {lastCheckedAt ? `${t.track.checkedPrefix} ${lastCheckedAt.toLocaleTimeString()}` : t.track.refresh}
              </button>
            </div>

            <div className="mt-4 space-y-3 border-t border-border pt-6 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t.track.category}</span><span className="font-medium">{report.category_name_en}</span></div>
              {report.district && (
                <div className="flex justify-between"><span className="text-muted-foreground">{t.track.district}</span><span className="font-medium">{report.district}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">{t.track.filed}</span><span className="font-medium">{new Date(report.created_at).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t.track.lastUpdated}</span><span className="font-medium">{new Date(report.updated_at).toLocaleDateString()}</span></div>
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
                      {t.track.stages[s]}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {report.resolution_summary && (
              <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t.track.actionTaken}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{report.resolution_summary}</p>
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
