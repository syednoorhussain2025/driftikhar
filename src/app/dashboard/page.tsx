// src/app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFlask,
  faChartLine,
  faNotesMedical,
  faPlusCircle,
  faCircleInfo,
  faCalendarDays,
  faLayerGroup,
  faMoon,
  faMugSaucer,
  faUtensils,
  faClock,
  faShuffle,
  faArrowUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import { usePatient } from "./_context/PatientContext";
import AddSugarModal from "@/components/AddSugarModal";
import AddBPModal from "@/components/AddBPModal";
import { supabase } from "@/lib/supabaseClient";
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

function titleCase(s?: string | null) {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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

/* ------------------------ Styled chart tooltip ------------------------ */

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
  const first = Array.isArray(payload)
    ? payload.find((p: any) => Number.isFinite(p?.value))
    : undefined;
  const val = first?.value as number | undefined;
  const d = new Date(label);
  const c = tooltipColorClasses(val);

  return (
    <div className={`max-w-[260px] rounded-xl p-3 shadow-lg ring-1 ${c.wrap}`}>
      <div className="text-xs">{tooltipDate(d)}</div>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c.status}`}
        >
          Est. HbA1c
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c.status}`}
        >
          {c.label}
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">
        {Number.isFinite(val) ? `${val!.toFixed(1)}%` : "—"}
      </div>
      <div className={`mt-1 text-[11px] ${c.meta}`}>
        Target: <span className="font-medium">&lt; 5.7%</span>
      </div>
    </div>
  );
}

/* =============================== Page =============================== */

const MALE_AVATAR =
  "https://mnlnbuosiczjalpgeara.supabase.co/storage/v1/object/public/images/male%20profile.png";
const FEMALE_AVATAR =
  "https://mnlnbuosiczjalpgeara.supabase.co/storage/v1/object/public/images/female%20profile.png";

type BP = {
  id: string;
  patient_id: string;
  datetime_utc: string;
  systolic: number;
  diastolic: number;
};

export default function DashboardPage() {
  const {
    name,
    patientCode,
    patientId,
    readings,
    errorMsg,
    refreshReadings,
    demographics,
  } = usePatient();

  const [showAdd, setShowAdd] = useState(false);
  const [showAddBP, setShowAddBP] = useState(false);

  // Defaults: last 90 days, and UI type = all
  const [rangeDays, setRangeDays] = useState<30 | 60 | 90 | 180 | 365 | 0>(90);
  const [type, setType] = useState<UiType>("all");

  // Custom dates
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showCustom, setShowCustom] = useState<boolean>(false);
  const usingCustom = Boolean(startDate && endDate);

  // Avatar
  const avatarUrl = useMemo(() => {
    const g = (demographics?.gender ?? "").toString().toLowerCase();
    return g.includes("female") ? FEMALE_AVATAR : MALE_AVATAR;
  }, [demographics?.gender]);

  // Labels
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

  // KPIs
  const meanMgdl = useMemo(() => mean(filtered.map((r) => r.mgdl)), [filtered]);
  const count = filtered.length;

  /* --------- Rolling window follows the selected time --------- */
  const windowDays = useMemo(() => {
    if (usingCustom && startDate && endDate) {
      const ms =
        new Date(`${endDate}T23:59:59`).getTime() -
        new Date(`${startDate}T00:00:00`).getTime();
      const days = Math.max(1, Math.round(ms / MS_PER_DAY));
      return days;
    }
    if (rangeDays === 0) return 90;
    return rangeDays;
  }, [usingCustom, startDate, endDate, rangeDays]);

  // Rolling-window series for the chart
  const a1cSeries = useMemo(() => {
    if (filtered.length === 0) return [];
    const sorted = [...filtered].sort(
      (a, b) =>
        new Date(a.datetime_utc).getTime() - new Date(b.datetime_utc).getTime()
    );
    const times: number[] = [];
    for (const r of sorted) times.push(new Date(r.datetime_utc).getTime());
    const vals = sorted.map((r) => r.mgdl);

    const res: { t: Date; a1c: number }[] = [];
    let start = 0;
    let sum = 0;
    for (let i = 0; i < vals.length; i++) {
      sum += vals[i];
      const windowStart = times[i] - windowDays * MS_PER_DAY;
      while (times[start] < windowStart && start < i) {
        sum -= vals[start];
        start++;
      }
      const n = i - start + 1;
      const m = n > 0 ? sum / n : NaN;
      res.push({ t: new Date(times[i]), a1c: estA1cFromMean(m) });
    }
    return res;
  }, [filtered, windowDays]);

  // HbA1c KPI (last point)
  const a1c = useMemo(() => {
    if (a1cSeries.length === 0) return NaN;
    return a1cSeries[a1cSeries.length - 1].a1c;
  }, [a1cSeries]);

  const a1cNote = useMemo(() => {
    if (!Number.isFinite(a1c)) return "No estimate for the selected filters.";
    if (a1c < 5.7) return "Within the normal range (< 5.7%).";
    if (a1c < 6.5)
      return "In the prediabetes range (5.7–6.4%). Consider lifestyle changes and follow-up testing.";
    return "In the diabetes range (≥ 6.5%). Consider contacting your clinician if this is unexpected.";
  }, [a1c]);

  /**
   * Segment coloring (by next point)
   */
  const segmentedSeries = useMemo(() => {
    const n = a1cSeries.length;
    if (n === 0) return [];
    const base = a1cSeries.map((p) => ({
      t: p.t,
      a1c_green: null as number | null,
      a1c_red: null as number | null,
    }));

    if (n === 1) {
      if (a1cSeries[0].a1c < 5.7) base[0].a1c_green = a1cSeries[0].a1c;
      else base[0].a1c_red = a1cSeries[0].a1c;
      return base;
    }

    for (let i = 0; i < n - 1; i++) {
      const colorIsGreen = a1cSeries[i + 1].a1c < 5.7;
      const key = colorIsGreen ? "a1c_green" : "a1c_red";
      base[i][key] = a1cSeries[i].a1c;
      base[i + 1][key] = a1cSeries[i + 1].a1c;
    }
    return base;
  }, [a1cSeries]);

  function clearCustom() {
    setStartDate("");
    setEndDate("");
  }

  /* --------------------- BP: fetch + average for card --------------------- */
  const [bp, setBp] = useState<BP[]>([]);
  const [bpReload, setBpReload] = useState(0);

  useEffect(() => {
    (async () => {
      if (!patientId) {
        setBp([]);
        return;
      }
      let q = supabase
        .from("bp_readings")
        .select("id, patient_id, datetime_utc, systolic, diastolic")
        .eq("patient_id", patientId)
        .order("datetime_utc", { ascending: false });

      if (usingCustom) {
        const fromIso = new Date(`${startDate}T00:00:00`).toISOString();
        const toIso = new Date(`${endDate}T23:59:59.999`).toISOString();
        q = q.gte("datetime_utc", fromIso).lte("datetime_utc", toIso);
      } else if (rangeDays > 0) {
        const cutoff = new Date(
          Date.now() - rangeDays * MS_PER_DAY
        ).toISOString();
        q = q.gte("datetime_utc", cutoff);
      }

      const { data, error } = await q.returns<BP[]>();
      if (!error) setBp(data ?? []);
      else setBp([]);
    })();
  }, [patientId, usingCustom, startDate, endDate, rangeDays, bpReload]);

  const avgSys = useMemo(() => mean(bp.map((i) => i.systolic)), [bp]);
  const avgDia = useMemo(() => mean(bp.map((i) => i.diastolic)), [bp]);

  /* --------------------------------- UI --------------------------------- */

  return (
    <>
      {/* Header card */}
      <section className="w-full max-w-full overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div className="flex items-start gap-4 min-w-0">
            <div className="shrink-0 h-28 w-28 rounded-full ring-2 ring-amber-300 p-0.5 bg-white overflow-hidden">
              <img
                src={avatarUrl}
                alt={`${name ?? "Patient"} profile`}
                className="h-full w-full rounded-full object-cover origin-center scale-[1.2]"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono ring-1 ring-slate-200 text-slate-800">
                  ID: {patientCode ?? "—"}
                </span>
              </div>

              <h1 className="mt-2 text-2xl font-semibold text-slate-900 break-words">
                Welcome{name ? `, ${name}` : ""}
              </h1>

              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-amber-50 px-2 py-0.5 ring-1 ring-amber-200 text-amber-800">
                  Age: {demographics.age ?? "—"}
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 ring-1 ring-amber-200 text-amber-800">
                  Gender: {titleCase(demographics.gender)}
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 ring-1 ring-amber-200 text-amber-800">
                  City: {demographics.city ?? "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddBP(true)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              title="Add Blood Pressure"
            >
              <FontAwesomeIcon icon={faPlusCircle} />
              Add Blood Pressure
            </button>

            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Add Sugar"
            >
              <FontAwesomeIcon icon={faPlusCircle} />
              Add Sugar
            </button>
          </div>
        </div>
      </section>

      {errorMsg && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      {/* ───────────────────── Flattened grid ───────────────────── */}
      <main className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Type selector – wraps on mobile; left column on desktop */}
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60 order-1 lg:order-1 lg:col-start-1">
          <div className="text-sm text-slate-600 mb-2">Type:</div>
          <div className="flex flex-wrap gap-2">
            {UI_TYPES.map(({ value, label, icon }) => {
              const active = type === value;
              return (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 ring-1 transition focus:outline-none focus:ring-2 whitespace-nowrap",
                    active
                      ? "bg-emerald-600 text-white ring-emerald-600"
                      : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-100",
                  ].join(" ")}
                  aria-pressed={active}
                >
                  <FontAwesomeIcon icon={icon} className="text-[12px]" />
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Time selector – wraps on mobile; right column on desktop */}
        <section className="rounded-2xl bg-amber-50 p-4 shadow-sm ring-1 ring-amber-200 order-2 lg:order-1 lg:col-start-2">
          <div className="text-sm font-medium text-amber-900 mb-2">
            Time range
          </div>
          <div className="flex flex-wrap gap-2">
            {[30, 60, 90, 180, 365].map((d) => (
              <button
                key={d}
                onClick={() => {
                  setRangeDays(d as 30 | 60 | 90 | 180 | 365);
                  clearCustom();
                }}
                className={`rounded-full px-3 py-1 ring-1 transition focus:outline-none focus:ring-2 whitespace-nowrap ${
                  !usingCustom && rangeDays === d
                    ? "bg-amber-600 text-white ring-amber-600"
                    : "bg-white text-amber-900 ring-amber-300 hover:bg-amber-100"
                }`}
                aria-pressed={!usingCustom && rangeDays === d}
              >
                {d}d
              </button>
            ))}
            <button
              onClick={() => {
                setRangeDays(0);
                clearCustom();
              }}
              className={`rounded-full px-3 py-1 ring-1 transition focus:outline-none focus:ring-2 whitespace-nowrap ${
                !usingCustom && rangeDays === 0
                  ? "bg-amber-600 text-white ring-amber-600"
                  : "bg-white text-amber-900 ring-amber-300 hover:bg-amber-100"
              }`}
              aria-pressed={!usingCustom && rangeDays === 0}
            >
              all
            </button>
            <button
              onClick={() => setShowCustom(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 ring-1 ring-amber-300 text-amber-900 hover:bg-amber-100 focus:outline-none focus:ring-2 whitespace-nowrap"
              title="Custom date range"
              aria-expanded={showCustom}
            >
              <FontAwesomeIcon icon={faCalendarDays} />
              Custom
            </button>
          </div>
        </section>

        {/* HbA1c card – right column on desktop */}
        <section
          className={[
            "rounded-2xl p-5 shadow-sm ring-1 min-h-[240px] order-3 lg:order-2 lg:col-start-2",
            Number.isFinite(a1c) && a1c < 5.7
              ? "bg-emerald-50 ring-emerald-200"
              : "bg-rose-50 ring-rose-200",
          ].join(" ")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FontAwesomeIcon icon={faFlask} />
              HbA1c (estimated)
            </div>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              {rangeLabel}
            </span>
          </div>

          <div className="mt-3">
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              {selectedTypeLabel}
            </span>
          </div>

          <div
            className={[
              "mt-3 text-6xl font-semibold tabular-nums leading-none",
              Number.isFinite(a1c) && a1c < 5.7
                ? "text-emerald-700"
                : "text-rose-700",
            ].join(" ")}
          >
            {format(a1c, 1)}%
          </div>

          <div className="mt-3 text-sm text-slate-800">{a1cNote}</div>

          <div className="mt-4 pt-3 border-t border-slate-200/70 text-sm flex items-center justify-between">
            <span className="text-slate-700 font-medium">
              Average Blood Pressure
            </span>
            <span className="tabular-nums text-slate-900">
              {Number.isFinite(avgSys) && Number.isFinite(avgDia)
                ? `${Math.round(avgSys)}/${Math.round(avgDia)} mmHg`
                : "—"}
            </span>
          </div>
        </section>

        {/* KPIs – right column on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 order-4 lg:order-3 lg:col-start-2">
          <KPI
            icon={faChartLine}
            title="Mean glucose (mg/dL)"
            value={format(meanMgdl, 0)}
          />
          <KPI icon={faNotesMedical} title="Readings" value={String(count)} />
        </div>

        {/* Graph – LAST on mobile; left column on desktop */}
        <section className="w-full max-w-full overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 order-5 lg:order-2 lg:col-start-1">
          {a1cSeries.length === 0 ? (
            <div className="text-sm text-slate-600">
              No readings in the selected range/type.
            </div>
          ) : (
            <>
              <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={segmentedSeries}>
                    <defs>
                      <linearGradient id="a1cFill" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#60a5fa"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="100%"
                          stopColor="#60a5fa"
                          stopOpacity={0}
                        />
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

                    <ReferenceLine
                      y={5.7}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                    />
                    <ReferenceLine
                      y={6.5}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                    />

                    <Area
                      data={a1cSeries}
                      type="monotone"
                      dataKey="a1c"
                      stroke="none"
                      fill="url(#a1cFill)"
                      isAnimationActive={false}
                    />

                    <Line
                      type="monotone"
                      dataKey="a1c_green"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{
                        r: 3,
                        strokeWidth: 1,
                        stroke: "#1f2937",
                        fill: "#fff",
                      }}
                      activeDot={{ r: 5 }}
                      connectNulls
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="a1c_red"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={{
                        r: 3,
                        strokeWidth: 1,
                        stroke: "#1f2937",
                        fill: "#fff",
                      }}
                      activeDot={{ r: 5 }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 flex items-center justify-start">
                <a
                  href="/dashboard/graphs"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                  Open graphs
                </a>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Note */}
      <section className="mt-6 w-full max-w-full overflow-hidden rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200/60">
        <div className="flex items-center gap-2 font-medium text-slate-800">
          <FontAwesomeIcon icon={faCircleInfo} />
          Note
        </div>
        <p className="mt-2">
          HbA1c shown here is an estimate derived from your glucose readings and
          may differ from lab results. Normal &lt; 5.7%, prediabetes 5.7–6.4%,
          diabetes ≥ 6.5%.
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

      {/* Add Sugar Modal */}
      {showAdd && patientId && (
        <AddSugarModal
          patientId={patientId}
          onClose={() => setShowAdd(false)}
          onSaved={async () => {
            await refreshReadings();
            setShowAdd(false);
          }}
        />
      )}

      {/* Add Blood Pressure Modal */}
      {showAddBP && patientId && (
        <AddBPModal
          patientId={patientId}
          open={showAddBP}
          onClose={() => setShowAddBP(false)}
          onAdded={() => {
            setShowAddBP(false);
            setBpReload((n) => n + 1);
          }}
        />
      )}
    </>
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
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Small component --------------------------- */

function KPI({
  icon,
  title,
  value,
  tone = "slate",
}: {
  icon: any;
  title: string;
  value: string;
  tone?: "slate" | "green";
}) {
  const toneClasses =
    tone === "green"
      ? "bg-green-50 ring-green-200 text-green-800"
      : "bg-white ring-slate-200/60 text-slate-900";

  return (
    <div
      className={`w-full max-w-full overflow-hidden rounded-2xl p-[1px] shadow-sm ring-1 ${toneClasses}`}
    >
      <div className="flex items-center gap-3 rounded-2xl bg-transparent p-4">
        <FontAwesomeIcon icon={icon} className="text-blue-600 text-xl" />
        <div className="min-w-0">
          <div className="text-xs text-slate-600">{title}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}
