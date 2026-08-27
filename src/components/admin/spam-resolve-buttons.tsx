"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { resolveSpamFlag } from "@/app/admin/actions";
import { Loader2, Check, X } from "lucide-react";

export function SpamResolveButtons({ flagId }: { flagId: string }) {
  const [pending, startTransition] = useTransition();
  const [resolved, setResolved] = useState<"confirmed_spam" | "dismissed" | null>(null);

  function resolve(resolution: "confirmed_spam" | "dismissed") {
    startTransition(async () => {
      const res = await resolveSpamFlag({ flagId, resolution });
      if (res.ok) setResolved(resolution);
    });
  }

  if (resolved) {
    return <span className="text-sm text-muted-foreground">{resolved === "confirmed_spam" ? "Confirmed as spam" : "Dismissed"}</span>;
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="destructive" onClick={() => resolve("confirmed_spam")} disabled={pending}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Confirm Spam
      </Button>
      <Button size="sm" variant="outline" onClick={() => resolve("dismissed")} disabled={pending}>
        <X className="h-3.5 w-3.5" /> Dismiss
      </Button>
    </div>
  );
}
