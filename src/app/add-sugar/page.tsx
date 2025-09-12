"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

type Tag =
  | "fasting"
  | "premeal"
  | "postmeal"
  | "bedtime"
  | "exercise"
  | "other";

export default function AddSugarPage() {
  const [patientId, setPatientId] = useState<string | null>(null);
  const [dt, setDt] = useState<string>(() =>
    new Date().toISOString().slice(0, 16)
  );
  const [val, setVal] = useState<string>("");
  const [unit, setUnit] = useState<"mgdl" | "mmoll">("mgdl");
  const [tag, setTag] = useState<Tag>("fasting");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        window.location.href = "/";
        return;
      }
      const { data: p } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", uid)
        .maybeSingle();
      if (!p) {
        window.location.href = "/register";
        return;
      }
      setPatientId(p.id);
    })();
  }, []);

  function toMgdl(n: number, u: "mgdl" | "mmoll") {
    return u === "mgdl" ? n : Math.round(n * 18);
  }

  async function save() {
    setErr(null);
    if (!patientId) return;

    const n = Number(val);
    if (!Number.isFinite(n)) {
      setErr("Please enter a numeric value.");
      return;
    }
    const mgdl = Math.min(800, Math.max(20, toMgdl(n, unit)));
    const iso = new Date(dt).toISOString();

    setSaving(true);
    const { error } = await supabase.from("glucose_readings").insert({
      patient_id: patientId,
      datetime_utc: iso,
      mgdl,
      tag,
      note: note.trim() || null,
    });
    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }
    window.location.href = "/dashboard";
  }

  const quickTags: Tag[] = [
    "fasting",
    "premeal",
    "postmeal",
    "bedtime",
    "exercise",
    "other",
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* Header / Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-slate-900">
            Add Sugar Reading
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Log a new glucose value. Units are stored as mg/dL (mmol/L converted
            automatically).
          </p>
        </div>

        {/* Entry Card */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
          {/* Error banner */}
          {err && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {err}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Date time */}
            <div className="sm:col-span-2">
              <label className="text-sm text-slate-700">Date &amp; time</label>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                value={dt}
                onChange={(e) => setDt(e.target.value)}
              />
            </div>

            {/* Value */}
            <div>
              <label className="text-sm text-slate-700">Value</label>
              <input
                inputMode="decimal"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                placeholder={unit === "mgdl" ? "e.g., 154" : "e.g., 8.6"}
                value={val}
                onChange={(e) => setVal(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Accepted range: 20–800 mg/dL
              </p>
            </div>

            {/* Unit */}
            <div>
              <label className="text-sm text-slate-700">Unit</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
              >
                <option value="mgdl">mg/dL</option>
                <option value="mmoll">mmol/L</option>
              </select>
            </div>

            {/* Tag */}
            <div className="sm:col-span-2">
              <label className="text-sm text-slate-700">Time tag</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {quickTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTag(t)}
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs ring-1 transition
                      ${
                        tag === t
                          ? "bg-blue-600 text-white ring-blue-600"
                          : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
                      }`}
                    title={t}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <select
                className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                value={tag}
                onChange={(e) => setTag(e.target.value as Tag)}
              >
                <option value="fasting">Fasting</option>
                <option value="premeal">Pre-meal</option>
                <option value="postmeal">Post-meal</option>
                <option value="bedtime">Bedtime</option>
                <option value="exercise">Exercise</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Note */}
            <div className="sm:col-span-2">
              <label className="text-sm text-slate-700">Note (optional)</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., rice lunch, 30m walk"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDt(new Date().toISOString().slice(0, 16));
                setVal("");
                setTag("fasting");
                setUnit("mgdl");
                setNote("");
                setErr(null);
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </section>

        {/* Tips card (optional, matches theme) */}
        <section className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200/60">
          <div className="font-medium text-slate-800">Notes</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              mmol/L values are converted automatically (×18) to mg/dL for
              storage.
            </li>
            <li>
              For post-meal readings, log approximately 1–2 hours after starting
              a meal.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
