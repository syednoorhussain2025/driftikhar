"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

type Reading = {
  id: string; // ← needed for deletion
  datetime_utc: string;
  mgdl: number;
  tag: string | null;
};

function mean(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : NaN;
}
function format(n: number, d = 1) {
  return Number.isFinite(n) ? n.toFixed(d) : "—";
}
function estA1cFromMean(mgdl: number) {
  return (mgdl + 46.7) / 28.7; // NGSP/DCCT
}

export default function Dashboard() {
  const router = useRouter();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientCode, setPatientCode] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [rangeDays, setRangeDays] = useState<30 | 60 | 90 | 180 | 365 | 0>(90);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/");
    });
  }, [router]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;

      const { data: p } = await supabase
        .from("patients")
        .select("id, patient_code")
        .eq("user_id", uid)
        .maybeSingle();

      if (!p) {
        router.replace("/register");
        return;
      }
      setPatientId(p.id);
      setPatientCode(p.patient_code);

      const { data: d } = await supabase
        .from("patient_demographics")
        .select("full_name")
        .eq("patient_id", p.id)
        .maybeSingle();
      setName(d?.full_name ?? "");

      await fetchReadings(p.id);
      setLoading(false);
    })();
  }, [router]);

  async function fetchReadings(pid: string) {
    const { data, error } = await supabase
      .from("glucose_readings")
      .select("id, datetime_utc, mgdl, tag") // ← include id
      .eq("patient_id", pid)
      .order("datetime_utc", { ascending: false });
    if (!error && data) setReadings(data as any);
  }

  async function deleteReading(id: string) {
    if (!patientId) return;
    if (!confirm("Delete this reading? This cannot be undone.")) return;

    setDeleting((s) => ({ ...s, [id]: true }));
    const { error } = await supabase
      .from("glucose_readings")
      .delete()
      .match({ id, patient_id: patientId });

    if (error) {
      alert(error.message);
      setDeleting((s) => {
        const { [id]: _, ...rest } = s;
        return rest;
      });
      return;
    }

    // Optimistically update UI
    setReadings((prev) => prev.filter((r) => r.id !== id));
    setDeleting((s) => {
      const { [id]: _, ...rest } = s;
      return rest;
    });
  }

  const filtered = useMemo(() => {
    if (rangeDays === 0) return readings;
    const cutoff = Date.now() - rangeDays * 86400000;
    return readings.filter((r) => new Date(r.datetime_utc).getTime() >= cutoff);
  }, [readings, rangeDays]);

  const meanMgdl = useMemo(() => mean(filtered.map((r) => r.mgdl)), [filtered]);
  const a1c = useMemo(() => estA1cFromMean(meanMgdl), [meanMgdl]);

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Header / Profile card */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Welcome{name ? `, ${name}` : ""}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Patient ID:{" "}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                  {patientCode ?? "—"}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/add-sugar")}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Add Sugar
              </button>
            </div>
          </div>

          {/* KPI row */}
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <KPI title="Estimated HbA1c (%)" value={format(a1c, 1)} />
            <KPI title="Mean glucose (mg/dL)" value={format(meanMgdl, 0)} />
            <KPI title="Readings in range" value={String(filtered.length)} />
          </div>
        </section>

        {/* Readings list with range chips */}
        <section className="mt-6 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50/60 px-4 py-3">
            <div className="text-sm font-medium text-slate-800">
              Saved readings
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-600">Date range:</span>
              {[30, 60, 90, 180, 365].map((d) => (
                <button
                  key={d}
                  onClick={() => setRangeDays(d as any)}
                  className={`rounded-full px-3 py-1 ring-1 transition ${
                    rangeDays === d
                      ? "bg-blue-600 text-white ring-blue-600"
                      : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {d}d
                </button>
              ))}
              <button
                onClick={() => setRangeDays(0)}
                className={`rounded-full px-3 py-1 ring-1 transition ${
                  rangeDays === 0
                    ? "bg-blue-600 text-white ring-blue-600"
                    : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
                }`}
              >
                all
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-white/50 text-slate-700">
                  <th className="px-4 py-2">Date / time</th>
                  <th className="px-4 py-2">mg/dL</th>
                  <th className="px-4 py-2">Tag</th>
                  <th className="px-4 py-2"></th> {/* actions */}
                </tr>
              </thead>
              <tbody className="[&_tr:hover]:bg-slate-50/60">
                {loading && (
                  <tr>
                    <td className="px-4 py-8 text-slate-500" colSpan={4}>
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-slate-500"
                      colSpan={4}
                    >
                      No readings yet.
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((r) => (
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
                      <td className="px-4 py-2">
                        <button
                          onClick={() => deleteReading(r.id)}
                          disabled={!!deleting[r.id]}
                          className="flex items-center gap-1 rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                          title="Delete reading"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                          {deleting[r.id] ? "Deleting…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Optional notes card */}
        <section className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200/60">
          <div className="font-medium text-slate-800">Note</div>
          <p className="mt-2">
            HbA1c shown here is an estimate derived from your mean glucose over
            the selected range and may differ from lab results.
          </p>
        </section>
      </main>
    </div>
  );
}

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
