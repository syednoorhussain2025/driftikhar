"use client";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

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

export default function AdminHome() {
  const [role, setRole] = useState<"patient" | "admin" | "unknown">("unknown");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [stats, setStats] = useState<{
    mean: number;
    a1c: number;
    count: number;
  }>({
    mean: NaN,
    a1c: NaN,
    count: 0,
  });

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
    setStats({ mean: NaN, a1c: NaN, count: 0 });

    const { data, error } = await supabase
      .from("patients")
      .select("id, patient_code, patient_demographics(full_name, city)")
      .ilike("patient_code", `%${term}%`);
    if (error) {
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
  }

  async function openPatient(p: Row) {
    setSelected(p);
    const { data, error } = await supabase
      .from("glucose_readings")
      .select("id, datetime_utc, mgdl, tag, note")
      .eq("patient_id", p.id)
      .order("datetime_utc", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }
    setReadings(data as any);

    // calculate stats
    const values = (data || []).map((r: any) => r.mgdl);
    const mean = values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : NaN;
    const a1c = Number.isFinite(mean) ? (mean + 46.7) / 28.7 : NaN;
    setStats({ mean, a1c, count: values.length });
  }

  function backToList() {
    setSelected(null);
    setReadings([]);
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">Admin — Patient Records</h1>

      {!selected && (
        <>
          <div className="mt-4 flex gap-2">
            <input
              className="w-full rounded-xl border px-3 py-2"
              placeholder="Search by Patient ID or name..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button
              onClick={() => search(q)}
              className="rounded-xl bg-[#00b78b] px-4 py-2 font-semibold text-white"
            >
              Search
            </button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-3 py-2">Patient ID</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">City</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono">
                      {r.patient_code || "—"}
                    </td>
                    <td className="px-3 py-2">{r.full_name ?? "—"}</td>
                    <td className="px-3 py-2">{r.city ?? "—"}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => openPatient(r)}
                        className="rounded-lg border px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-slate-500">
                      No results.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selected && (
        <div className="mt-6">
          <button
            onClick={backToList}
            className="mb-4 rounded-lg border px-3 py-1 text-sm hover:bg-slate-50"
          >
            ← Back to list
          </button>

          <h2 className="text-xl font-semibold">
            {selected.full_name ?? "Unnamed"}{" "}
            <span className="text-slate-500">({selected.patient_code})</span>
          </h2>
          <p className="text-slate-600">City: {selected.city ?? "—"}</p>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Metric title="Mean Glucose (mg/dL)" value={stats.mean} />
            <Metric title="Estimated HbA1c (%)" value={stats.a1c} />
            <Metric title="Total Readings" value={stats.count} />
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-3 py-2">Date/Time</th>
                  <th className="px-3 py-2">mg/dL</th>
                  <th className="px-3 py-2">Tag</th>
                  <th className="px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      {new Date(r.datetime_utc).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{r.mgdl}</td>
                    <td className="px-3 py-2">{r.tag ?? "—"}</td>
                    <td className="px-3 py-2">{r.note ?? "—"}</td>
                  </tr>
                ))}
                {readings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-slate-500">
                      No readings yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  const fmt = (n: number) =>
    Number.isFinite(n) ? n.toFixed(n % 1 === 0 ? 0 : 1) : "—";
  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs text-slate-600">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{fmt(value)}</div>
    </div>
  );
}
