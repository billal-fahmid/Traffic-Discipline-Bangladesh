"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { LocationPicker } from "@/components/map/location-picker";
import { updateOwnReport } from "@/app/report/actions";
import {
  CITIZEN_STAGE_LABEL,
  CITIZEN_STAGE_ORDER,
  toCitizenStage,
  type ReportStatus,
} from "@/lib/types";
import { ArrowLeft, Check, Copy, CheckCircle2, Circle, Loader2, Pencil, Clock } from "lucide-react";

const EDIT_WINDOW_MS = 10 * 60 * 1000;

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API can fail (permissions, insecure context) — nothing sensible to do beyond leaving the button unchanged.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm">{value}</p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={copy}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

export function ReportDetailClient({
  report,
  category,
  categories,
}: {
  report: any;
  category: { id: string; name_en: string } | null;
  categories: { id: string; name_en: string }[];
}) {
  const stage = toCitizenStage(report.status as ReportStatus);
  const currentIndex = CITIZEN_STAGE_ORDER.indexOf(stage);
  const isTerminalSideBranch = stage === "rejected";

  const editableUntil = new Date(report.created_at).getTime() + EDIT_WINDOW_MS;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const msRemaining = editableUntil - now;
  const isEditable = msRemaining > 0;

  const [editing, setEditing] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-xl font-bold">{report.report_code}</h1>
            <Badge variant={isTerminalSideBranch ? "destructive" : "secondary"}>
              {CITIZEN_STAGE_LABEL[stage]}
            </Badge>
          </div>

          <div className="mt-4 space-y-2">
            <CopyField label="Report code" value={report.report_code} />
            {report.tracking_token && <CopyField label="Tracking token" value={report.tracking_token} />}
          </div>

          <div className="mt-6 space-y-3 border-t border-border pt-6 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium">{category?.name_en ?? "—"}</span></div>
            {report.district && (
              <div className="flex justify-between"><span className="text-muted-foreground">District</span><span className="font-medium">{report.district}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Filed</span><span className="font-medium">{new Date(report.created_at).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Last updated</span><span className="font-medium">{new Date(report.updated_at).toLocaleString()}</span></div>
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

          {report.resolution_summary && (
            <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Action Taken</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{report.resolution_summary}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isEditable && !editing && (
        <Card className="border-primary/30 bg-primary/[0.03]">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              You can still edit this report for {formatRemaining(msRemaining)}.
            </div>
            <Button size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit Report
            </Button>
          </CardContent>
        </Card>
      )}

      {editing && (
        <EditForm
          report={report}
          categories={categories}
          isEditable={isEditable}
          msRemaining={msRemaining}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function EditForm({
  report,
  categories,
  isEditable,
  msRemaining,
  onClose,
}: {
  report: any;
  categories: { id: string; name_en: string }[];
  isEditable: boolean;
  msRemaining: number;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; tone: "error" | "success" } | null>(null);

  const [categoryId, setCategoryId] = useState(report.category_id as string);
  const [description, setDescription] = useState(report.description ?? "");
  const [vehicleType, setVehicleType] = useState(report.vehicle_type ?? "");
  const [vehicleRegistration, setVehicleRegistration] = useState(report.vehicle_registration ?? "");
  const [vehicleColor, setVehicleColor] = useState(report.vehicle_color ?? "");
  const [vehicleOwnerVisibleName, setVehicleOwnerVisibleName] = useState(report.vehicle_owner_visible_name ?? "");
  const [isIllegalStoppage, setIsIllegalStoppage] = useState(!!report.is_illegal_stoppage);
  const [routeName, setRouteName] = useState(report.route_name ?? "");
  const [stoppageDuration, setStoppageDuration] = useState(report.stoppage_duration_estimate ?? "");
  const [latitude, setLatitude] = useState<number | null>(report.latitude);
  const [longitude, setLongitude] = useState<number | null>(report.longitude);
  const [locationLabel, setLocationLabel] = useState(report.location_label ?? "");
  const [district, setDistrict] = useState(report.district ?? "");
  const [thana, setThana] = useState(report.thana ?? "");

  function save() {
    if (!isEditable) {
      setMsg({ text: "The 10-minute edit window has passed.", tone: "error" });
      return;
    }
    startTransition(async () => {
      const res = await updateOwnReport({
        reportId: report.id,
        categoryId,
        isIllegalStoppage,
        routeName,
        stoppageDuration,
        latitude,
        longitude,
        locationLabel,
        district,
        thana,
        vehicleType,
        vehicleRegistration,
        vehicleColor,
        vehicleOwnerVisibleName,
        description,
      });
      if (res.ok) {
        setMsg({ text: "Report updated.", tone: "success" });
        setTimeout(onClose, 900);
      } else {
        setMsg({ text: res.error, tone: "error" });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          Edit Report
          <span className="text-xs font-normal text-muted-foreground">{formatRemaining(msRemaining)} remaining</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-5 pt-0">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vehicleType">Vehicle type</Label>
            <Input id="vehicleType" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleRegistration">Registration / plate number</Label>
            <Input id="vehicleRegistration" value={vehicleRegistration} onChange={(e) => setVehicleRegistration(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleColor">Color</Label>
            <Input id="vehicleColor" value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleOwnerVisibleName">Company / operator name</Label>
            <Input id="vehicleOwnerVisibleName" value={vehicleOwnerVisibleName} onChange={(e) => setVehicleOwnerVisibleName(e.target.value)} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isIllegalStoppage} onChange={(e) => setIsIllegalStoppage(e.target.checked)} />
          This was an illegal bus stoppage / route violation
        </label>
        {isIllegalStoppage && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="routeName">Bus route</Label>
              <Input id="routeName" value={routeName} onChange={(e) => setRouteName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stoppageDuration">Stoppage duration</Label>
              <Input id="stoppageDuration" value={stoppageDuration} onChange={(e) => setStoppageDuration(e.target.value)} />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={4} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <LocationPicker
          latitude={latitude}
          longitude={longitude}
          locationLabel={locationLabel}
          district={district}
          thana={thana}
          onLatLngChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
          onFieldChange={(field, value) => {
            if (field === "locationLabel") setLocationLabel(value);
            if (field === "district") setDistrict(value);
            if (field === "thana") setThana(value);
          }}
        />

        <div className="flex gap-2 border-t border-border pt-4">
          <Button onClick={save} disabled={pending || !isEditable}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Changes
          </Button>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
        </div>

        {msg && (
          <p className={`rounded-md p-2 text-sm ${msg.tone === "error" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
            {msg.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
