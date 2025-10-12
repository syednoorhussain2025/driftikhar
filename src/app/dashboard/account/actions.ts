"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Permanently deletes the currently authenticated user.
 * - Reads the user from auth cookies (server-side)
 * - Uses the service-role key to delete the auth user (bypasses RLS)
 * - Returns a plain JSON object (no throws), preventing Server Components render errors
 *
 * If your DB does not use ON DELETE CASCADE for domain tables linked to auth.users,
 * delete child rows manually before the admin delete (see commented section).
 */
export async function deleteMyAccount(): Promise<ActionResult> {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, error: "Supabase URL or anon key is missing." };
  }
  if (!SERVICE_ROLE_KEY) {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not set." };
  }

  // Next.js 15: cookies() is async in server actions
  const cookieStore = await cookies();

  // Server-side anon client bound to the caller's auth cookies
  const server = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {
        /* no-op */
      },
      remove() {
        /* no-op */
      },
    },
  });

  // Identify the current user
  const {
    data: { user },
    error: userErr,
  } = await server.auth.getUser();

  if (userErr)
    return {
      ok: false,
      error: userErr.message || "Unable to read current user.",
    };
  if (!user) return { ok: false, error: "Not authenticated." };

  const userId = user.id;

  // ---------------------------------------------------------------------------
  // OPTIONAL: If you do NOT have ON DELETE CASCADE, delete dependent rows first.
  // ---------------------------------------------------------------------------
  // try {
  //   const { data: patient, error: pErr } = await server
  //     .from("patients")
  //     .select("id")
  //     .eq("user_id", userId)
  //     .maybeSingle();
  //   if (pErr) return { ok: false, error: pErr.message };
  //
  //   const patientId = patient?.id;
  //   if (patientId) {
  //     const delDemo = await server.from("patient_demographics").delete().eq("patient_id", patientId);
  //     if (delDemo.error) return { ok: false, error: delDemo.error.message };
  //
  //     // Example: other child tables
  //     // const delReadings = await server.from("glucose_readings").delete().eq("patient_id", patientId);
  //     // if (delReadings.error) return { ok: false, error: delReadings.error.message };
  //
  //     const delPatient = await server.from("patients").delete().eq("id", patientId);
  //     if (delPatient.error) return { ok: false, error: delPatient.error.message };
  //   }
  // } catch (e) {
  //   const msg = e instanceof Error ? e.message : String(e);
  //   return { ok: false, error: msg };
  // }

  // Admin client (service role) to delete the auth user; bypasses RLS
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr)
    return { ok: false, error: delErr.message || "Failed to delete user." };

  // Optional: perform storage cleanup if you keep user files in buckets

  return { ok: true };
}
