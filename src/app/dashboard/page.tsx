"use client";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Reading = { datetime_utc: string; mgdl: number; tag: string | null };

function mean(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : NaN;
}
function format(n: number, d = 1) {
  return Number.isFinite(n) ? n.toFixed(d) : "—";
}
function estA1cFromMean(mgdl: number) {
  return (mgdl + 46.7) / 28.7;
} // NGSP/DCCT

export default function Dashboard() {
  const router = useRouter();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientCode, setPatientCode] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [rangeDays, setRangeDays] = useState<30 | 60 | 90 | 180 | 365 | 0>(90); // 0=all

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
    })();
  }, [router]);

  async function fetchReadings(pid: string) {
    let q = supabase
      .from("glucose_readings")
      .select("datetime_utc, mgdl, tag")
      .eq("patient_id", pid)
      .order("datetime_utc", { ascending: false });
    const { data, error } = await q;
    if (!error && data) setReadings(data as any);
  }

  const filtered = useMemo(() => {
    if (rangeDays === 0) return readings;
    const cutoff = Date.now() - rangeDays * 86400000;
    return readings.filter((r) => new Date(r.datetime_utc).getTime() >= cutoff);
  }, [readings, rangeDays]);

  const meanMgdl = useMemo(() => mean(filtered.map((r) => r.mgdl)), [filtered]);
  const a1c = useMemo(() => estA1cFromMean(meanMgdl), [meanMgdl]);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome{name ? `, ${name}` : ""}
          </h1>
          <p className="text-sm text-slate-600">
            Patient ID: <span className="font-mono">{patientCode ?? "—"}</span>
          </p>
        </div>
        <button
          onClick={() => router.push("/add-sugar")}
          className="rounded-xl bg-[#00b78b] px-4 py-2 font-semibold text-white"
        >
          Add Sugar
        </button>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <KPI title="Estimated HbA1c" value={`${format(a1c, 1)}%`} />
        <KPI title="Mean glucose (mg/dL)" value={format(meanMgdl, 0)} />
        <KPI title="Readings in range" value={String(filtered.length)} />
      </section>

      <section className="mt-6 rounded-2xl border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600">Date range:</span>
          {[30, 60, 90, 180, 365].map((d) => (
            <button
              key={d}
              onClick={() => setRangeDays(d as any)}
              className={`rounded-full border px-3 py-1 text-sm ${
                rangeDays === d
                  ? "border-[#00b78b] bg-[#00b78b]/10"
                  : "border-slate-300"
              }`}
            >
              {d}d
            </button>
          ))}
          <button
            onClick={() => setRangeDays(0)}
            className={`rounded-full border px-3 py-1 text-sm ${
              rangeDays === 0
                ? "border-[#00b78b] bg-[#00b78b]/10"
                : "border-slate-300"
            }`}
          >
            all
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-3 py-2">Date/time</th>
                <th className="px-3 py-2">mg/dL</th>
                <th className="px-3 py-2">Tag</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    {new Date(r.datetime_utc).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{r.mgdl}</td>
                  <td className="px-3 py-2">{r.tag ?? "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-slate-500" colSpan={3}>
                    No readings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function KPI({ title, value }: { title: string; value: string }) {
  return (
    <div
      className="rounded-2xl bg-white p-[1px] shadow"
      style={{ background: "linear-gradient(135deg,#00b78b,#F78300)" }}
    >
      <div className="rounded-2xl bg-white p-4">
        <div className="text-xs text-slate-600">{title}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
