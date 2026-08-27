"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ReportDraft, ReportMode } from "@/lib/types";
import type { ViolationCategory } from "@/lib/types";
import {
  ParkingCircleOff, MoveLeft, TrafficCone, Zap, ShieldAlert, PackagePlus,
  Bus, FileX, Wrench, MoreHorizontal, EyeOff, UserCheck,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "parking-circle-off": ParkingCircleOff,
  "move-left": MoveLeft,
  "traffic-cone": TrafficCone,
  zap: Zap,
  "shield-alert": ShieldAlert,
  "package-plus": PackagePlus,
  bus: Bus,
  "file-x": FileX,
  wrench: Wrench,
  "more-horizontal": MoreHorizontal,
};

export function StepMode({
  value,
  onChange,
  isAuthenticated,
}: {
  value: ReportMode | null;
  onChange: (mode: ReportMode) => void;
  isAuthenticated: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <button type="button" onClick={() => onChange("anonymous")} className="text-left">
        <Card className={cn("h-full transition-all hover:border-primary/60", value === "anonymous" && "border-primary ring-2 ring-primary/20")}>
          <CardContent className="p-6">
            <EyeOff className="h-8 w-8 text-primary" />
            <p className="mt-4 font-display text-lg font-bold">Report Anonymously</p>
            <p className="mt-2 text-sm text-muted-foreground">
              No name, phone, email, or NID collected — ever. You'll still get a report code and
              tracking token to follow up.
            </p>
            <Badge variant="secondary" className="mt-4">Fastest · fully private</Badge>
          </CardContent>
        </Card>
      </button>

      <button
        type="button"
        onClick={() => onChange("registered")}
        className="text-left"
        disabled={false}
      >
        <Card className={cn("h-full transition-all hover:border-primary/60", value === "registered" && "border-primary ring-2 ring-primary/20")}>
          <CardContent className="p-6">
            <UserCheck className="h-8 w-8 text-primary" />
            <p className="mt-4 font-display text-lg font-bold">Report as a Registered User</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {isAuthenticated
                ? "Signed in — this report will appear in your dashboard with status updates."
                : "You'll be asked to sign in first. Track every report you've filed from your dashboard."}
            </p>
            <Badge variant="secondary" className="mt-4">Dashboard history · notifications</Badge>
          </CardContent>
        </Card>
      </button>
    </div>
  );
}

export function StepViolation({
  categories,
  draft,
  onChange,
}: {
  categories: ViolationCategory[];
  draft: ReportDraft;
  onChange: (patch: Partial<ReportDraft>) => void;
}) {
  const selected = categories.find((c) => c.id === draft.categoryId);
  const isSpecial = selected?.is_special ?? false;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {categories.map((c) => {
          const Icon = ICONS[c.icon ?? "more-horizontal"] ?? MoreHorizontal;
          const active = draft.categoryId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange({ categoryId: c.id, isIllegalStoppage: c.is_special })}
              className="text-left"
            >
              <Card className={cn("transition-all hover:border-primary/60", active && "border-primary ring-2 ring-primary/20")}>
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{c.name_en}</p>
                    <p className="font-bangla text-xs text-muted-foreground">{c.name_bn}</p>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {isSpecial && (
        <Card className="border-primary/40 bg-primary/[0.03]">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Bus className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Illegal Bus / Passenger Pickup-Drop Details</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="routeName">Bus route (if visible)</Label>
                <Input
                  id="routeName"
                  placeholder="e.g. Gabtoli–Motijheel"
                  value={draft.routeName}
                  onChange={(e) => onChange({ routeName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stoppageDuration">How long did it block traffic?</Label>
                <Input
                  id="stoppageDuration"
                  placeholder="e.g. ~5 minutes, blocked a full lane"
                  value={draft.stoppageDuration}
                  onChange={(e) => onChange({ stoppageDuration: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
