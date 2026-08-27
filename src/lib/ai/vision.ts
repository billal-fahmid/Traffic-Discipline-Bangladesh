import "server-only";

/**
 * Vision-based AI modules — VEHICLE DETECTION, BUS/CAR/CNG
 * CLASSIFICATION, PLATE OCR, IMAGE-BASED VIOLATION CLASSIFICATION, and
 * NEAR-DUPLICATE (PERCEPTUAL) IMAGE MATCHING.
 *
 * Unlike report-ai.ts (case summarization, text category suggestion —
 * both genuinely implemented and callable today), the functions below
 * are **prepared interfaces, not live models**. This environment has
 * no vision-model API key or GPU inference available to wire up
 * honestly, so rather than fake a result, every function here returns
 * a typed `NOT_CONFIGURED` result explaining what a production
 * implementation would plug in. The call sites, types, DB columns
 * (report_evidence.file_hash is already live for *exact*-match
 * duplicate detection — see file-hash.ts) and UI affordances are all
 * in place; swapping in a real provider means implementing the body
 * of one function here, nothing else in the app needs to change.
 *
 * Suggested production providers, so this isn't a dead end:
 *   - Vehicle/bus/car/CNG detection & image violation classification:
 *     a hosted vision model (e.g. a cloud Vision API, or a
 *     self-hosted YOLO/vehicle-classification model behind an
 *     internal endpoint) called with the evidence image bytes.
 *   - Plate OCR: a cloud OCR API, or Tesseract.js run client-side in
 *     the officer console (no server round-trip needed for that one).
 *   - Near-duplicate images: a perceptual hash (pHash/dHash) computed
 *     server-side on upload (needs an image-decoding library such as
 *     sharp) and compared by Hamming distance, layered on top of the
 *     exact SHA-256 match already implemented.
 *
 * Whatever provider is wired in, the same rule from report-ai.ts
 * applies: these functions return *evidence for a human to weigh*,
 * never a verdict. No result type here includes anything resembling
 * "violation: true/false" — only detections, labels, and confidence
 * scores an officer can look at alongside the photo itself.
 */

export type AiModuleResult<T> =
  | { status: "ok"; data: T; disclaimer: string }
  | { status: "not_configured"; reason: string };

const NOT_CONFIGURED_DISCLAIMER =
  "This AI module is architecturally prepared but not connected to a live model in this deployment.";

export async function detectVehicles(
  _evidenceStoragePath: string
): Promise<AiModuleResult<{ boxes: { x: number; y: number; w: number; h: number; label: string; confidence: number }[] }>> {
  return { status: "not_configured", reason: NOT_CONFIGURED_DISCLAIMER };
}

export async function classifyVehicleType(
  _evidenceStoragePath: string
): Promise<AiModuleResult<{ label: "bus" | "car" | "cng" | "motorcycle" | "truck" | "other"; confidence: number }>> {
  return { status: "not_configured", reason: NOT_CONFIGURED_DISCLAIMER };
}

export async function classifyViolationFromImage(
  _evidenceStoragePath: string
): Promise<AiModuleResult<{ suggestedCategorySlug: string; confidence: number; notes: string }>> {
  return { status: "not_configured", reason: NOT_CONFIGURED_DISCLAIMER };
}

export async function readPlateText(
  _evidenceStoragePath: string
): Promise<AiModuleResult<{ text: string; confidence: number }>> {
  return { status: "not_configured", reason: NOT_CONFIGURED_DISCLAIMER };
}

export async function findNearDuplicateImages(
  _evidenceStoragePath: string
): Promise<AiModuleResult<{ matches: { reportId: string; similarity: number }[] }>> {
  return {
    status: "not_configured",
    reason:
      NOT_CONFIGURED_DISCLAIMER +
      " Exact-duplicate detection (identical file) is live today via SHA-256 hashing — see file-hash.ts and report_evidence.file_hash.",
  };
}
