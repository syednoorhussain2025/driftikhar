// src/app/dashboard/graphs/page.tsx
"use client";

import { useMemo, useState } from "react";
import { usePatient } from "../_context/PatientContext";
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faCalendarDays,
  faLayerGroup,
  faMoon,
  faMugSaucer,
  faUtensils,
  faClock,
  faShuffle,
} from "@fortawesome/free-solid-svg-icons";

/* ----------------------------- Utils ----------------------------- */

function mean(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : NaN;
}
function format(n: number, d = 1) {
  return Number.isFinite(n) ? n.toFixed(d) : "—";
}
function estA1cFromMean(mgdl: number) {
  return (mgdl + 46.7) / 28.7;
}

const MS_PER_DAY = 86_400_000;
const WINDOW_DAYS = 30;

const dateTick = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "2-digit",
}).format;
const tooltipDate = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}).format;
const shortDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "2-digit",
}).format;

/* ----------------------------- Types & UI ----------------------------- */

type UiType =
  | "all"
  | "fasting"
  | "2h_breakfast"
  | "pre_lunch"
  | "2h_lunch"
  | "random";

const UI_TYPES: { value: UiType; label: string; icon: any }[] = [
  { value: "all", label: "All types", icon: faLayerGroup },
  { value: "fasting", label: "Fasting", icon: faMoon },
  { value: "2h_breakfast", label: "2Hrs after Breakfast", icon: faMugSaucer },
  { value: "pre_lunch", label: "Pre Lunch", icon: faUtensils },
  { value: "2h_lunch", label: "2Hrs after Lunch", icon: faClock },
  { value: "random", label: "Random", icon: faShuffle },
];

/* ------------------------ Tooltip ------------------------ */

function tooltipColorClasses(val?: number) {
  if (!Number.isFinite(val))
    return {
      wrap: "bg-slate-600/85 text-white ring-slate-700/50",
      status: "bg-white/25 text-white",
      meta: "text-white/85",
      label: "Unknown",
    };
  if ((val as number) < 5.7)
    return {
      wrap: "bg-emerald-400/85 text-white ring-emerald-500/50",
      status: "bg-white/25 text-white",
      meta: "text-white/90",
      label: "Normal",
    };
  return {
    wrap: "bg-red-500/85 text-white ring-red-600/50",
    status: "bg-white/25 text-white",
    meta: "text-white/90",
    label: (val as number) < 6.5 ? "High (Prediabetes)" : "High (Diabetes)",
  };
}

function A1cTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0]?.value as number | undefined;
  const d = new Date(label);
  const c = tooltipColorClasses(val);

  return (
    <div className={`max-w-[260px] rounded-xl p-3 shadow-lg ring-1 ${c.wrap}`}>
      <div className="text-xs">{tooltipDate(d)}</div>
      <div className="mt-2 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] ${c.status}`}>
          Est. HbA1c
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] ${c.status}`}>
          {c.label}
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">
        {Number.isFinite(val) ? `${val!.toFixed(2)}%` : "—"}
      </div>
      <div className={`mt-1 text-[11px] ${c.meta}`}>
        Target: <span className="font-medium">&lt; 5.7%</span>
      </div>
    </div>
  );
}

/* =============================== Page =============================== */

export default function SugarGraphsPage() {
  const { readings } = usePatient();

  const [rangeDays, setRangeDays] = useState<30 | 60 | 90 | 180 | 365 | 0>(90);
  const [type, setType] = useState<UiType>("all");

  const [showCustom, setShowCustom] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const usingCustom = Boolean(startDate && endDate);

  const selectedTypeLabel =
    UI_TYPES.find((t) => t.value === type)?.label ?? "All types";

  const rangeLabel = useMemo(() => {
    if (usingCustom) {
      const s = shortDate(new Date(startDate));
      const e = shortDate(new Date(endDate));
      return `Custom: ${s} – ${e}`;
    }
    if (rangeDays === 0) return "All time";
    return `Last ${rangeDays} days`;
  }, [usingCustom, startDate, endDate, rangeDays]);

  function clearCustom() {
    setStartDate("");
    setEndDate("");
  }

  // Filtering
  const filtered = useMemo(() => {
    const byType =
      type === "all"
        ? readings
        : readings.filter((r) => (r.tag as string | null) === type);

    if (usingCustom) {
      const startTs = new Date(`${startDate}T00:00:00`).getTime();
      const endTs = new Date(`${endDate}T23:59:59`).getTime();
      return byType.filter((r) => {
        const ts = new Date(r.datetime_utc).getTime();
        return ts >= startTs && ts <= endTs;
      });
    } else {
      if (rangeDays === 0) return byType;
      const cutoff = Date.now() - rangeDays * MS_PER_DAY;
      return byType.filter((r) => new Date(r.datetime_utc).getTime() >= cutoff);
    }
  }, [readings, type, usingCustom, startDate, endDate, rangeDays]);

  // Rolling-window series
  const a1cSeries = useMemo(() => {
    if (filtered.length === 0) return [];
    const sorted = [...filtered].sort(
      (a, b) =>
        new Date(a.datetime_utc).getTime() - new Date(b.datetime_utc).getTime()
    );
    const times: number[] = [];
    const vals = sorted.map((r) => {
      const t = new Date(r.datetime_utc).getTime();
      times.push(t);
      return r.mgdl;
    });

    const res: { t: Date; a1c: number }[] = [];
    let start = 0;
    let sum = 0;
    for (let i = 0; i < vals.length; i++) {
      sum += vals[i];
      const windowStart = times[i] - WINDOW_DAYS * MS_PER_DAY;
      while (times[start] < windowStart && start < i) {
        sum -= vals[start];
        start++;
      }
      const n = i - start + 1;
      const m = n > 0 ? sum / n : NaN;
      res.push({ t: new Date(times[i]), a1c: estA1cFromMean(m) });
    }
    return res;
  }, [filtered]);

  const meanMgdl = useMemo(() => mean(filtered.map((r) => r.mgdl)), [filtered]);
  const overallA1c = useMemo(() => estA1cFromMean(meanMgdl), [meanMgdl]);

  return (
    <section className="space-y-4">
      {/* Heading */}
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <FontAwesomeIcon icon={faChartLine} />
          Sugar Graphs
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Estimated HbA1c over time (rolling {WINDOW_DAYS}-day window).
        </p>
      </div>

      {/* Selector cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Type (white card) */}
        <section
          className="min-w-0 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/60"
          aria-labelledby="type-label"
        >
          <div
            className="flex flex-wrap items-center gap-2 text-sm"
            role="radiogroup"
            aria-label="Reading type"
          >
            {/* INLINE label */}
            <span
              id="type-label"
              className="text-slate-600 shrink-0 whitespace-nowrap"
            >
              Type:
            </span>

            {/* Pills inline with the label (no wrapper) */}
            {UI_TYPES.map(({ value, label, icon }) => {
              const active = type === value;
              return (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  role="radio"
                  aria-checked={active}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ring-1 transition focus:outline-none focus:ring-2",
                    active
                      ? "bg-emerald-600 text-white ring-emerald-600"
                      : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-100",
                  ].join(" ")}
                  aria-pressed={active}
                >
                  <FontAwesomeIcon icon={icon} className="text-[11px]" />
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Time range (amber card) */}
        <section
          className="min-w-0 rounded-2xl bg-amber-50 p-3 shadow-sm ring-1 ring-amber-200"
          aria-labelledby="range-label"
        >
          <div
            className="flex flex-wrap items-center gap-2 text-sm"
            role="radiogroup"
            aria-label="Time range"
          >
            <span id="range-label" className="font-medium text-amber-900">
              Time range
            </span>

            {[30, 60, 90, 180, 365].map((d) => (
              <button
                key={d}
                onClick={() => setRangeDays(d as 30 | 60 | 90 | 180 | 365)}
                role="radio"
                aria-checked={!usingCustom && rangeDays === d}
                className={`rounded-full px-3 py-1 text-xs ring-1 transition focus:outline-none focus:ring-2 ${
                  !usingCustom && rangeDays === d
                    ? "bg-amber-600 text-white ring-amber-600"
                    : "bg-white text-amber-900 ring-amber-300 hover:bg-amber-100"
                }`}
              >
                {d}d
              </button>
            ))}

            <button
              onClick={() => setRangeDays(0)}
              role="radio"
              aria-checked={!usingCustom && rangeDays === 0}
              className={`rounded-full px-3 py-1 text-xs ring-1 transition focus:outline-none focus:ring-2 ${
                !usingCustom && rangeDays === 0
                  ? "bg-amber-600 text-white ring-amber-600"
                  : "bg-white text-amber-900 ring-amber-300 hover:bg-amber-100"
              }`}
            >
              all
            </button>

            <button
              onClick={() => setShowCustom(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100 focus:outline-none focus:ring-2"
              title="Custom date range"
              aria-expanded={showCustom}
            >
              <FontAwesomeIcon icon={faCalendarDays} className="text-[11px]" />
              Custom
            </button>

            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900 ring-1 ring-amber-200">
              {usingCustom
                ? rangeLabel
                : `Last ${rangeDays === 0 ? "all time" : `${rangeDays} days`}`}
            </span>
          </div>
        </section>
      </div>

      {/* Graph card */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
        {a1cSeries.length === 0 ? (
          <div className="text-sm text-slate-600">
            No readings in the selected range/type.
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={a1cSeries}>
                <defs>
                  <linearGradient id="a1cStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                  <linearGradient id="a1cFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="t"
                  tick={{ fill: "#334155", fontSize: 12 }}
                  tickFormatter={(v: Date) => dateTick(v)}
                />
                <YAxis
                  domain={[4, "auto"]}
                  tick={{ fill: "#334155", fontSize: 12 }}
                  tickFormatter={(v) => `${(v as number).toFixed(1)}%`}
                />
                <Tooltip content={<A1cTooltip />} />

                <ReferenceArea
                  y1={4.0}
                  y2={5.7}
                  ifOverflow="extendDomain"
                  fill="#10b981"
                  opacity={0.1}
                />
                <ReferenceArea
                  y1={5.7}
                  y2={6.5}
                  ifOverflow="extendDomain"
                  fill="#f59e0b"
                  opacity={0.08}
                />
                <ReferenceArea
                  y1={6.5}
                  y2={12.0}
                  ifOverflow="extendDomain"
                  fill="#ef4444"
                  opacity={0.06}
                />
                <ReferenceLine y={5.7} stroke="#f59e0b" strokeDasharray="4 4" />
                <ReferenceLine y={6.5} stroke="#ef4444" strokeDasharray="4 4" />

                <Area
                  type="monotone"
                  dataKey="a1c"
                  stroke="none"
                  fill="url(#a1cFill)"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="a1c"
                  stroke="url(#a1cStroke)"
                  strokeWidth={3}
                  dot={{
                    r: 3,
                    strokeWidth: 1,
                    stroke: "#1f2937",
                    fill: "#fff",
                  }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="mt-3 text-xs text-slate-500">
          HbA1c shown is an estimate derived from your glucose readings (rolling{" "}
          {WINDOW_DAYS}-day mean) and may differ from lab results. Normal &lt;
          5.7%, prediabetes 5.7–6.4%, diabetes ≥ 6.5%.{" "}
          {Number.isFinite(overallA1c)
            ? ` Overall for selection ≈ ${format(overallA1c, 2)}%.`
            : ""}
        </p>
      </section>

      {/* Custom Range Modal */}
      {showCustom && (
        <CustomRangeModal
          initialStart={startDate}
          initialEnd={endDate}
          onApply={(s, e) => {
            setStartDate(s);
            setEndDate(e);
            setShowCustom(false);
          }}
          onClear={() => {
            clearCustom();
            setShowCustom(false);
          }}
          onClose={() => setShowCustom(false)}
        />
      )}
    </section>
  );
}

/* --------------------------- Custom Range Modal --------------------------- */

function CustomRangeModal({
  initialStart,
  initialEnd,
  onApply,
  onClear,
  onClose,
}: {
  initialStart: string;
  initialEnd: string;
  onApply: (start: string, end: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [s, setS] = useState(initialStart);
  const [e, setE] = useState(initialEnd);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
        <div className="border-b px-5 py-4 text-sm font-medium text-slate-900">
          Pick a custom date range
        </div>
        <div className="px-5 py-4">
          <div className="flex flex-wrap gap-4">
            <label className="text-xs text-slate-700">
              Start
              <input
                type="date"
                value={s}
                onChange={(e) => setS(e.target.value)}
                className="mt-1 w-40 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2"
              />
            </label>
            <label className="text-xs text-slate-700">
              End
              <input
                type="date"
                value={e}
                onChange={(e) => setE(e.target.value)}
                className="mt-1 w-40 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2"
              />
            </label>
          </div>
          <div className="mt-3 text-xs text-slate-600">
            Tip: leave both empty to go back to preset ranges.
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2"
          >
            Cancel
          </button>
          <button
            onClick={onClear}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2"
          >
            Clear
          </button>
          <button
            onClick={() => onApply(s, e)}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
