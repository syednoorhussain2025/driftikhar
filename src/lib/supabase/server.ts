import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

export function createClient() {
  // In Next 15, cookies() may be typed as Promise<ReadonlyRequestCookies> in some contexts.
  // We adapt it defensively and keep types happy.
  const cookieStore = cookies() as unknown as {
    get?: (name: string) => { value?: string } | undefined;
    set?: (opts: { name: string; value: string } & CookieOptions) => void;
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Works in both RSC (read-only) and Server Actions/Routes.
          try {
            return cookieStore?.get?.(name)?.value;
          } catch {
            return undefined;
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          // In RSC, .set is not available; in Actions/Routes it is.
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
    }
  );
}
