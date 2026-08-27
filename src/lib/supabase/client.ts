"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client. Uses the anon key, so it is always
 * subject to Row Level Security — never the service role key here.
 *
 * The real client is constructed lazily on first use. Client components
 * call createClient() during render (usually in a useMemo), which also
 * runs once on the server while Next.js prerenders the page at build
 * time. `createBrowserClient` throws synchronously if the URL/key are
 * missing, so constructing it eagerly there would fail the build on any
 * environment that hasn't set NEXT_PUBLIC_SUPABASE_* yet. Deferring the
 * construction to the first actual `.from()` / `.auth` call — which only
 * happens in the browser, inside effects and handlers — keeps prerender
 * safe while still surfacing a clear error at runtime if the env is
 * genuinely misconfigured.
 */
let client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}

export function createClient(): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get(_target, prop, receiver) {
      const real = getClient();
      const value = Reflect.get(real as object, prop, receiver);
      return typeof value === "function" ? value.bind(real) : value;
    },
  });
}
