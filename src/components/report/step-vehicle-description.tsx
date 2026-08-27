"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { ReportDraft } from "@/lib/types";
import { Info } from "lucide-react";

export function StepVehicle({
  draft,
  onChange,
}: {
  draft: ReportDraft;
  onChange: (patch: Partial<ReportDraft>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        All fields here are optional — report what you could actually see. A partial plate or
        just the vehicle color is still useful.
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vehicleType">Vehicle type</Label>
          <Input id="vehicleType" placeholder="e.g. Bus, Private Car, Motorcycle, CNG" value={draft.vehicleType} onChange={(e) => onChange({ vehicleType: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicleRegistration">Registration / plate number</Label>
          <Input id="vehicleRegistration" placeholder="e.g. DHAKA METRO GA 12-3456" value={draft.vehicleRegistration} onChange={(e) => onChange({ vehicleRegistration: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicleColor">Color</Label>
          <Input id="vehicleColor" placeholder="e.g. White" value={draft.vehicleColor} onChange={(e) => onChange({ vehicleColor: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicleOwnerVisibleName">Company / operator name visible on vehicle</Label>
          <Input id="vehicleOwnerVisibleName" placeholder="e.g. name painted on a bus" value={draft.vehicleOwnerVisibleName} onChange={(e) => onChange({ vehicleOwnerVisibleName: e.target.value })} />
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
  const isRegistered = draft.mode === "registered";
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="description">What happened?</Label>
        <Textarea
          id="description"
          rows={6}
          placeholder="Describe what you saw — time of day, how the violation happened, and anything else relevant."
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">{draft.description.length}/2000</p>
      </div>

      {isRegistered && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="text-sm font-semibold">Contact details (optional, visible to officers only)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactName">Name</Label>
                <Input id="contactName" value={draft.contactName} onChange={(e) => onChange({ contactName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input id="contactPhone" value={draft.contactPhone} onChange={(e) => onChange({ contactPhone: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input id="contactEmail" type="email" value={draft.contactEmail} onChange={(e) => onChange({ contactEmail: e.target.value })} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
