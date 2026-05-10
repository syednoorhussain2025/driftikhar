"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PatientHeader = {
  id: string;
  patient_code: string;
  full_name: string | null;
  city: string | null;
};

function TabLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "rounded-full px-3 py-1 text-sm ring-1 transition",
        active
          ? "bg-blue-600 text-white ring-blue-600"
          : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-100",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function AdminPatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const patientId = params.id;

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientHeader | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: p1, error } = await supabase
        .from("patients")
        .select("id, patient_code, patient_demographics(full_name, city)")
        .eq("id", patientId)
        .maybeSingle();

      if (error) {
        console.error(error);
        setPatient(null);
        setLoading(false);
        return;
      }

      if (p1) {
        // Normalize nested relation which can be array or single object
        const pd = Array.isArray((p1 as any).patient_demographics)
          ? (p1 as any).patient_demographics[0]
          : (p1 as any).patient_demographics;

        setPatient({
          id: (p1 as any).id,
          patient_code: (p1 as any).patient_code,
          full_name: pd?.full_name ?? null,
          city: pd?.city ?? null,
        });
      } else {
        setPatient(null);
      }
      setLoading(false);
    })();
  }, [patientId]);

  const titleText = loading
    ? "Loading…"
    : patient?.full_name ?? "Unnamed patient";

  return (
    <div className="min-h-screen bg-[#f5f7fb] overflow-x-hidden">
      <main className="mx-auto max-w-7xl px-4 py-6 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {titleText} <span className="text-slate-500">(Admin View)</span>
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                {patient?.patient_code ?? "—"}
              </span>
              <span className="text-xs text-slate-500">
                City: {patient?.city ?? "—"}
              </span>
            </div>
          </div>

          <Link
            href="/admin"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back to search
          </Link>
        </div>

        {/* Tabs */}
        <div className="mt-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/60">
          <nav className="flex flex-wrap gap-2">
            <TabLink
              href={`/admin/patient/${patientId}/dashboard`}
              label="Dashboard"
            />
            <TabLink
              href={`/admin/patient/${patientId}/readings`}
              label="Sugar Readings"
            />
            <TabLink
              href={`/admin/patient/${patientId}/graphs`}
              label="Sugar Graphs"
            />
            <TabLink
              href={`/admin/patient/${patientId}/bp`}
              label="Blood Pressure"
            />
          </nav>
        </div>

        {/* Routed content */}
        <div className="mt-4">{children}</div>
      </main>
    </div>
  );
}
