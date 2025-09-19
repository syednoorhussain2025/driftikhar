"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

/**
 * Permanently delete the currently authenticated user.
 * This calls the Supabase Admin API (service role), which deletes the row in auth.users.
 * Given your schema's ON DELETE CASCADE, that removal cascades to:
 *   profiles.user_id → patients.user_id → patient_demographics.patient_id → glucose_readings.patient_id
 */
export async function deleteMyAccount() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase URL or anon key is missing.");
  }
  if (!SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your server env."
    );
  }

  // 1) Read current user from auth cookies (server-side)
  const cookieStore = cookies();
  const server = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        // @ts-ignore-next-line
        return cookieStore.get(name)?.value;
      },
      set() {
        /* no-op: we don't mutate cookies here */
      },
      remove() {
        /* no-op */
      },
    },
  });

  const {
    data: { user },
    error: userErr,
  } = await server.auth.getUser();

  if (userErr) {
    throw new Error(userErr.message || "Unable to read current user.");
  }
  if (!user) {
    throw new Error("Not authenticated.");
  }

  // 2) Use Admin client to delete the user (this bypasses RLS)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    throw new Error(delErr.message || "Failed to delete user.");
  }

  // (Optional) You could also perform any storage cleanup here if needed.

  return { ok: true };
}
