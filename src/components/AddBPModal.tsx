"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type BPReading = {
  id: string;
  patient_id: string;
  datetime_utc: string;
  systolic: number;
  diastolic: number;
  note: string | null;
  created_at?: string;
};

type Props = {
  patientId: string;
  open: boolean;
  onClose: () => void;
  onAdded?: () => void; // refresh callback (used for both add & edit)
  selectedReading?: BPReading | null; // when provided => EDIT mode
};

export default function AddBPModal({
  patientId,
  open,
  onClose,
  onAdded,
  selectedReading,
}: Props) {
  const isEdit = !!selectedReading;

  // -------------------- state --------------------
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [sys, setSys] = useState<number | "">("");
  const [dia, setDia] = useState<number | "">("");
  const [note, setNote] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // -------------------- helpers --------------------
  function pad2(n: number) {
    return String(n).padStart(2, "0");
  }

  /** local date+time -> ISO UTC */
  function asUTC(dateStr: string, timeStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    // new Date(y, m-1, d, hh, mm) is already in local time; .toISOString() converts to UTC correctly
    return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0).toISOString();
  }

  /** ISO UTC -> local YYYY-MM-DD & HH:MM */
  function toLocalInputs(utcIso: string): { date: string; time: string } {
    const dt = new Date(utcIso);
    const yyyy = dt.getFullYear();
    const mm = pad2(dt.getMonth() + 1);
    const dd = pad2(dt.getDate());
    const hh = pad2(dt.getHours());
    const mi = pad2(dt.getMinutes());
    return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
  }

  function classifyBP(s?: number, d?: number) {
    if (!s || !d) return null;
    if (s >= 180 || d >= 120)
      return {
        label: "Hypertensive crisis",
        tone: "text-rose-700 bg-rose-50 border-rose-200",
      };
    if (s >= 140 || d >= 90)
      return {
        label: "Hypertension Stage 2",
        tone: "text-rose-700 bg-rose-50 border-rose-200",
      };
    if ((s >= 130 && s <= 139) || (d >= 80 && d <= 89))
      return {
        label: "Hypertension Stage 1",
        tone: "text-amber-700 bg-amber-50 border-amber-200",
      };
    if (s >= 120 && d < 80)
      return {
        label: "Elevated",
        tone: "text-amber-700 bg-amber-50 border-amber-200",
      };
    if (s < 90 || d < 60)
      return {
        label: "Low (contextual)",
        tone: "text-slate-700 bg-slate-50 border-slate-200",
      };
    return {
      label: "Normal",
      tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    };
  }

  const category = useMemo(
    () =>
      classifyBP(
        typeof sys === "number" ? sys : undefined,
        typeof dia === "number" ? dia : undefined
      ),
    [sys, dia]
  );

  function validate(s: number, d: number): string | null {
    if (!(s > 0 && d > 0 && d < s))
      return "Check values: diastolic must be less than systolic.";
    if (s < 60 || s > 260)
      return "Systolic is out of supported range (60–260).";
    if (d < 30 || d > 150)
      return "Diastolic is out of supported range (30–150).";
    return null;
  }

  // -------------------- effects (always called) --------------------
  // Initialize fields whenever modal opens or selection changes.
  useEffect(() => {
    if (!open) return; // only initialize when opening
    setError(null);
    if (selectedReading) {
      const { date: ld, time: lt } = toLocalInputs(
        selectedReading.datetime_utc
      );
      setDate(ld);
      setTime(lt);
      setSys(selectedReading.systolic);
      setDia(selectedReading.diastolic);
      setNote(selectedReading.note ?? "");
    } else {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = pad2(now.getMonth() + 1);
      const dd = pad2(now.getDate());
      const hh = pad2(now.getHours());
      const mi = pad2(now.getMinutes());
      setDate(`${yyyy}-${mm}-${dd}`);
      setTime(`${hh}:${mi}`);
      setSys("");
      setDia("");
      setNote("");
    }
  }, [open, selectedReading]);

  // Lock background scroll while open
  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [open]);

  // Escape to close while open
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  // Autofocus systolic input (not date/time, which opens native picker on mobile)
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLInputElement>("input[type='number']")?.focus();
  }, [open]);

  // -------------------- actions --------------------
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!patientId) {
      setError("Missing patient id.");
      return;
    }
    if (sys === "" || dia === "") {
      setError("Please enter both systolic and diastolic values.");
      return;
    }
    const s = Number(sys);
    const d = Number(dia);
    const valErr = validate(s, d);
    if (valErr) {
      setError(valErr);
      return;
    }

    setSaving(true);
    const datetime_utc = asUTC(date, time);
    const payload = {
      patient_id: patientId,
      datetime_utc,
      systolic: s,
      diastolic: d,
      note: note.trim() || null,
    };

    let dbErr: { message: string } | null = null;

    if (isEdit && selectedReading) {
      const { error } = await supabase
        .from("bp_readings")
        .update(payload)
        .eq("id", selectedReading.id);
      dbErr = error;
    } else {
      const { error } = await supabase.from("bp_readings").insert(payload);
      dbErr = error;
    }

    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }

    onAdded?.();
    onClose();
  }

  // -------------------- render (no early return) --------------------
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => {
          if (!saving) onClose();
        }}
      />
      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-xl bg-white shadow-lg border border-slate-200 p-4"
      >
        <div className="text-base font-semibold text-slate-800 mb-3">
          {isEdit ? "Edit Blood Pressure" : "Add Blood Pressure"}
        </div>

        {error && (
          <div className="mb-3 text-xs rounded border border-rose-200 bg-rose-50 text-rose-700 p-2">
            {error}
          </div>
        )}

        {category && (
          <div
            className={`mb-3 text-xs rounded border px-2 py-1 inline-block ${category.tone}`}
          >
            {category.label}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-600">
              <div className="mb-1">Date</div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </label>

            <label className="text-xs text-slate-600">
              <div className="mb-1">Time</div>
              <input
                type="time"
                step={60}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-600">
              <div className="mb-1">Systolic (upper)</div>
              <input
                type="number"
                inputMode="numeric"
                min={60}
                max={260}
                value={sys === "" ? "" : String(sys)}
                onChange={(e) =>
                  setSys(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., 120"
                required
              />
            </label>

            <label className="text-xs text-slate-600">
              <div className="mb-1">Diastolic (lower)</div>
              <input
                type="number"
                inputMode="numeric"
                min={30}
                max={150}
                value={dia === "" ? "" : String(dia)}
                onChange={(e) =>
                  setDia(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., 80"
                required
              />
            </label>
          </div>

          <label className="text-xs text-slate-600 block">
            <div className="mb-1">Note (optional)</div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Post-walk, after meds, etc."
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => !saving && onClose()}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-2 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : isEdit ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
