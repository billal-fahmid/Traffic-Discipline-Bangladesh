/**
 * Client-side SHA-256 hashing for uploaded evidence files, used for
 * exact-duplicate detection (see report_evidence.file_hash and the
 * detect_duplicate_evidence trigger in supabase/005_advanced_features.sql).
 * Runs entirely in the browser via Web Crypto — the file's bytes never
 * need a round trip to compute this.
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
