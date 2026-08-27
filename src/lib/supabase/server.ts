import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for Server Components / Server Actions.
 * Reads/writes the auth cookie via Next's cookies() API.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component with no writable cookie store —
            // safe to ignore as long as middleware.ts refreshes sessions.
          }
        },
      },
    }
  );
}

/**
 * Admin client using the service role key. Bypasses RLS entirely.
 * Server-only: never import this from a Client Component. Used for
 * privileged actions like role assignment and storage cleanup.
 */
export async function createAdminClient() {
  const { createClient: createRawClient } = await import("@supabase/supabase-js");
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Anon-key client that never touches cookies() — for genuinely public,
 * unauthenticated reads only (the public dashboard/map RPCs, which are
 * SECURITY DEFINER functions granted to `anon` and don't care about a
 * session either way). Using this instead of the cookie-based
 * createClient() above is what actually lets a page keep its static/ISR
 * rendering: calling cookies() from next/headers (inside the regular
 * server client) unconditionally opts a route into fully dynamic
 * rendering in the Next.js App Router, silently overriding any
 * `export const revalidate` on the page. Never use this for anything
 * that depends on who's signed in — it has no session awareness at all.
 */
export async function createPublicClient() {
  const { createClient: createRawClient } = await import("@supabase/supabase-js");
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
