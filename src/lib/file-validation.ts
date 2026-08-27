/**
 * Server-side evidence file validation. The report wizard's upload
 * step (src/components/report/step-upload.tsx) already restricts
 * type/size client-side for UX, but that check is trivially bypassed
 * by anyone calling the server action directly — this is the real
 * enforcement point.
 */

export const ACCEPTED_EVIDENCE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export const MAX_EVIDENCE_FILES = 5;
export const MAX_EVIDENCE_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export function isAcceptedMimeType(mime: string): boolean {
  return (ACCEPTED_EVIDENCE_MIME_TYPES as readonly string[]).includes(mime);
}

export function evidenceTypeFromMime(mime: string): "photo" | "video" {
  return mime.startsWith("video/") ? "video" : "photo";
}

/**
 * Every evidence object is stored at "<report-id>/<random>.<ext>" — a
 * flat, single-segment filename directly under the report's folder
 * (see report-wizard.tsx). This validates that shape strictly: no
 * further subdirectories, no ".." anywhere, and only a safe filename
 * character set. A naive "startsWith(reportId) + generic char regex"
 * check (an earlier version of this function) would have *looked*
 * safe while still accepting "<report-id>/../<other-id>/secret.jpg",
 * since ".." and "/" both pass a generic [\w./-] filter — that
 * startsWith prefix means nothing once ".." is allowed to walk back
 * out of it. Splitting into exactly two path segments and rejecting
 * ".." outright closes that gap.
 */
export function isPathForReport(storagePath: string, reportId: string): boolean {
  if (storagePath.includes("..")) return false;

  const segments = storagePath.split("/");
  if (segments.length !== 2) return false;

  const [folder, filename] = segments;
  if (folder !== reportId) return false;
  if (!/^[\w.-]+$/.test(filename) || filename.length === 0) return false;

  return true;
}
