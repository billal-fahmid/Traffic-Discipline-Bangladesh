"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Copy, Check, ShieldAlert } from "lucide-react";

export function ReportSuccess({
  reportCode,
  trackingToken,
}: {
  reportCode: string;
  trackingToken: string;
}) {
  const [copied, setCopied] = useState<"code" | "token" | null>(null);

  function copy(text: string, which: "code" | "token") {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h1 className="mt-6 font-display text-2xl font-bold">Report submitted</h1>
      <p className="mt-2 text-muted-foreground">
        Thank you — this helps keep the road safer. Save the details below to track your report.
      </p>

      <Card className="mt-8 text-left">
        <CardContent className="space-y-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Report code</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-display text-xl font-bold tracking-tight">{reportCode}</span>
              <Button variant="ghost" size="icon" onClick={() => copy(reportCode, "code")} aria-label="Copy report code">
                {copied === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tracking token</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-mono text-sm">{trackingToken}</span>
              <Button variant="ghost" size="icon" onClick={() => copy(trackingToken, "token")} aria-label="Copy tracking token">
                {copied === "token" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-secondary/60 p-3 text-left text-xs text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        Both the report code and tracking token are required to look this report up — save them
        somewhere safe. They won't be shown again.
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href={`/track?code=${encodeURIComponent(reportCode)}`}>Track This Report</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
