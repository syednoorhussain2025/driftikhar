import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

/**
 * Create a Supabase client for server components / route handlers.
 * Call inside a server function (not at module top).
 */
export function createClient() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  // Defensive cookies adapter for Next 15
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
          /* no-op in read-only contexts */
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore?.set?.({ name, value: "", ...options });
        } catch {
          /* no-op in read-only contexts */
        }
      },
    },
  });
}
