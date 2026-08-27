import "server-only";
import { callClaude, isAiConfigured } from "./anthropic";

const DISCLAIMER =
  "AI-generated for officer reference only. It is not a verified finding, does not establish that a violation occurred, and must never be treated as proof or used to issue any penalty.";

export { isAiConfigured, DISCLAIMER };

/**
 * Summarizes a case (the citizen's description + accumulated officer
 * notes) into a short, neutral brief for an officer who's about to
 * pick the case up. Strictly a reading aid — it never sees or infers
 * anything about who filed the report (that data isn't passed in),
 * and the prompt explicitly forbids concluding guilt or innocence.
 */
export async function summarizeCaseForOfficer(input: {
  categoryName: string;
  description: string | null;
  vehicleType: string | null;
  vehicleRegistration: string | null;
  notes: string[];
}): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  if (!isAiConfigured()) {
    return { ok: false, error: "AI summarization isn't configured on this deployment (set ANTHROPIC_API_KEY)." };
  }

  const notesBlock = input.notes.length > 0 ? input.notes.map((n, i) => `${i + 1}. ${n}`).join("\n") : "(none yet)";

  const result = await callClaude({
    system:
      "You summarize traffic-violation case reports for a police officer's quick reference. " +
      "Stay strictly neutral and factual — restate what was reported and noted, never assert that " +
      "a violation legally occurred, never speculate about guilt, intent, or punishment, and never " +
      "invent details not present in the input. Keep it to 3-4 plain sentences. Do not use markdown.",
    prompt:
      `Violation category: ${input.categoryName}\n` +
      `Vehicle: ${input.vehicleType ?? "not specified"} ${input.vehicleRegistration ?? ""}\n` +
      `Citizen description: ${input.description ?? "(none provided)"}\n\n` +
      `Case notes so far:\n${notesBlock}\n\n` +
      `Write a short neutral summary for an officer picking this case up.`,
    maxTokens: 300,
  });

  if (!result.ok) return result;
  return { ok: true, summary: result.text };
}

/**
 * Suggests which violation category best fits a free-text description,
 * from the fixed list of categories that actually exist in the system
 * (never invents a new one). Output is advisory only — see
 * reports.ai_suggested_category_id in the schema, and note that no
 * code path ever writes this suggestion into reports.category_id
 * without an officer explicitly calling recategorizeReport().
 */
export async function suggestCategoryFromText(input: {
  description: string;
  categories: { slug: string; name_en: string }[];
}): Promise<{ ok: true; slug: string; reasoning: string } | { ok: false; error: string }> {
  if (!isAiConfigured()) {
    return { ok: false, error: "AI category suggestion isn't configured on this deployment (set ANTHROPIC_API_KEY)." };
  }
  if (!input.description || input.description.trim().length < 5) {
    return { ok: false, error: "Not enough description text to suggest a category from." };
  }

  const list = input.categories.map((c) => `- ${c.slug}: ${c.name_en}`).join("\n");

  const result = await callClaude({
    system:
      "You classify a traffic-violation report's free-text description into exactly one category " +
      "from a fixed list. Respond with ONLY two lines, no markdown, no extra text:\n" +
      "slug: <one of the given slugs, exactly as written>\n" +
      "reason: <one short sentence>",
    prompt: `Categories:\n${list}\n\nDescription: "${input.description}"`,
    maxTokens: 150,
  });

  if (!result.ok) return result;

  const slugMatch = result.text.match(/slug:\s*([a-z0-9-]+)/i);
  const reasonMatch = result.text.match(/reason:\s*(.+)/i);
  const slug = slugMatch?.[1]?.toLowerCase();

  if (!slug || !input.categories.some((c) => c.slug === slug)) {
    return { ok: false, error: "AI suggestion didn't match a known category." };
  }

  return { ok: true, slug, reasoning: reasonMatch?.[1]?.trim() ?? "" };
}
