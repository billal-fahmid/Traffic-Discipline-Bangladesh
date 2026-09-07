"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ReportDraft, ViolationCategory } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/language-context";
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
  const { t } = useLanguage();
  const r = t.report.review;
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            {draft.mode === "anonymous" ? <EyeOff className="h-4 w-4 text-primary" /> : <UserCheck className="h-4 w-4 text-primary" />}
            <p className="text-sm font-semibold">
              {draft.mode === "anonymous" ? r.anonymousReport : r.registeredReport}
            </p>
          </div>
          <Row label={r.violation} value={category?.name_en} />
          {draft.isIllegalStoppage && <Row label={r.busRoute} value={draft.routeName || "—"} />}
          {draft.isIllegalStoppage && <Row label={r.stoppageDuration} value={draft.stoppageDuration || "—"} />}
          <Row label={r.vehicleType} value={draft.vehicleType} />
          <Row label={r.registration} value={draft.vehicleRegistration} />
          <Row label={r.color} value={draft.vehicleColor} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">{r.locationHeading}</p>
          </div>
          <Row label={r.coordinates} value={draft.latitude && draft.longitude ? `${draft.latitude.toFixed(5)}, ${draft.longitude.toFixed(5)}` : r.notSet} />
          <Row label={r.landmark} value={draft.locationLabel} />
          <Row label={r.district} value={draft.district} />
          <Row label={r.thana} value={draft.thana} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">{r.evidenceHeading}</p>
          </div>
          {draft.files.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {draft.files.map((f, i) => (
                <Badge key={i} variant="secondary">{f.name}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{r.noFiles}</p>
          )}
        </CardContent>
      </Card>

      {draft.description && (
        <Card>
          <CardContent className="p-5">
            <p className="mb-2 text-sm font-semibold">{r.description}</p>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{draft.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
