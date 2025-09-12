"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client:
 * - Never instantiates on the server.
 * - Lazy-initialized on first client access.
 * - Throws if accidentally used on the server.
 */
let _client: SupabaseClient | null = null;

export const supabase: SupabaseClient = (() => {
  if (typeof window === "undefined") {
    // Prevent accidental server-side usage of the browser client.
    return new Proxy({} as SupabaseClient, {
      get() {
        throw new Error(
          "The browser Supabase client is not available on the server. Use server helpers in server contexts."
        );
      },
    }) as unknown as SupabaseClient;
  }

  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for browser client."
      );
    }
    _client = createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return _client;
})();
