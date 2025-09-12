// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

/**
 * Create a Supabase client for server components / route handlers.
 * - Safe with Next.js 15 (cookies() may be read-only or appear async in types).
 * - Does not execute at import-time; call createClient() inside your handler.
 * - Throws a clear error only when invoked and envs are missing.
 */
export function createClient() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Fail fast with a helpful message if someone calls this without envs set.
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  // In Next 15, cookies() may be typed as Promise<ReadonlyRequestCookies> in some contexts.
  // We adapt it defensively and keep types happy.
  const cookieStore = cookies() as unknown as {
    get?: (name: string) => { value?: string } | undefined;
    set?: (opts: { name: string; value: string } & CookieOptions) => void;
  };

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        try {
          return cookieStore?.get?.(name)?.value;
        } catch {
          return undefined;
        }
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore?.set?.({ name, value, ...options });
        } catch {
          /* no-op in read-only contexts (RSC) */
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore?.set?.({ name, value: "", ...options });
        } catch {
          /* no-op in read-only contexts (RSC) */
        }
      },
    },
  });
}
