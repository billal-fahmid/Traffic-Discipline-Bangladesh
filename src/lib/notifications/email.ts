import "server-only";

/**
 * Email delivery abstraction. Swap the body of send() for a real
 * provider (Resend, SES, Postmark, etc.) — every call site in this
 * app goes through this one function, so that's the only place that
 * needs to change. With no provider configured, it logs to the
 * server console instead of failing, so the rest of the notification
 * flow (in-app rows, etc.) still works end-to-end in development.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export function isEmailConfigured(): boolean {
  return !!process.env.EMAIL_PROVIDER_API_KEY;
}

export async function sendEmail(message: EmailMessage): Promise<{ ok: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.log(`[email:not-configured] would send to ${message.to}: "${message.subject}"`);
    return { ok: true };
  }

  // Example shape for a real provider (uncomment and adapt):
  //
  // const res = await fetch("https://api.resend.com/emails", {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Bearer ${process.env.EMAIL_PROVIDER_API_KEY}`,
  //     "content-type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     from: "Traffic Discipline Bangladesh <no-reply@yourdomain.example>",
  //     to: message.to,
  //     subject: message.subject,
  //     text: message.body,
  //   }),
  // });
  // if (!res.ok) return { ok: false, error: await res.text() };

  return { ok: true };
}
