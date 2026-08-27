import "server-only";

/**
 * Minimal wrapper around the Anthropic Messages API for the two
 * text-based AI decision-support features that are genuinely
 * implemented in this codebase (case summarization, category
 * suggestion — see report-ai.ts). Entirely optional: every caller
 * checks isAiConfigured() first and degrades to "not available"
 * rather than throwing when no key is set.
 *
 * This is intentionally the only place that talks to an external AI
 * API, so the "AI only supports, never decides" boundary is easy to
 * audit: nothing in src/lib/ai ever calls a status-changing action,
 * and nothing outside src/app/officer/actions.ts's AI-labeled
 * functions ever calls this file.
 */

const MODEL = "claude-sonnet-4-6";
const API_URL = "https://api.anthropic.com/v1/messages";

export function isAiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function callClaude(params: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "AI features are not configured (ANTHROPIC_API_KEY is unset)." };
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: params.maxTokens ?? 500,
        system: params.system,
        messages: [{ role: "user", content: params.prompt }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Anthropic API error", res.status, body);
      return { ok: false, error: "The AI service returned an error." };
    }

    const data = await res.json();
    const text = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();

    if (!text) return { ok: false, error: "The AI service returned an empty response." };
    return { ok: true, text };
  } catch (err) {
    console.error("Anthropic API call failed", err);
    return { ok: false, error: "Couldn't reach the AI service." };
  }
}
