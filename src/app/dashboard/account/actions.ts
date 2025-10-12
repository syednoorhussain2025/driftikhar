"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Permanently delete the currently authenticated user.
 * Returns a plain object (no throws, no Response) to keep the client flow predictable.
 * If your DB relies on ON DELETE CASCADE from auth.users → domain tables, this is sufficient.
 * Otherwise, delete child rows first (see commented section).
 */
export async function deleteMyAccount(): Promise<ActionResult> {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, error: "Supabase URL or anon key is missing." };
  }
  if (!SERVICE_ROLE_KEY) {
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your server env.",
    };
  }

  // Build an anon server client bound to the user's auth cookies
  const cookieStore = cookies();
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

  // Identify current user
  const {
    data: { user },
    error: userErr,
  } = await server.auth.getUser();

  if (userErr) {
    return {
      ok: false,
      error: userErr.message || "Unable to read current user.",
    };
  }
  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }

  const userId = user.id;

  // (Optional) If you do NOT have ON DELETE CASCADE, uncomment and adjust:
  // try {
  //   // Look up domain primary key(s) then delete child rows first
  //   const { data: patient, error: pErr } = await server
  //     .from("patients")
  //     .select("id")
  //     .eq("user_id", userId)
  //     .maybeSingle();
  //   if (pErr) return { ok: false, error: pErr.message };
  //   const patientId = patient?.id;
  //   if (patientId) {
  //     const del1 = await server.from("patient_demographics").delete().eq("patient_id", patientId);
  //     if (del1.error) return { ok: false, error: del1.error.message };
  //     // const del2 = await server.from("glucose_readings").delete().eq("patient_id", patientId);
  //     // if (del2.error) return { ok: false, error: del2.error.message };
  //     const del3 = await server.from("patients").delete().eq("id", patientId);
  //     if (del3.error) return { ok: false, error: del3.error.message };
  //   }
  // } catch (e) {
  //   const msg = e instanceof Error ? e.message : String(e);
  //   return { ok: false, error: msg };
  // }

  // Use admin client to delete auth user (bypasses RLS)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    return { ok: false, error: delErr.message || "Failed to delete user." };
  }

  // (Optional) storage cleanup could be performed here if you store user files

  return { ok: true };
}
