"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { ReportDraft } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/language-context";
import { Info } from "lucide-react";

export function StepVehicle({
  draft,
  onChange,
}: {
  draft: ReportDraft;
  onChange: (patch: Partial<ReportDraft>) => void;
}) {
  const { t } = useLanguage();
  const r = t.report;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        {r.vehicleOptionalNote}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vehicleType">{r.vehicleTypeLabel}</Label>
          <Input id="vehicleType" placeholder={r.vehicleTypePlaceholder} value={draft.vehicleType} onChange={(e) => onChange({ vehicleType: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicleRegistration">{r.vehicleRegLabel}</Label>
          <Input id="vehicleRegistration" placeholder={r.vehicleRegPlaceholder} value={draft.vehicleRegistration} onChange={(e) => onChange({ vehicleRegistration: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicleColor">{r.vehicleColorLabel}</Label>
          <Input id="vehicleColor" placeholder={r.vehicleColorPlaceholder} value={draft.vehicleColor} onChange={(e) => onChange({ vehicleColor: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicleOwnerVisibleName">{r.vehicleOwnerLabel}</Label>
          <Input id="vehicleOwnerVisibleName" placeholder={r.vehicleOwnerPlaceholder} value={draft.vehicleOwnerVisibleName} onChange={(e) => onChange({ vehicleOwnerVisibleName: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

export function StepDescription({
  draft,
  onChange,
}: {
  draft: ReportDraft;
  onChange: (patch: Partial<ReportDraft>) => void;
}) {
  const { t } = useLanguage();
  const r = t.report;
  const isRegistered = draft.mode === "registered";
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="description">{r.whatHappenedLabel}</Label>
        <Textarea
          id="description"
          rows={6}
          placeholder={r.descPlaceholder}
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">{draft.description.length}/2000</p>
      </div>

      {isRegistered && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="text-sm font-semibold">{r.contactHeading}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactName">{r.contactNameLabel}</Label>
                <Input id="contactName" value={draft.contactName} onChange={(e) => onChange({ contactName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">{r.contactPhoneLabel}</Label>
                <Input id="contactPhone" value={draft.contactPhone} onChange={(e) => onChange({ contactPhone: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="contactEmail">{r.contactEmailLabel}</Label>
                <Input id="contactEmail" type="email" value={draft.contactEmail} onChange={(e) => onChange({ contactEmail: e.target.value })} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
