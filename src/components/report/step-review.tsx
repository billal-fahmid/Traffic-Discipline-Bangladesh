"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ReportDraft, ViolationCategory } from "@/lib/types";
import { EyeOff, UserCheck, MapPin, Camera } from "lucide-react";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function StepReview({
  draft,
  category,
}: {
  draft: ReportDraft;
  category: ViolationCategory | undefined;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            {draft.mode === "anonymous" ? <EyeOff className="h-4 w-4 text-primary" /> : <UserCheck className="h-4 w-4 text-primary" />}
            <p className="text-sm font-semibold">
              {draft.mode === "anonymous" ? "Anonymous report" : "Registered report"}
            </p>
          </div>
          <Row label="Violation" value={category?.name_en} />
          {draft.isIllegalStoppage && <Row label="Bus route" value={draft.routeName || "—"} />}
          {draft.isIllegalStoppage && <Row label="Stoppage duration" value={draft.stoppageDuration || "—"} />}
          <Row label="Vehicle type" value={draft.vehicleType} />
          <Row label="Registration" value={draft.vehicleRegistration} />
          <Row label="Color" value={draft.vehicleColor} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Location</p>
          </div>
          <Row label="Coordinates" value={draft.latitude && draft.longitude ? `${draft.latitude.toFixed(5)}, ${draft.longitude.toFixed(5)}` : "Not set"} />
          <Row label="Landmark" value={draft.locationLabel} />
          <Row label="District" value={draft.district} />
          <Row label="Thana" value={draft.thana} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Evidence</p>
          </div>
          {draft.files.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {draft.files.map((f, i) => (
                <Badge key={i} variant="secondary">{f.name}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No files attached.</p>
          )}
        </CardContent>
      </Card>

      {draft.description && (
        <Card>
          <CardContent className="p-5">
            <p className="mb-2 text-sm font-semibold">Description</p>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{draft.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
