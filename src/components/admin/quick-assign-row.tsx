"use client";

import { useState, useTransition } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { assignReport } from "@/app/officer/actions";
import { Loader2, Check } from "lucide-react";

export function QuickAssignRow({ reportId, officers }: { reportId: string; officers: { id: string; full_name: string | null; district: string | null }[] }) {
  const [officerId, setOfficerId] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function assign() {
    if (!officerId) return;
    startTransition(async () => {
      const res = await assignReport({ reportId, officerId });
      if (res.ok) setDone(true);
    });
  }

  if (done) {
    return <span className="flex items-center gap-1 text-sm text-success"><Check className="h-4 w-4" /> Assigned</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={officerId} onValueChange={setOfficerId}>
        <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Choose officer" /></SelectTrigger>
        <SelectContent>
          {officers.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.full_name ?? o.id.slice(0, 8)}{o.district ? ` — ${o.district}` : ""}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" onClick={assign} disabled={!officerId || pending}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Assign"}
      </Button>
    </div>
  );
}
