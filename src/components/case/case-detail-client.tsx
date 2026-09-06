"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { StatusBadge, PriorityBadge } from "@/components/case/badges";
import {
  STATUS_TRANSITIONS,
  REPORT_STATUS_LABEL,
  REPORT_STATUS_ORDER,
  PRIORITY_LABEL,
  type ReportStatus,
  type ReportPriority,
} from "@/lib/types";
import {
  verifyReport,
  rejectReport,
  markDuplicate,
  changeReportStatus,
  addNote,
  setPriority,
  assignReport,
  flagAsSpam,
  getEvidenceSignedUrl,
  confirmDuplicateSuggestion,
  dismissDuplicateSuggestion,
  summarizeCaseWithAI,
  suggestCategoryWithAI,
  recategorizeReport,
  updateResolutionSummary,
} from "@/app/officer/actions";
import {
  CheckCircle2, XCircle, Copy, FileText, MapPin, Car, Clock, User,
  ShieldAlert, Loader2, ImageIcon, FileVideo, ExternalLink, UserPlus, UserMinus,
  Sparkles, GaugeCircle, Layers, Circle, ChevronRight,
} from "lucide-react";

const LeafletMap = dynamic(() => import("@/components/map/leaflet-map"), { ssr: false });

type Role = "officer" | "admin" | "super_admin";

function Msg({ text, tone }: { text: string; tone: "error" | "success" }) {
  return (
    <p className={`mt-2 rounded-md p-2 text-sm ${tone === "error" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
      {text}
    </p>
  );
}

export function CaseDetailClient({
  report,
  category,
  notes,
  history,
  evidence,
  officers,
  duplicates,
  allCategories,
  currentUserId,
  currentRole,
}: {
  report: any;
  category: any;
  notes: any[];
  history: any[];
  evidence: any[];
  officers: any[];
  duplicates: any[];
  allCategories: { id: string; slug: string; name_en: string }[];
  currentUserId: string;
  currentRole: Role;
}) {
  const isAdmin = currentRole === "admin" || currentRole === "super_admin";
  const isMine = report.officer_id === currentUserId;
  const isTerminal = ["closed", "rejected", "duplicate"].includes(report.status);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Header report={report} category={category} />
      <AssignmentPanel report={report} officers={officers} isAdmin={isAdmin} isMine={isMine} currentUserId={currentUserId} />
      {(report.resolution_summary ||
        ((isMine || isAdmin) && ["action_recommended", "action_taken", "closed"].includes(report.status))) && (
        <ResolutionCard report={report} canEdit={isMine || isAdmin} />
      )}
      {duplicates.length > 0 && !isTerminal && <DuplicatesCard duplicates={duplicates} />}
      {!isTerminal && (isMine || isAdmin) && <ActionsPanel report={report} isAdmin={isAdmin} />}
      {(isMine || isAdmin) && <AiAssistCard report={report} category={category} allCategories={allCategories} />}
      <div className="grid gap-6 md:grid-cols-2">
        <VehicleCard report={report} />
        <LocationCard report={report} />
      </div>
      <EvidenceCard evidence={evidence} />
      <NotesCard reportId={report.id} notes={notes} />
      <HistoryCard history={history} />
    </div>
  );
}

function Header({ report, category }: { report: any; category: any }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold">{report.report_code}</h1>
          <StatusBadge status={report.status} />
          <PriorityBadge priority={report.priority} />
          <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground" title="Report quality score — a completeness signal, not a validity judgment">
            <GaugeCircle className="h-3 w-3" /> Quality {report.quality_score ?? 0}/100
          </span>
        </div>
        <p className="mt-1 text-muted-foreground">{category?.name_en ?? "Uncategorized"}</p>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{report.mode === "anonymous" ? "Anonymous report" : "Registered report"}</Badge>
          <span>Filed {new Date(report.created_at).toLocaleString()}</span>
        </div>
      </div>
      {report.is_duplicate && (
        <Badge variant="destructive">Duplicate</Badge>
      )}
    </div>
  );
}

/** The citizen-facing "what was actually done about this" record — set (required)
 *  when a case moves to action_taken, editable afterward by the assigned officer
 *  or an admin. Also readable by the reporter directly off the reports row (RLS
 *  "reports: citizen reads own") and via the anonymous tracker RPC. */
function ResolutionCard({ report, canEdit }: { report: any; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(report.resolution_summary ?? "");
  const [msg, setMsg] = useState<{ text: string; tone: "error" | "success" } | null>(null);

  function save() {
    startTransition(async () => {
      const res = await updateResolutionSummary({ reportId: report.id, resolutionSummary: text });
      if (res.ok) {
        setEditing(false);
        setMsg(null);
      } else {
        setMsg({ text: res.error, tone: "error" });
      }
    });
  }

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="h-4 w-4 text-primary" /> Resolution — Action Taken
        </CardTitle>
        {canEdit && !editing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setText(report.resolution_summary ?? "");
              setEditing(true);
            }}
          >
            {report.resolution_summary ? "Edit" : "Add"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-5 pt-0">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="e.g. Fine of BDT 2,000 issued under section 4.2; vehicle owner warned."
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={pending || text.trim().length < 5}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={pending}>
                Cancel
              </Button>
            </div>
            {msg && <Msg {...msg} />}
          </div>
        ) : report.resolution_summary ? (
          <p className="whitespace-pre-wrap text-sm">{report.resolution_summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No resolution recorded yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function DuplicatesCard({ duplicates }: { duplicates: any[] }) {
  const [pending, startTransition] = useTransition();
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  function confirm(id: string) {
    startTransition(async () => {
      await confirmDuplicateSuggestion(id);
      setResolved((s) => new Set(s).add(id));
    });
  }
  function dismiss(id: string) {
    startTransition(async () => {
      await dismissDuplicateSuggestion(id);
      setResolved((s) => new Set(s).add(id));
    });
  }

  const visible = duplicates.filter((d) => !resolved.has(d.id));
  if (visible.length === 0) return null;

  return (
    <Card className="border-amber-300 bg-amber-50/60">
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Layers className="h-4 w-4" /> Possible Duplicates</CardTitle></CardHeader>
      <CardContent className="space-y-3 p-5 pt-0">
        <p className="text-sm text-muted-foreground">
          Automatically detected — a human still has to confirm before anything is marked a duplicate.
        </p>
        {visible.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg border bg-background p-3">
            <div>
              <p className="text-sm font-medium">{d.candidate?.report_code ?? "Unknown report"}</p>
              <p className="text-xs text-muted-foreground">{d.reason} · match confidence {Math.round(d.score * 100)}%</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => confirm(d.id)} disabled={pending}>Confirm Duplicate</Button>
              <Button size="sm" variant="outline" onClick={() => dismiss(d.id)} disabled={pending}>Not a Duplicate</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AiAssistCard({
  report, category, allCategories,
}: { report: any; category: any; allCategories: { id: string; slug: string; name_en: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<string | null>(report.ai_summary);
  const [suggestion, setSuggestion] = useState<{ categoryId: string; categoryName: string; reasoning: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function runSummarize() {
    setError(null);
    startTransition(async () => {
      const res = await summarizeCaseWithAI(report.id);
      if (res.ok) setSummary(res.summary);
      else setError(res.error);
    });
  }
  function runSuggestCategory() {
    setError(null);
    startTransition(async () => {
      const res = await suggestCategoryWithAI(report.id);
      if (res.ok) setSuggestion({ categoryId: res.categoryId, categoryName: res.categoryName, reasoning: res.reasoning });
      else setError(res.error);
    });
  }
  function applySuggestion() {
    if (!suggestion) return;
    startTransition(async () => {
      await recategorizeReport({ reportId: report.id, categoryId: suggestion.categoryId });
      setSuggestion(null);
    });
  }

  return (
    <Card className="border-primary/30 bg-primary/[0.02]">
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> AI Assist</CardTitle></CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <p className="text-xs text-muted-foreground">
          Decision support only — AI output here is never a finding and never changes a report's
          status or category on its own. Every suggestion requires your explicit action to apply.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={runSummarize} disabled={pending}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Summarize Case
          </Button>
          <Button size="sm" variant="outline" onClick={runSuggestCategory} disabled={pending}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Suggest Category
          </Button>
        </div>

        {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}

        {summary && (
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Summary</p>
            <p className="mt-1 text-sm">{summary}</p>
          </div>
        )}

        {suggestion && suggestion.categoryId !== report.category_id && (
          <div className="flex items-center justify-between rounded-lg border bg-background p-3">
            <div>
              <p className="text-sm">
                Suggested category: <strong>{suggestion.categoryName}</strong> (currently {category?.name_en ?? "Uncategorized"})
              </p>
              {suggestion.reasoning && <p className="text-xs text-muted-foreground">{suggestion.reasoning}</p>}
            </div>
            <Button size="sm" onClick={applySuggestion} disabled={pending}>Apply</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AssignmentPanel({
  report, officers, isAdmin, isMine, currentUserId,
}: { report: any; officers: any[]; isAdmin: boolean; isMine: boolean; currentUserId: string }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [selectedOfficer, setSelectedOfficer] = useState<string>(report.officer_id ?? "");

  function claim() {
    startTransition(async () => {
      const res = await assignReport({ reportId: report.id, officerId: currentUserId });
      setMsg(res.ok ? { text: "Case claimed.", tone: "success" } : { text: res.error, tone: "error" });
    });
  }
  function release() {
    startTransition(async () => {
      const res = await assignReport({ reportId: report.id, officerId: null });
      setMsg(res.ok ? { text: "Case released.", tone: "success" } : { text: res.error, tone: "error" });
    });
  }
  function adminAssign() {
    if (!selectedOfficer) return;
    startTransition(async () => {
      const res = await assignReport({ reportId: report.id, officerId: selectedOfficer });
      setMsg(res.ok ? { text: "Case assigned.", tone: "success" } : { text: res.error, tone: "error" });
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-primary" />
          {report.officer_id
            ? <span>Assigned {isMine ? <strong>to you</strong> : "to another officer"}{report.assigned_at ? ` · ${new Date(report.assigned_at).toLocaleDateString()}` : ""}</span>
            : <span className="text-muted-foreground">Unassigned</span>}
        </div>

        {isAdmin ? (
          <div className="flex items-center gap-2">
            <Select value={selectedOfficer} onValueChange={setSelectedOfficer}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Choose an officer" /></SelectTrigger>
              <SelectContent>
                {officers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.full_name ?? o.id.slice(0, 8)}{o.district ? ` — ${o.district}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={adminAssign} disabled={pending || !selectedOfficer}>
              <UserPlus className="h-4 w-4" /> Assign
            </Button>
            {report.officer_id && (
              <Button size="sm" variant="outline" onClick={release} disabled={pending}>
                <UserMinus className="h-4 w-4" /> Unassign
              </Button>
            )}
          </div>
        ) : !report.officer_id ? (
          <Button size="sm" onClick={claim} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Claim This Case
          </Button>
        ) : isMine ? (
          <Button size="sm" variant="outline" onClick={release} disabled={pending}>
            <UserMinus className="h-4 w-4" /> Release Case
          </Button>
        ) : null}
      </CardContent>
      {msg && <div className="px-5 pb-4"><Msg {...msg} /></div>}
    </Card>
  );
}

function ActionsPanel({ report, isAdmin }: { report: any; isAdmin: boolean }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [duplicateCode, setDuplicateCode] = useState("");
  const [showSpam, setShowSpam] = useState(false);
  const [spamReason, setSpamReason] = useState("");
  const [nextStatus, setNextStatus] = useState<string>("");
  const [priority, setPriorityValue] = useState<ReportPriority>(report.priority);
  const [showActionTaken, setShowActionTaken] = useState(false);
  const [actionTakenText, setActionTakenText] = useState("");
  const [actionTakenForce, setActionTakenForce] = useState(false);

  const allowedNext = STATUS_TRANSITIONS[report.status as ReportStatus] ?? [];

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, successText: string) {
    startTransition(async () => {
      const res = await fn();
      setMsg(res.ok ? { text: successText, tone: "success" } : { text: res.error!, tone: "error" });
    });
  }

  function advance(status: ReportStatus, force: boolean) {
    // Moving into action_taken always requires the citizen-facing resolution
    // text first — collect it here instead of transitioning immediately.
    if (status === "action_taken") {
      setActionTakenForce(force);
      setActionTakenText(report.resolution_summary ?? "");
      setShowActionTaken(true);
      return;
    }
    run(() => changeReportStatus({ reportId: report.id, newStatus: status, force }), `Status updated to ${REPORT_STATUS_LABEL[status]}.`);
  }

  function confirmActionTaken() {
    startTransition(async () => {
      const res = await changeReportStatus({
        reportId: report.id,
        newStatus: "action_taken",
        force: actionTakenForce,
        resolutionSummary: actionTakenText,
      });
      if (res.ok) {
        setShowActionTaken(false);
        setMsg({ text: "Action recorded — status updated to Action Taken.", tone: "success" });
      } else {
        setMsg({ text: res.error!, tone: "error" });
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Case Actions</CardTitle></CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <StatusStepper status={report.status} allowedNext={allowedNext} isAdmin={isAdmin} pending={pending} onAdvance={advance} />

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {report.status === "evidence_verification" && (
            <Button size="sm" onClick={() => run(() => verifyReport(report.id), "Report verified.")} disabled={pending}>
              <CheckCircle2 className="h-4 w-4" /> Verify
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowReject((s) => !s)} disabled={pending}>
            <XCircle className="h-4 w-4" /> Reject
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowDuplicate((s) => !s)} disabled={pending}>
            <Copy className="h-4 w-4" /> Mark Duplicate
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowSpam((s) => !s)} disabled={pending}>
            <ShieldAlert className="h-4 w-4" /> Flag as Spam
          </Button>
        </div>

        {showActionTaken && (
          <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <Label htmlFor="actionTakenText">What action was taken? (required — shown to the reporter)</Label>
            <Textarea
              id="actionTakenText"
              value={actionTakenText}
              onChange={(e) => setActionTakenText(e.target.value)}
              rows={3}
              placeholder="e.g. Fine of BDT 2,000 issued under section 4.2; vehicle owner warned."
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={confirmActionTaken} disabled={pending || actionTakenText.trim().length < 5}>
                Confirm & Advance
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowActionTaken(false)} disabled={pending}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {showReject && (
          <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <Label htmlFor="rejectReason">Rejection reason (required)</Label>
            <Textarea id="rejectReason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
            <Button
              size="sm" variant="destructive"
              onClick={() => run(() => rejectReport({ reportId: report.id, reason: rejectReason }), "Report rejected.")}
              disabled={pending || rejectReason.trim().length < 5}
            >
              Confirm Rejection
            </Button>
          </div>
        )}

        {showDuplicate && (
          <div className="space-y-2 rounded-lg border p-4">
            <Label htmlFor="duplicateCode">Original report code</Label>
            <Input id="duplicateCode" placeholder="TDB-2026-483920" value={duplicateCode} onChange={(e) => setDuplicateCode(e.target.value)} />
            <Button
              size="sm"
              onClick={() => run(() => markDuplicate({ reportId: report.id, duplicateOfCode: duplicateCode }), "Marked as duplicate.")}
              disabled={pending || duplicateCode.trim().length < 5}
            >
              Confirm Duplicate
            </Button>
          </div>
        )}

        {showSpam && (
          <div className="space-y-2 rounded-lg border p-4">
            <Label htmlFor="spamReason">Why does this look suspicious?</Label>
            <Textarea id="spamReason" value={spamReason} onChange={(e) => setSpamReason(e.target.value)} rows={2} />
            <Button
              size="sm"
              onClick={() => run(() => flagAsSpam({ reportId: report.id, reason: spamReason }), "Flagged for admin review.")}
              disabled={pending || spamReason.trim().length < 3}
            >
              Flag Report
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div className="space-y-1.5">
            <Label>Move to status</Label>
            <div className="flex gap-2">
              <Select value={nextStatus} onValueChange={setNextStatus}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Choose next status" /></SelectTrigger>
                <SelectContent>
                  {(isAdmin ? Object.keys(REPORT_STATUS_LABEL) : allowedNext).map((s) => (
                    <SelectItem key={s} value={s}>{REPORT_STATUS_LABEL[s as ReportStatus]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => advance(nextStatus as ReportStatus, isAdmin && !allowedNext.includes(nextStatus as ReportStatus))}
                disabled={pending || !nextStatus}
              >
                Update
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <div className="flex gap-2">
              <Select value={priority} onValueChange={(v) => setPriorityValue(v as ReportPriority)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                size="sm" variant="outline"
                onClick={() => run(() => setPriority({ reportId: report.id, priority }), "Priority updated.")}
                disabled={pending}
              >
                Save
              </Button>
            </div>
          </div>
        </div>

        {msg && <Msg {...msg} />}
      </CardContent>
    </Card>
  );
}

/** Clickable progress stepper — the officer/admin equivalent of the citizen tracker on
 *  /track. Clicking a future step calls changeReportStatus directly: the immediate next
 *  step for anyone assigned, or (for admins) any later step as a force-transition. */
function StatusStepper({
  status, allowedNext, isAdmin, pending, onAdvance,
}: {
  status: ReportStatus;
  allowedNext: ReportStatus[];
  isAdmin: boolean;
  pending: boolean;
  onAdvance: (status: ReportStatus, force: boolean) => void;
}) {
  if (!REPORT_STATUS_ORDER.includes(status)) return null;

  const currentIndex = REPORT_STATUS_ORDER.indexOf(status);
  const forwardNext = allowedNext.find((s) => REPORT_STATUS_ORDER.includes(s));

  return (
    <div className="flex flex-wrap items-center gap-1">
      {REPORT_STATUS_ORDER.map((s, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isImmediateNext = s === forwardNext;
        const clickable = !pending && (isImmediateNext || (isAdmin && i > currentIndex));

        return (
          <div key={s} className="flex items-center gap-1">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onAdvance(s, !isImmediateNext)}
              title={clickable ? `Move to ${REPORT_STATUS_LABEL[s]}` : REPORT_STATUS_LABEL[s]}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                isCurrent
                  ? "border-primary bg-primary/10 text-primary"
                  : isDone
                  ? "border-success/40 bg-success/5 text-success"
                  : clickable
                  ? "border-primary/40 text-foreground hover:bg-primary/5"
                  : "border-border text-muted-foreground/60"
              } ${clickable ? "cursor-pointer" : "cursor-default"}`}
            >
              {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              {REPORT_STATUS_LABEL[s]}
            </button>
            {i < REPORT_STATUS_ORDER.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />}
          </div>
        );
      })}
    </div>
  );
}

function VehicleCard({ report }: { report: any }) {
  const rows: [string, string | null][] = [
    ["Type", report.vehicle_type],
    ["Registration", report.vehicle_registration],
    ["Color", report.vehicle_color],
    ["Operator name shown", report.vehicle_owner_visible_name],
  ];
  if (report.is_illegal_stoppage) {
    rows.push(["Bus route", report.route_name], ["Stoppage duration", report.stoppage_duration_estimate]);
  }
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Car className="h-4 w-4" /> Vehicle Information</CardTitle></CardHeader>
      <CardContent className="space-y-2 p-5 pt-0 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between border-b border-border/60 py-2 last:border-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value || "—"}</span>
          </div>
        ))}
        {report.description && (
          <div className="pt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{report.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LocationCard({ report }: { report: any }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" /> Location</CardTitle></CardHeader>
      <CardContent className="space-y-3 p-5 pt-0">
        {report.latitude && report.longitude ? (
          <LeafletMap latitude={report.latitude} longitude={report.longitude} onChange={() => {}} className="h-48 w-full rounded-lg border" />
        ) : (
          <div className="flex h-48 items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">No coordinates provided</div>
        )}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Landmark</span><span className="font-medium">{report.location_label || "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">District</span><span className="font-medium">{report.district || "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Thana</span><span className="font-medium">{report.thana || "—"}</span></div>
        </div>
      </CardContent>
    </Card>
  );
}

function EvidenceCard({ evidence }: { evidence: any[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function view(id: string, path: string) {
    setLoadingId(id);
    const res = await getEvidenceSignedUrl(path);
    setLoadingId(null);
    if (res.ok) {
      setUrls((u) => ({ ...u, [id]: res.url }));
      window.open(res.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Evidence ({evidence.length})</CardTitle></CardHeader>
      <CardContent className="p-5 pt-0">
        {evidence.length === 0 ? (
          <p className="text-sm text-muted-foreground">No evidence was attached to this report.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {evidence.map((e) => (
              <button
                key={e.id}
                onClick={() => view(e.id, e.storage_path)}
                className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                {e.type === "video" ? <FileVideo className="h-6 w-6 text-primary" /> : <ImageIcon className="h-6 w-6 text-primary" />}
                <span className="text-xs text-muted-foreground">{e.type === "video" ? "Video" : "Photo"}</span>
                {loadingId === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3 text-muted-foreground" />}
              </button>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Files open via a short-lived signed link (5 minutes) — evidence is never publicly accessible.
        </p>
      </CardContent>
    </Card>
  );
}

function NotesCard({ reportId, notes }: { reportId: string; notes: any[] }) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [localNotes, setLocalNotes] = useState(notes);
  const [msg, setMsg] = useState<{ text: string; tone: "error" | "success" } | null>(null);

  function submit() {
    startTransition(async () => {
      const res = await addNote({ reportId, note });
      if (res.ok) {
        setLocalNotes([{ id: crypto.randomUUID(), note, created_at: new Date().toISOString(), profiles: { full_name: "You" } }, ...localNotes]);
        setNote("");
        setMsg(null);
      } else {
        setMsg({ text: res.error, tone: "error" });
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Official Notes</CardTitle></CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <div className="flex gap-2">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a case note…" rows={2} />
          <Button onClick={submit} disabled={pending || note.trim().length === 0} className="self-end">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
          </Button>
        </div>
        {msg && <Msg {...msg} />}
        <div className="space-y-3">
          {localNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            localNotes.map((n) => (
              <div key={n.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{n.profiles?.full_name ?? "Staff"}</span>
                  <span>{new Date(n.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{n.note}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryCard({ history }: { history: any[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" /> Case History</CardTitle></CardHeader>
      <CardContent className="p-5 pt-0">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No status changes recorded yet.</p>
        ) : (
          <ol className="space-y-4 border-l border-border pl-4">
            {history.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                <p className="text-sm font-medium">
                  {h.from_status ? `${REPORT_STATUS_LABEL[h.from_status as ReportStatus]} → ` : ""}
                  {REPORT_STATUS_LABEL[h.to_status as ReportStatus]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {h.profiles?.full_name ?? "System"} · {new Date(h.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
