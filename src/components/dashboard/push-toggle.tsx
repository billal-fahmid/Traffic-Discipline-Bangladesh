"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { savePushSubscription, removePushSubscription } from "@/app/dashboard/push-actions";
import { Bell, BellOff, Loader2 } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Push notification opt-in for the citizen dashboard. Degrades
 * gracefully in three ways: no service worker support, no VAPID
 * public key configured, or the user simply declining the browser
 * permission prompt — in every case it just shows as "not available"
 * rather than erroring.
 */
export function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [pending, setPending] = useState(false);
  const vapidKey = process.env.NEXT_PUBLIC_PUSH_VAPID_PUBLIC_KEY;

  useEffect(() => {
    setSupported("serviceWorker" in navigator && "PushManager" in window && !!vapidKey);
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setSubscribed(!!sub))
        .catch(() => {});
    }
  }, [vapidKey]);

  async function enable() {
    if (!vapidKey) return;
    setPending(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = sub.toJSON();
      await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        authKey: json.keys?.auth ?? "",
      });
      setSubscribed(true);
    } catch (e) {
      console.error("push subscribe failed", e);
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setPending(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setPending(false);
    }
  }

  if (!supported) return null;

  return (
    <Button size="sm" variant="outline" onClick={subscribed ? disable : enable} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : subscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {subscribed ? "Disable Push Notifications" : "Enable Push Notifications"}
    </Button>
  );
}
