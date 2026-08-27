"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EMPTY_DRAFT, type ReportDraft, type ViolationCategory } from "@/lib/types";
import { StepMode, StepViolation } from "./step-mode-violation";
import { StepUpload } from "./step-upload";
import { LocationPicker } from "@/components/map/location-picker";
import { StepVehicle, StepDescription } from "./step-vehicle-description";
import { StepReview } from "./step-review";
import { ReportSuccess } from "./report-success";
import { submitReport, attachEvidence } from "@/app/report/actions";
import { hashFile } from "@/lib/file-hash";
import { ArrowLeft, ArrowRight, Loader2, ShieldAlert } from "lucide-react";

const STEP_LABELS = [
  "Reporting Mode",
  "Violation",
  "Evidence",
  "Location",
  "Vehicle",
  "Description",
  "Review",
];

export function ReportWizard() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState(0);
  const formOpenedAtRef = useMemo(() => Date.now(), []);
  const [draft, setDraft] = useState<ReportDraft>(EMPTY_DRAFT);
  const [categories, setCategories] = useState<ViolationCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ reportCode: string; trackingToken: string } | null>(null);

  useEffect(() => {
    supabase
      .from("violation_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data, error }) => {
        setCategoriesLoading(false);
        if (error) {
          setCategoriesError(
            "Couldn't load violation categories. The database may not be set up yet — see README “Getting started.”"
          );
          return;
        }
        if (data) setCategories(data as ViolationCategory[]);
      });
    supabase.auth.getUser().then(({ data }) => setIsAuthenticated(!!data.user));
  }, [supabase]);

  function patch(p: Partial<ReportDraft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  const selectedCategory = categories.find((c) => c.id === draft.categoryId);

  function canAdvance(): boolean {
    switch (step) {
      case 0:
        return draft.mode !== null && (draft.mode === "anonymous" || isAuthenticated);
      case 1:
        return draft.categoryId !== null;
      default:
        return true;
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    const res = await submitReport({
      mode: draft.mode!,
      categoryId: draft.categoryId!,
      isIllegalStoppage: draft.isIllegalStoppage,
      routeName: draft.routeName,
      stoppageDuration: draft.stoppageDuration,
      latitude: draft.latitude,
      longitude: draft.longitude,
      locationLabel: draft.locationLabel,
      district: draft.district,
      thana: draft.thana,
      vehicleType: draft.vehicleType,
      vehicleRegistration: draft.vehicleRegistration,
      vehicleColor: draft.vehicleColor,
      vehicleOwnerVisibleName: draft.vehicleOwnerVisibleName,
      description: draft.description,
      contactName: draft.contactName,
      contactPhone: draft.contactPhone,
      contactEmail: draft.contactEmail,
      formOpenedAt: formOpenedAtRef,
    });

    if (!res.ok) {
      setSubmitError(res.error);
      setSubmitting(false);
      return;
    }

    if (draft.files.length > 0) {
      const uploaded: { storagePath: string; type: "photo" | "video"; mimeType: string; fileSizeBytes: number; fileHash: string }[] = [];

      for (const file of draft.files) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${res.reportId}/${crypto.randomUUID()}.${ext}`;
        const [{ error }, fileHash] = await Promise.all([
          supabase.storage.from("report-evidence").upload(path, file, { contentType: file.type, upsert: false }),
          hashFile(file).catch(() => ""),
        ]);
        if (!error) {
          uploaded.push({
            storagePath: path,
            type: file.type.startsWith("video/") ? "video" : "photo",
            mimeType: file.type,
            fileSizeBytes: file.size,
            fileHash,
          });
        }
      }

      if (uploaded.length > 0) {
        await attachEvidence(res.reportId, uploaded);
      }
    }

    setResult({ reportCode: res.reportCode, trackingToken: res.trackingToken });
    setSubmitting(false);
  }

  if (result) {
    return <ReportSuccess reportCode={result.reportCode} trackingToken={result.trackingToken} />;
  }

  const isLastStep = step === STEP_LABELS.length - 1;
  const progressPct = ((step + 1) / STEP_LABELS.length) * 100;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">{STEP_LABELS[step]}</span>
          <span className="text-muted-foreground">Step {step + 1} of {STEP_LABELS.length}</span>
        </div>
        <Progress value={progressPct} />
      </div>

      <div className="min-h-[320px]">
        {step === 0 && (
          <StepMode value={draft.mode} onChange={(mode) => patch({ mode })} isAuthenticated={isAuthenticated} />
        )}
        {step === 0 && draft.mode === "registered" && !isAuthenticated && (
          <p className="mt-4 flex items-center gap-2 text-sm text-destructive">
            <ShieldAlert className="h-4 w-4" /> You'll need to sign in before continuing with a registered report.
          </p>
        )}
        {step === 1 && (
          <>
            {categoriesError ? (
              <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {categoriesError}
              </p>
            ) : categoriesLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading categories…
              </p>
            ) : categories.length === 0 ? (
              <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                No violation categories are configured yet. Run <code>supabase/seed.sql</code> (or add
                categories in the admin console) to populate this step.
              </p>
            ) : (
              <StepViolation categories={categories} draft={draft} onChange={patch} />
            )}
          </>
        )}
        {step === 2 && <StepUpload files={draft.files} onChange={(files) => patch({ files })} />}
        {step === 3 && (
          <LocationPicker
            latitude={draft.latitude}
            longitude={draft.longitude}
            locationLabel={draft.locationLabel}
            district={draft.district}
            thana={draft.thana}
            onLatLngChange={(lat, lng) => patch({ latitude: lat, longitude: lng })}
            onFieldChange={(field, value) => patch({ [field]: value } as Partial<ReportDraft>)}
          />
        )}
        {step === 4 && <StepVehicle draft={draft} onChange={patch} />}
        {step === 5 && <StepDescription draft={draft} onChange={patch} />}
        {step === 6 && <StepReview draft={draft} category={selectedCategory} />}
      </div>

      {submitError && (
        <p role="alert" aria-live="assertive" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{submitError}</p>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <Button
          variant="ghost"
          onClick={() => (step === 0 ? router.push("/") : setStep((s) => s - 1))}
          disabled={submitting}
        >
          <ArrowLeft className="h-4 w-4" /> {step === 0 ? "Cancel" : "Back"}
        </Button>

        {isLastStep ? (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit Report
          </Button>
        ) : (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
