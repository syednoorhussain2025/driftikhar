"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { usePatient } from "../_context/PatientContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightFromBracket,
  faCheck,
  faRotateLeft,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { deleteMyAccount } from "./actions"; // ✅ server action

const MALE_AVATAR =
  "https://mnlnbuosiczjalpgeara.supabase.co/storage/v1/object/public/images/male%20profile.png";
const FEMALE_AVATAR =
  "https://mnlnbuosiczjalpgeara.supabase.co/storage/v1/object/public/images/female%20profile.png";

type DemographicsRow = {
  patient_id: string;
  full_name: string | null;
  mobile: string | null;
  city: string | null;
  age: number | null;
  gender: string | null;
  updated_at: string | null;
};

function avatarFor(g: "male" | "female" | "other" | "" | null | undefined) {
  return g === "female" ? FEMALE_AVATAR : MALE_AVATAR; // default to male avatar
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-slate-600 mb-1">{label}</div>
      {children}
      {hint ? <div className="text-xs text-slate-400 mt-1">{hint}</div> : null}
    </label>
  );
}

function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost";
  }
) {
  const { className, variant = "primary", ...rest } = props;
  const base =
    "inline-flex items-center gap-2 rounded-md text-sm font-medium px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-emerald-600 text-white hover:bg-emerald-700"
      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-300";
  return (
    <button {...rest} className={`${base} ${styles} ${className ?? ""}`} />
  );
}

export default function AccountPage() {
  const { patientId, name, demographics } = usePatient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth info (display only)
  const [email, setEmail] = useState<string>("");
  const [memberSince, setMemberSince] = useState<string>("");

  // Controlled inputs (pre-fill from context immediately)
  const [fullName, setFullName] = useState(
    demographics.full_name ?? name ?? ""
  );
  const [mobile, setMobile] = useState(demographics.mobile ?? "");
  const [city, setCity] = useState(demographics.city ?? "");
  const [age, setAge] = useState<number | "">(
    typeof demographics.age === "number" ? demographics.age : ""
  );
  const [gender, setGender] = useState<"male" | "female" | "other" | "">(
    (normalizeGender(demographics.gender) ?? "") as any
  );

  // Hydrate from auth + DB (by patients.id, not auth.uid)
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        if (user) {
          setEmail(user.email ?? "");
          setMemberSince(user.created_at ?? "");
        }

        if (patientId) {
          const { data, error: dErr } = await supabase
            .from("patient_demographics")
            .select(
              "patient_id, full_name, mobile, city, age, gender, updated_at"
            )
            .eq("patient_id", patientId)
            .maybeSingle<DemographicsRow>();
          if (dErr) throw dErr;

          if (data) {
            setFullName(data.full_name ?? fullName ?? "");
            setMobile(data.mobile ?? mobile ?? "");
            setCity(data.city ?? city ?? "");
            setAge(
              typeof data.age === "number" && !Number.isNaN(data.age)
                ? data.age
                : ""
            );
            setGender((normalizeGender(data.gender) ?? "") as any);
          }
        }
      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) {
      setError("Patient record not found (missing patients.id).");
      return;
    }
    setSaving(true);
    setError(null);

    const parsedAge =
      age === "" ? null : Number.isFinite(Number(age)) ? Number(age) : null;
    if (parsedAge !== null && parsedAge < 0) {
      setError("Age cannot be negative.");
      setSaving(false);
      return;
    }

    const updates = {
      patient_id: patientId,
      full_name: (fullName || "").trim() || null,
      mobile: (mobile || "").trim() || null,
      city: (city || "").trim() || null,
      age: parsedAge,
      gender: (gender || null) as "male" | "female" | "other" | null,
      updated_at: new Date().toISOString(),
    };

    const { error: upErr } = await supabase
      .from("patient_demographics")
      .upsert(updates, { onConflict: "patient_id" });

    if (upErr) setError(upErr.message);
    setSaving(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function handleDeleteAccount() {
    try {
      setError(null);

      // Simple double-confirm UX without extra dependencies
      const first = window.confirm(
        "This will permanently delete your account and all your data (glucose readings, demographics, etc.). This cannot be undone. Continue?"
      );
      if (!first) return;

      const second = prompt(
        "Type DELETE (in uppercase) to confirm permanent deletion:"
      );
      if (second !== "DELETE") return;

      setDeleting(true);

      // Server action: deletes auth.users row → cascades to dependent tables
      const res = await deleteMyAccount();

      if (!res?.ok) {
        throw new Error("Deletion failed.");
      }

      // Ensure local session is cleared and redirect to a safe page
      await supabase.auth.signOut();
      window.location.href = "/goodbye"; // or "/" if you don’t have a goodbye page
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="h-40 bg-slate-200 rounded" />
          <div className="h-24 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="border border-rose-200 bg-rose-50 text-rose-700 rounded p-3 text-sm">
          <div className="font-semibold mb-1">Error</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  const memberSinceLabel = memberSince
    ? new Date(memberSince).toLocaleString()
    : "—";

  const avatarUrl = avatarFor(
    gender || (normalizeGender(demographics.gender) as any)
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-slate-800">
          My Account
        </h1>
        <Button onClick={handleSignOut} variant="ghost" title="Sign out">
          <FontAwesomeIcon icon={faArrowRightFromBracket} className="w-4 h-4" />
          Sign out
        </Button>
      </div>

      {/* Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="p-4 md:p-6 border-b border-slate-200 flex items-center gap-5">
          <div className="shrink-0 h-20 w-20 md:h-24 md:w-24 rounded-full ring-2 ring-amber-300 p-0.5 bg-white overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt="Profile"
              className="h-full w-full rounded-full object-cover object-[50%_45%] origin-center scale-[1.2]"
            />
          </div>

          <div className="flex-1">
            <div className="text-lg font-medium leading-tight text-slate-800">
              {fullName || name || "—"}
            </div>
            <div className="text-sm text-slate-500">{email || "—"}</div>
            <div className="text-xs text-slate-400 mt-0.5">
              Member since: {memberSinceLabel}
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full Name">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Your full name"
                required
              />
            </Field>

            <Field label="Email (read-only)" hint="Your Registered Email">
              <input
                type="email"
                value={email}
                readOnly
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
              />
            </Field>

            <Field label="Mobile">
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="+92 ..."
              />
            </Field>

            <Field label="City">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Lahore"
              />
            </Field>

            <Field label="Age">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={age === "" ? "" : String(age)}
                onChange={(e) => {
                  const v = e.target.value;
                  setAge(v === "" ? "" : Number(v));
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., 42"
              />
            </Field>

            <Field label="Gender">
              <select
                value={gender}
                onChange={(e) =>
                  setGender(e.target.value as "male" | "female" | "other" | "")
                }
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFullName(demographics.full_name ?? name ?? "");
                setMobile(demographics.mobile ?? "");
                setCity(demographics.city ?? "");
                setAge(
                  typeof demographics.age === "number" ? demographics.age : ""
                );
                setGender(
                  (normalizeGender(demographics.gender) ?? "") as
                    | "male"
                    | "female"
                    | "other"
                    | ""
                );
              }}
            >
              <FontAwesomeIcon icon={faRotateLeft} className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="mt-6 bg-white border border-rose-200 rounded-xl p-4 md:p-6">
        <div className="text-sm font-semibold text-rose-700 mb-2">
          Delete Account
        </div>
        <div className="text-xs text-rose-700/80 mb-3">
          Permanently delete your account and all associated data (including
          glucose readings). This action cannot be undone.
        </div>
        <Button
          variant="ghost"
          onClick={handleDeleteAccount}
          disabled={deleting}
          title="Permanently delete account"
          className="border border-rose-300 text-rose-700 hover:bg-rose-50"
        >
          <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
          {deleting ? "Deleting…" : "Delete my account"}
        </Button>
      </div>
    </div>
  );
}

function normalizeGender(g: string | null | undefined) {
  if (!g) return null;
  const v = g.trim().toLowerCase();
  if (v === "male" || v === "female" || v === "other") return v;
  if (v.startsWith("m")) return "male";
  if (v.startsWith("f")) return "female";
  return "other";
}
