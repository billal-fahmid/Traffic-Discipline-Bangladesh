import "server-only";

/**
 * Web Push abstraction. Subscriptions are already stored for real
 * (push_subscriptions table, subscribe/unsubscribe server actions in
 * src/app/dashboard/push-actions.ts) — what's stubbed here is the
 * actual send, which needs VAPID keys and the `web-push` package (or
 * an equivalent) wired in. Until PUSH_VAPID_PRIVATE_KEY is set, this
 * logs instead of sending, exactly like email.ts/sms.ts.
 */

export interface PushMessage {
  title: string;
  body: string;
  url?: string;
}

export function isPushConfigured(): boolean {
  return !!process.env.PUSH_VAPID_PRIVATE_KEY && !!process.env.NEXT_PUBLIC_PUSH_VAPID_PUBLIC_KEY;
}

export async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; authKey: string },
  message: PushMessage
): Promise<{ ok: boolean; error?: string }> {
  if (!isPushConfigured()) {
    console.log(`[push:not-configured] would send "${message.title}" to ${subscription.endpoint.slice(0, 40)}…`);
    return { ok: true };
  }

  // Production implementation sketch (needs the `web-push` package):
  //
  // import webpush from "web-push";
  // webpush.setVapidDetails(
  //   "mailto:admin@yourdomain.example",
  //   process.env.NEXT_PUBLIC_PUSH_VAPID_PUBLIC_KEY!,
  //   process.env.PUSH_VAPID_PRIVATE_KEY!
  // );
  // await webpush.sendNotification(
  //   { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.authKey } },
  //   JSON.stringify(message)
  // );

  return { ok: true };
}
