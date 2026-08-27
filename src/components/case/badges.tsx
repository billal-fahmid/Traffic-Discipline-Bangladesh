import { Badge } from "@/components/ui/badge";
import { REPORT_STATUS_LABEL, PRIORITY_LABEL, type ReportStatus, type ReportPriority } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Record<ReportStatus, "default" | "secondary" | "destructive" | "success"> = {
  submitted: "secondary",
  received: "secondary",
  under_review: "secondary",
  evidence_verification: "secondary",
  verified: "success",
  assigned: "default",
  action_recommended: "default",
  action_taken: "success",
  closed: "success",
  rejected: "destructive",
  duplicate: "destructive",
};

export function StatusBadge({ status }: { status: ReportStatus }) {
  return <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>{REPORT_STATUS_LABEL[status]}</Badge>;
}

const PRIORITY_CLASS: Record<ReportPriority, string> = {
  low: "border-transparent bg-muted text-muted-foreground",
  medium: "border-transparent bg-secondary text-secondary-foreground",
  high: "border-transparent bg-amber-100 text-amber-900",
  urgent: "border-transparent bg-destructive/15 text-destructive",
};

export function PriorityBadge({ priority }: { priority: ReportPriority }) {
  return (
    <Badge className={cn(PRIORITY_CLASS[priority])} variant="outline">
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}
