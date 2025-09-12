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
    if (!patientId) return;
    const n = Number(val);
    if (!Number.isFinite(n)) {
      alert("Enter a number");
      return;
    }
    const mgdl = Math.min(800, Math.max(20, toMgdl(n, unit)));
    const iso = new Date(dt).toISOString();
    const { error } = await supabase.from("glucose_readings").insert({
      patient_id: patientId,
      datetime_utc: iso,
      mgdl,
      tag,
      note: note.trim() || null,
    });
    if (error) {
      alert(error.message);
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Add Sugar</h1>
      <div className="mt-4 grid gap-3">
        <label className="text-sm">Date & time</label>
        <input
          type="datetime-local"
          className="w-full rounded-xl border px-3 py-2"
          value={dt}
          onChange={(e) => setDt(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Value</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder={unit === "mgdl" ? "e.g., 154" : "e.g., 8.6"}
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm">Unit</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={unit}
              onChange={(e) => setUnit(e.target.value as any)}
            >
              <option value="mgdl">mg/dL</option>
              <option value="mmoll">mmol/L</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm">Time tag</label>
          <select
            className="mt-1 w-full rounded-xl border px-3 py-2"
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
        <div>
          <label className="text-sm">Note (optional)</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., rice lunch, 30m walk"
          />
        </div>
        <button
          onClick={save}
          className="w-full rounded-xl bg-[#00b78b] py-2 font-semibold text-white"
        >
          Save
        </button>
      </div>
    </main>
  );
}
