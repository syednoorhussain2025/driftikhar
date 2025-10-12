"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Permanently deletes the currently authenticated user and their data.
 * Accepts an optional JWT from the client (to avoid "Auth session missing" when cookies
 * are not available on the server action call). Falls back to reading cookies.
 *
 * Adjust table names in the "Domain deletes" section to match your schema.
 */
export async function deleteMyAccount(jwt?: string): Promise<ActionResult> {
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

  // 1) Identify current user (prefer JWT; otherwise use cookies)
  const serverAnon = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });

  let userId: string;
  {
    const { data, error } = jwt
      ? await serverAnon.auth.getUser(jwt)
      : await serverAnon.auth.getUser();

    if (error)
      return { ok: false, error: `Auth read failed: ${error.message}` };
    if (!data?.user) return { ok: false, error: "Not authenticated." };
    userId = data.user.id;
  }

  // 2) Service-role client (bypasses RLS) for domain deletes + admin delete
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // -----------------------
  // Domain deletes (optional)
  // -----------------------
  // If you have ON DELETE CASCADE from auth.users -> domain tables, you can skip this.
  try {
    // Example: locate a patient row tied to this user
    const { data: patient, error: pErr } = await admin
      .from("patients")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (pErr)
      return { ok: false, error: `Lookup patients failed: ${pErr.message}` };

    const patientId = patient?.id;

    if (patientId) {
      // Delete child rows referencing patient_id (adjust to your schema)
      const delDemo = await admin
        .from("patient_demographics")
        .delete()
        .eq("patient_id", patientId);
      if (delDemo.error)
        return {
          ok: false,
          error: `Delete demographics failed: ${delDemo.error.message}`,
        };

      // Example for other tables:
      // const delReadings = await admin.from("glucose_readings").delete().eq("patient_id", patientId);
      // if (delReadings.error)
      //   return { ok: false, error: `Delete readings failed: ${delReadings.error.message}` };

      // Finally delete the patient row
      const delPatient = await admin
        .from("patients")
        .delete()
        .eq("id", patientId);
      if (delPatient.error)
        return {
          ok: false,
          error: `Delete patient failed: ${delPatient.error.message}`,
        };
    }

    // If you keep a profiles table keyed by user_id, delete it too:
    // const delProfile = await admin.from("profiles").delete().eq("user_id", userId);
    // if (delProfile.error)
    //   return { ok: false, error: `Delete profile failed: ${delProfile.error.message}` };

    // (Optional) Storage cleanup if you store user files in buckets
    // await admin.storage.from("user-assets").remove([...paths]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Domain deletes error: ${msg}` };
  }

  // 3) Delete the auth user (must be last)
  const { error: delAuthErr } = await admin.auth.admin.deleteUser(userId);
  if (delAuthErr)
    return { ok: false, error: `Auth delete failed: ${delAuthErr.message}` };

  return { ok: true };
}
