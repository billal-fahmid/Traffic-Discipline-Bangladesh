export type UserRole = "citizen" | "officer" | "admin" | "super_admin";

export type ReportMode = "anonymous" | "registered";

export type ReportStatus =
  | "submitted"
  | "received"
  | "under_review"
  | "evidence_verification"
  | "verified"
  | "rejected"
  | "assigned"
  | "action_recommended"
  | "action_taken"
  | "closed"
  | "duplicate";

export type ReportPriority = "low" | "medium" | "high" | "urgent";

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  submitted: "Submitted",
  received: "Received",
  under_review: "Under Review",
  evidence_verification: "Evidence Verification",
  verified: "Verified",
  rejected: "Rejected",
  assigned: "Assigned to Officer",
  action_recommended: "Action Recommended",
  action_taken: "Action Taken",
  closed: "Closed",
  duplicate: "Duplicate",
};

/** The primary happy-path sequence, used to render progress trackers.
 *  Rejected/duplicate are terminal side-branches, not part of this line. */
export const REPORT_STATUS_ORDER: ReportStatus[] = [
  "submitted",
  "received",
  "under_review",
  "evidence_verification",
  "verified",
  "assigned",
  "action_recommended",
  "action_taken",
  "closed",
];

/** Terminal states — no further transitions expected. */
export const TERMINAL_STATUSES: ReportStatus[] = ["closed", "rejected", "duplicate"];

/** Valid next steps from each status, used to build the officer's status-change menu.
 *  Admins may override this via force-transition, everyone else is guided by it. */
export const STATUS_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  submitted: ["received", "rejected", "duplicate"],
  received: ["under_review", "rejected", "duplicate"],
  under_review: ["evidence_verification", "rejected", "duplicate"],
  evidence_verification: ["verified", "rejected", "duplicate"],
  verified: ["assigned", "rejected"],
  assigned: ["action_recommended", "rejected"],
  action_recommended: ["action_taken"],
  action_taken: ["closed"],
  closed: [],
  rejected: [],
  duplicate: [],
};

export const PRIORITY_LABEL: Record<ReportPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

// ─────────────────────────────────────────────────────────────────────
// Citizen-facing simplified workflow (Milestone 4) — collapses the
// granular internal statuses into the 5-stage view a citizen actually
// cares about: Report Submitted → Under Review → Verified → Action
// Taken → Closed. Used in notification text and the citizen-facing
// tracker; officers still see and work the full granular status.
// ─────────────────────────────────────────────────────────────────────

export type CitizenStage = "submitted" | "under_review" | "verified" | "action_taken" | "closed" | "rejected";

export const CITIZEN_STAGE_LABEL: Record<CitizenStage, string> = {
  submitted: "Report Submitted",
  under_review: "Under Review",
  verified: "Verified",
  action_taken: "Action Taken",
  closed: "Closed",
  rejected: "Not Verified",
};

export const CITIZEN_STAGE_ORDER: CitizenStage[] = ["submitted", "under_review", "verified", "action_taken", "closed"];

export function toCitizenStage(status: ReportStatus): CitizenStage {
  switch (status) {
    case "submitted":
    case "received":
      return "submitted";
    case "under_review":
    case "evidence_verification":
      return "under_review";
    case "verified":
    case "assigned":
    case "action_recommended":
      return "verified";
    case "action_taken":
      return "action_taken";
    case "closed":
      return "closed";
    case "rejected":
    case "duplicate":
    default:
      return "rejected";
  }
}


export interface ViolationCategory {
  id: string;
  slug: string;
  name_en: string;
  name_bn: string;
  description_en: string | null;
  description_bn: string | null;
  icon: string | null;
  severity: 1 | 2 | 3;
  is_special: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  nid_number: string | null;
  avatar_url: string | null;
  district: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface EvidenceFile {
  id: string;
  type: "photo" | "video";
  storage_path: string;
  file_size_bytes: number | null;
  mime_type: string | null;
}

export interface ReportRecord {
  id: string;
  report_code: string;
  mode: ReportMode;
  status: ReportStatus;
  priority: ReportPriority;
  category_id: string;
  vehicle_type: string | null;
  vehicle_registration: string | null;
  vehicle_color: string | null;
  vehicle_owner_visible_name: string | null;
  is_illegal_stoppage: boolean;
  route_name: string | null;
  stoppage_duration_estimate: string | null;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  district: string | null;
  thana: string | null;
  description: string | null;
  officer_id: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  is_duplicate: boolean;
  duplicate_of_report_id: string | null;
  rejection_reason: string | null;
  officer_notes: string | null;
  resolution_summary: string | null;
  reporter_id: string | null;
  quality_score: number;
  ai_suggested_category_id: string | null;
  ai_suggestion_note: string | null;
  ai_summary: string | null;
  ai_summary_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DuplicateSuggestion {
  id: string;
  report_id: string;
  candidate_report_id: string;
  score: number;
  reason: string;
  status: "pending" | "confirmed" | "dismissed";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  candidate_report_code?: string | null;
}

export interface ReportNote {
  id: string;
  report_id: string;
  author_id: string;
  note: string;
  created_at: string;
  author_name?: string | null;
}

export interface StatusHistoryEntry {
  id: string;
  report_id: string;
  from_status: ReportStatus | null;
  to_status: ReportStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
  changed_by_name?: string | null;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  actor_name?: string | null;
}

export interface TrafficRule {
  id: string;
  rule_code: string;
  title_en: string;
  title_bn: string;
  description_en: string | null;
  description_bn: string | null;
  category_id: string | null;
  fine_amount_bdt: number | null;
  legal_reference: string | null;
  is_active: boolean;
  created_at: string;
}

export type SpamFlagStatus = "pending" | "confirmed_spam" | "dismissed";

export interface SpamFlag {
  id: string;
  report_id: string | null;
  reason: string;
  status: SpamFlagStatus;
  flagged_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  report_code?: string | null;
}

export interface OfficerSummary {
  id: string;
  full_name: string | null;
  role: UserRole;
  district: string | null;
  is_active: boolean;
  open_case_count?: number;
}

// ─────────────────────────────────────────────────────────────────────
// Public analytics — payload shapes returned by the SECURITY DEFINER
// RPCs in supabase/004_public_analytics.sql. Deliberately narrower
// than ReportRecord: no id, no reporter info, no plate, no description.
// ─────────────────────────────────────────────────────────────────────

export interface PublicDashboardStats {
  total_reports: number;
  verified_reports: number;
  reports_this_week: number;
  reports_this_month: number;
  common_violations: { slug: string; name_en: string; name_bn: string; count: number }[];
  vehicle_type_stats: { vehicle_type: string; count: number }[];
  bus_related_count: number;
  illegal_stopping_count: number;
}

export interface PublicMapPoint {
  latitude: number;
  longitude: number;
  category_slug: string;
  category_name_en: string;
  category_name_bn: string;
  district: string | null;
  created_at: string;
}

export type RiskLevel = "low" | "medium" | "high";

export interface Hotspot {
  grid_lat: number;
  grid_lng: number;
  location_name: string;
  district: string | null;
  total_count: number;
  risk_level: RiskLevel;
  top_violations: { name: string; count: number }[];
}

export const RISK_LABEL: Record<RiskLevel, string> = { low: "Low", medium: "Medium", high: "High" };
export const RISK_COLOR: Record<RiskLevel, string> = { low: "#3b8a5e", medium: "#e0a52c", high: "#d92b3f" };



/** Draft state carried through the multi-step citizen report wizard. */
export interface ReportDraft {
  mode: ReportMode | null;
  categoryId: string | null;
  isIllegalStoppage: boolean;
  routeName: string;
  stoppageDuration: string;
  files: File[];
  latitude: number | null;
  longitude: number | null;
  locationLabel: string;
  district: string;
  thana: string;
  vehicleType: string;
  vehicleRegistration: string;
  vehicleColor: string;
  vehicleOwnerVisibleName: string;
  description: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

export const EMPTY_DRAFT: ReportDraft = {
  mode: null,
  categoryId: null,
  isIllegalStoppage: false,
  routeName: "",
  stoppageDuration: "",
  files: [],
  latitude: null,
  longitude: null,
  locationLabel: "",
  district: "",
  thana: "",
  vehicleType: "",
  vehicleRegistration: "",
  vehicleColor: "",
  vehicleOwnerVisibleName: "",
  description: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
};
