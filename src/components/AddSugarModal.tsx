"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faFlask,
  faClock,
  faHashtag,
} from "@fortawesome/free-solid-svg-icons";

type Props = {
  patientId: string | null;
  onClose: () => void;
  onSaved?: () => void; // called after successful insert
};

type Unit = "mgdl" | "mmol";
type UiType = "fasting" | "2h_breakfast" | "pre_lunch" | "2h_lunch" | "random";
type DbTag = UiType; // DB enum matches UI exactly

// UI options → DB tag (new taxonomy only)
const TYPE_OPTIONS: { value: UiType; label: string; dbTag: DbTag }[] = [
  { value: "fasting", label: "Fasting", dbTag: "fasting" },
  {
    value: "2h_breakfast",
    label: "2Hrs after Breakfast",
    dbTag: "2h_breakfast",
  },
  { value: "pre_lunch", label: "Pre Lunch", dbTag: "pre_lunch" },
  { value: "2h_lunch", label: "2Hrs after Lunch", dbTag: "2h_lunch" },
  { value: "random", label: "Random", dbTag: "random" },
];

// helpers
function toMgdl(value: number, unit: Unit) {
  return unit === "mgdl" ? Math.round(value) : Math.round(value * 18);
}
function nowLocalDatetimeValue() {
  // "YYYY-MM-DDTHH:mm" for <input type="datetime-local">
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}

export default function AddSugarModal({ patientId, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const [dtLocal, setDtLocal] = useState(nowLocalDatetimeValue());
  const [unit, setUnit] = useState<Unit>("mgdl");
  const [value, setValue] = useState<string>("");
  const [uiType, setUiType] = useState<UiType>("fasting");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMeta = useMemo(
    () => TYPE_OPTIONS.find((t) => t.value === uiType)!,
    [uiType]
  );

  // close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // click outside to close
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!dialogRef.current) return;
      if (!dialogRef.current.contains(e.target as Node)) onClose();
    }
    const overlay = document.getElementById("add-sugar-overlay");
    overlay?.addEventListener("mousedown", onClick);
    return () => overlay?.removeEventListener("mousedown", onClick);
  }, [onClose]);

  async function handleSave() {
    setError(null);

    if (!patientId) {
      setError("Missing patient id.");
      return;
    }
    const num = Number(value);
    if (!Number.isFinite(num)) {
      setError("Enter a valid sugar value.");
      return;
    }
    const mgdl = toMgdl(num, unit);
    if (mgdl < 20 || mgdl > 800) {
      setError("Value out of allowed range (20–800 mg/dL).");
      return;
    }
    if (!dtLocal) {
      setError("Pick a date and time.");
      return;
    }

    // interpret local datetime as local time, store to UTC
    const isoUtc = new Date(dtLocal).toISOString();

    setSubmitting(true);
    const payload = {
      patient_id: patientId,
      datetime_utc: isoUtc,
      mgdl,
      tag: selectedMeta.dbTag as any, // exact enum label in DB
      // note: intentionally omitted; taxonomy is fully captured by tag
    };

    const { error } = await supabase.from("glucose_readings").insert(payload);

    setSubmitting(false);
    if (error) {
      setError(error.message || "Failed to save reading.");
      return;
    }

    onSaved?.();
    onClose();
  }

  return (
    <div
      id="add-sugar-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FontAwesomeIcon icon={faFlask} />
            Add Sugar
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="px-5 py-4">
          {/* Date / Time */}
          <label className="block text-sm text-slate-700">
            Date &amp; time
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-200">
                <FontAwesomeIcon icon={faClock} />
              </span>
              <input
                type="datetime-local"
                value={dtLocal}
                onChange={(e) => setDtLocal(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
              />
            </div>
          </label>

          {/* Sugar value + unit */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <label className="col-span-2 block text-sm text-slate-700">
              Sugar value
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-200">
                  <FontAwesomeIcon icon={faHashtag} />
                </span>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder={unit === "mgdl" ? "e.g., 120" : "e.g., 6.7"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                />
              </div>
            </label>

            <label className="block text-sm text-slate-700">
              Unit
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2"
              >
                <option value="mgdl">mg/dL</option>
                <option value="mmol">mmol/L</option>
              </select>
            </label>
          </div>

          {/* Type selector */}
          <fieldset className="mt-4">
            <legend className="mb-1 block text-sm text-slate-700">Type</legend>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((opt) => {
                const active = uiType === opt.value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setUiType(opt.value)}
                    className={[
                      "rounded-full px-3 py-1 text-sm ring-1 transition focus:outline-none focus:ring-2",
                      active
                        ? "bg-emerald-600 text-white ring-emerald-600"
                        : "bg-white text-emerald-900 ring-emerald-300 hover:bg-emerald-100",
                    ].join(" ")}
                    aria-pressed={active}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Validation/Error */}
          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
