"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";

/* ----------------------------- Types ----------------------------- */
type Row = {
  id: string;
  patient_code: string;
  full_name: string | null;
  city: string | null;
};

type Reading = {
  id: string;
  datetime_utc: string;
  mgdl: number;
  tag: string | null;
  note: string | null;
};

/* ----------------------------- Utils ----------------------------- */
function mean(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : NaN;
}
function fmt(n: number, d = 1) {
  return Number.isFinite(n) ? n.toFixed(d) : "—";
}

/* ----------------------------- Page ------------------------------ */
export default function AdminHome() {
  const [role, setRole] = useState<"patient" | "admin" | "unknown">("unknown");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingPatient, setLoadingPatient] = useState(false);

  const stats = useMemo(() => {
    const values = readings.map((r) => r.mgdl);
    const m = mean(values);
    const a1c = Number.isFinite(m) ? (m + 46.7) / 28.7 : NaN; // NGSP/DCCT
    return { mean: m, a1c, count: values.length };
  }, [readings]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        window.location.href = "/";
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      const r = (prof?.role ?? "patient") as any;
      setRole(r);
      if (r === "patient") {
        window.location.href = "/dashboard";
        return;
      }
      await search("");
    })();
  }, []);

  async function search(term: string) {
    setSelected(null);
    setReadings([]);
    setLoadingList(true);

    const { data, error } = await supabase
      .from("patients")
      .select("id, patient_code, patient_demographics(full_name, city)")
      .ilike("patient_code", `%${term}%`);
    if (error) {
      setLoadingList(false);
      alert(error.message);
      return;
    }

    const d2 = await supabase
      .from("patient_demographics")
      .select("patient_id, full_name, city")
      .ilike("full_name", `%${term}%`);

    const map = new Map<string, Row>();
    (data || []).forEach((p: any) =>
      map.set(p.id, {
        id: p.id,
        patient_code: p.patient_code,
        full_name: p.patient_demographics?.full_name ?? null,
        city: p.patient_demographics?.city ?? null,
      })
    );
    (d2?.data || []).forEach((d: any) => {
      if (map.has(d.patient_id)) {
        const r = map.get(d.patient_id)!;
        r.full_name = r.full_name ?? d.full_name;
        r.city = r.city ?? d.city;
      } else {
        map.set(d.patient_id, {
          id: d.patient_id,
          patient_code: "",
          full_name: d.full_name,
          city: d.city,
        });
      }
    });

    setRows(Array.from(map.values()));
    setLoadingList(false);
  }

  async function openPatient(p: Row) {
    setSelected(p);
    setLoadingPatient(true);

    const { data, error } = await supabase
      .from("glucose_readings")
      .select("id, datetime_utc, mgdl, tag, note")
      .eq("patient_id", p.id)
      .order("datetime_utc", { ascending: false });

    if (error) {
      alert(error.message);
      setLoadingPatient(false);
      return;
    }
    setReadings((data as any) || []);
    setLoadingPatient(false);
  }

  function backToList() {
    setSelected(null);
    setReadings([]);
  }

  /* ----------------------------- UI ------------------------------ */
  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Admin — Patient Records
            </h1>
            {!selected && (
              <p className="mt-1 text-sm text-slate-600">
                Search by Patient ID or full name
              </p>
            )}
          </div>

          {!selected && (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-sm text-slate-500">
                {loadingList ? "Searching…" : `${rows.length} result(s)`}
              </span>
            </div>
          )}
        </div>

        {/* Search + List */}
        {!selected && (
          <>
            {/* Search card */}
            <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative grow">
                  <input
                    className="w-full rounded-xl border border-slate-300 px-10 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., DIB-9Q2X7F or Muhammad Ali"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  {/* search icon */}
                  <svg
                    className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.5 3a5.5 5.5 0 014.384 8.892l3.112 3.112a1 1 0 01-1.414 1.414l-3.112-3.112A5.5 5.5 0 118.5 3zm0 2a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <button
                  onClick={() => search(q)}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  Search
                </button>
              </div>
            </section>

            {/* Results card */}
            <section className="mt-4 rounded-2xl bg-white p-0 shadow-sm ring-1 ring-slate-200/60">
              <div className="border-b bg-slate-50/60 px-4 py-2 text-sm text-slate-700">
                Results
              </div>

              <div className="divide-y">
                {loadingList && (
                  <div className="px-4 py-6 text-sm text-slate-500">
                    Searching…
                  </div>
                )}

                {!loadingList && rows.length === 0 && (
                  <div className="px-4 py-10 text-center text-sm text-slate-500">
                    No results. Try another query.
                  </div>
                )}

                {!loadingList &&
                  rows.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                            {r.patient_code || "—"}
                          </span>
                          <span className="text-sm font-medium text-slate-900">
                            {r.full_name ?? "—"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          City: {r.city ?? "—"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openPatient(r)}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          View record
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          </>
        )}

        {/* Patient detail */}
        {selected && (
          <section className="mt-6 space-y-6">
            {/* Header card */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {selected.full_name ?? "Unnamed patient"}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                    {selected.patient_code}
                  </span>
                  <span className="text-xs text-slate-500">
                    City: {selected.city ?? "—"}
                  </span>
                </div>
              </div>

              <button
                onClick={backToList}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                ← Back to results
              </button>
            </div>

            {/* KPI cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <KPI title="Mean Glucose (mg/dL)" value={fmt(stats.mean, 0)} />
              <KPI title="Estimated HbA1c (%)" value={fmt(stats.a1c, 1)} />
              <KPI title="Total Readings" value={String(stats.count)} />
            </div>

            {/* Readings table */}
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60">
              <div className="border-b bg-slate-50/60 px-4 py-2 text-sm font-medium text-slate-700">
                Glucose Entries
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-white/50 text-slate-700">
                      <th className="px-4 py-2">Date/Time</th>
                      <th className="px-4 py-2">mg/dL</th>
                      <th className="px-4 py-2">Tag</th>
                      <th className="px-4 py-2">Note</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:hover]:bg-slate-50/60">
                    {loadingPatient && (
                      <tr>
                        <td className="px-4 py-8 text-slate-500" colSpan={4}>
                          Loading…
                        </td>
                      </tr>
                    )}
                    {!loadingPatient && readings.length === 0 && (
                      <tr>
                        <td className="px-4 py-8 text-slate-500" colSpan={4}>
                          No readings yet.
                        </td>
                      </tr>
                    )}
                    {!loadingPatient &&
                      readings.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="px-4 py-2">
                            {new Date(r.datetime_utc).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 tabular-nums">{r.mgdl}</td>
                          <td className="px-4 py-2">
                            {r.tag ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                                {r.tag}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-2 max-w-[30rem] truncate">
                            {r.note ?? "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

/* --------------------------- Subcomponents --------------------------- */
function KPI({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-[1px] shadow-sm ring-1 ring-slate-200/60">
      <div className="rounded-2xl bg-white p-4">
        <div className="text-xs text-slate-600">{title}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
          {value}
        </div>
      </div>
    </div>
  );
}
