import "server-only";

/**
 * SMS delivery abstraction — same pattern as email.ts. Shaped around
 * a Twilio-like provider (to/body only, since SMS has no subject) but
 * intentionally provider-agnostic; swap sendSms()'s body for whichever
 * gateway serves Bangladesh numbers in production (Twilio, a local
 * aggregator, etc.).
 */

export interface SmsMessage {
  to: string; // E.164, e.g. +8801XXXXXXXXX
  body: string;
}

export function isSmsConfigured(): boolean {
  return !!process.env.SMS_PROVIDER_API_KEY;
}

export async function sendSms(message: SmsMessage): Promise<{ ok: boolean; error?: string }> {
  if (!isSmsConfigured()) {
    console.log(`[sms:not-configured] would send to ${message.to}: "${message.body}"`);
    return { ok: true };
  }

  // Example shape for a real provider (uncomment and adapt):
  //
  // const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
  //     "content-type": "application/x-www-form-urlencoded",
  //   },
  //   body: new URLSearchParams({ To: message.to, From: fromNumber, Body: message.body }),
  // });
  // if (!res.ok) return { ok: false, error: await res.text() };

  return { ok: true };
}
