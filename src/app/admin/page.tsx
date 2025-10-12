"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const [role, setRole] = useState<"patient" | "admin" | "unknown">("unknown");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // These are still used to compute the quick stats if you want to keep the panel,
  // but the “View record” now routes to /admin/patient/[id]
  const [readings, setReadings] = useState<Reading[]>([]);
  const stats = useMemo(() => {
    const values = readings.map((r) => r.mgdl);
    const m = mean(values);
    const a1c = Number.isFinite(m) ? (m + 46.7) / 28.7 : NaN;
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
      await search(""); // initial load
    })();
  }, []);

  async function search(term: string) {
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

  function goToPatient(p: Row) {
    // Navigate into the admin patient shell (tabs)
    router.push(`/admin/patient/${p.id}/dashboard`);
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
            <p className="mt-1 text-sm text-slate-600">
              Search by Patient ID or full name
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-sm text-slate-500">
              {loadingList ? "Searching…" : `${rows.length} result(s)`}
            </span>
          </div>
        </div>

        {/* Search + List */}
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
                        onClick={() => goToPatient(r)}
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
      </main>
    </div>
  );
}
