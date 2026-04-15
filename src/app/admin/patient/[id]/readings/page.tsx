"use client";

import { useParams } from "next/navigation";
import { useMemo, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import AddSugarModal from "@/components/AddSugarModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faNotesMedical,
  faTrash,
  faPlus,
  faChartLine,
  faSync,
  faFileCircleXmark,
  faAngleLeft,
  faAngleRight,
} from "@fortawesome/free-solid-svg-icons";

/* ----------------------------- Constants ----------------------------- */
const PAGE_SIZE = 50;
const dateFmt = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

/* ----------------------------- Helpers ----------------------------- */
function mean(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : NaN;
}
function prettyType(tag?: string | null) {
  switch ((tag ?? "").toLowerCase()) {
    case "fasting":
      return "Fasting";
    case "2h_breakfast":
      return "2hr after Breakfast";
    case "pre_lunch":
      return "Pre Lunch";
    case "2h_lunch":
      return "2hr after Lunch";
    case "random":
      return "Random";
    default:
      return tag || "—";
  }
}
const TYPE_PILL_CLASS =
  "rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-amber-800 ring-1 ring-inset ring-amber-200";

/* ----------------------------- Hook ----------------------------- */
function useAdminReadings(patientId: string) {
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchReadings = useCallback(async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("glucose_readings")
        .select("id, datetime_utc, mgdl, tag, note")
        .eq("patient_id", patientId)
        .order("datetime_utc", { ascending: false });
      if (error) throw error;
      setReadings(data ?? []);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  const deleteReading = async (id: string) => {
    if (!confirm("Delete this reading?")) return;
    setDeleting((d) => ({ ...d, [id]: true }));
    try {
      const { error } = await supabase
        .from("glucose_readings")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setReadings((r) => r.filter((i) => i.id !== id));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting((d) => {
        const copy = { ...d };
        delete copy[id];
        return copy;
      });
    }
  };

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  return {
    readings,
    loading,
    deleting,
    deleteReading,
    refreshReadings: fetchReadings,
    errorMsg,
  };
}

/* ----------------------------- UI Fragments ----------------------------- */
const KpiCard = ({ icon, label, value, theme = "blue" }: any) => {
  const themeClasses = {
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
  };
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white p-4 ring-1 ring-slate-200/60">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full ${
          themeClasses[theme as keyof typeof themeClasses]
        }`}
      >
        <FontAwesomeIcon icon={icon} size="lg" />
      </div>
      <div>
        <div className="text-sm font-medium text-slate-600">{label}</div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
          {value}
        </div>
      </div>
    </div>
  );
};

const DateRangePicker = ({ value, onChange }: any) => {
  const ranges = [
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
    { label: "180d", days: 180 },
    { label: "1y", days: 365 },
    { label: "All", days: 0 },
  ];
  return (
    <div className="flex items-center rounded-full bg-slate-200 p-1 text-sm ring-1 ring-slate-300/70">
      {ranges.map(({ label, days }) => (
        <button
          key={days}
          onClick={() => onChange(days)}
          className={`rounded-full px-4 py-1.5 font-medium transition-colors focus:outline-none ${
            value === days
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-700 hover:text-slate-900"
          }`}
          aria-pressed={value === days}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <div className="py-20 text-center">
    <FontAwesomeIcon
      icon={faFileCircleXmark}
      className="text-4xl text-slate-300"
    />
    <h3 className="mt-4 text-lg font-semibold text-slate-800">
      No Readings Found
    </h3>
    <p className="mt-1 text-sm text-slate-500">
      Get started by adding your first blood sugar reading.
    </p>
    <button
      onClick={onAdd}
      className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <FontAwesomeIcon icon={faPlus} />
      Add First Reading
    </button>
  </div>
);

const ReadingsTable = ({
  readings,
  deleting,
  onDelete,
  onRowClick,
}: {
  readings: any[];
  deleting: Record<string, boolean>;
  onDelete: (id: string) => void;
  onRowClick: (r: any) => void;
}) => (
  <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60">
    <table className="min-w-full text-left text-sm">
      <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
        <tr>
          <th className="px-6 py-3 font-semibold">Date & Time</th>
          <th className="px-6 py-3 font-semibold">Reading (mg/dL)</th>
          <th className="px-6 py-3 font-semibold">Type</th>
          <th className="relative px-6 py-3">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">
        {readings.map((r) => (
          <tr
            key={r.id}
            className="transition-colors hover:bg-gray-100 cursor-pointer"
            onClick={() => onRowClick(r)}
          >
            <td className="whitespace-nowrap px-6 py-4 text-slate-700">
              {dateFmt.format(new Date(r.datetime_utc))}
            </td>
            <td className="whitespace-nowrap px-6 py-4">
              <span className="text-base font-bold tabular-nums text-slate-900">
                {r.mgdl}
              </span>
            </td>
            <td className="whitespace-nowrap px-6 py-4">
              <span className={TYPE_PILL_CLASS}>{prettyType(r.tag)}</span>
            </td>
            <td
              className="whitespace-nowrap px-6 py-4 text-right"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => onDelete(r.id)}
                disabled={!!deleting[r.id]}
                className="rounded-full p-2 text-slate-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-50 focus:outline-none"
              >
                <FontAwesomeIcon
                  icon={faTrash}
                  className={deleting[r.id] ? "animate-spin" : ""}
                />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ----------------------------- Page ----------------------------- */
export default function AdminPatientReadings() {
  const { id: patientId } = useParams<{ id: string }>();
  const {
    readings,
    loading,
    deleting,
    deleteReading,
    refreshReadings,
    errorMsg,
  } = useAdminReadings(patientId);

  const [rangeDays, setRangeDays] = useState<30 | 60 | 90 | 180 | 365 | 0>(90);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [page, setPage] = useState(1);

  const filteredReadings = useMemo(() => {
    if (rangeDays === 0) return readings;
    const cutoff = Date.now() - rangeDays * 86400000;
    return readings.filter((r) => new Date(r.datetime_utc).getTime() >= cutoff);
  }, [readings, rangeDays]);

  useEffect(() => setPage(1), [rangeDays, readings.length]);

  const total = filteredReadings.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = useMemo(
    () => filteredReadings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredReadings, page]
  );

  const meanMgdl = useMemo(
    () => mean(filteredReadings.map((r) => r.mgdl)),
    [filteredReadings]
  );

  const isLoading = loading && readings.length === 0;

  const openForAdd = useCallback(() => {
    setSelected(null);
    setShowModal(true);
  }, []);
  const openForEdit = useCallback((r: any) => {
    setSelected(r);
    setShowModal(true);
  }, []);
  const closeAndRefresh = useCallback(async () => {
    await refreshReadings();
    setShowModal(false);
    setSelected(null);
  }, [refreshReadings]);

  return (
    <>
      <div className="flex flex-col gap-6">
        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMsg}
          </div>
        )}

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Blood Sugar Readings (Admin View)
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              View, edit, and manage patient glucose entries.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={refreshReadings}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              <FontAwesomeIcon icon={faSync} spin={loading} />
            </button>
            <button
              onClick={openForAdd}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Reading
            </button>
          </div>
        </header>

        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-700">
              Date Range:
            </span>
            <DateRangePicker value={rangeDays} onChange={setRangeDays} />
          </div>
          <div className="grid flex-grow grid-cols-1 gap-4 sm:grid-cols-2">
            <KpiCard
              icon={faChartLine}
              label="Mean Glucose (mg/dL)"
              value={Number.isFinite(meanMgdl) ? Math.round(meanMgdl) : "—"}
              theme="blue"
            />
            <KpiCard
              icon={faNotesMedical}
              label="Total Readings"
              value={isLoading ? "..." : filteredReadings.length}
              theme="purple"
            />
          </div>
        </section>

        <section>
          {isLoading ? (
            <div className="py-20 text-center text-slate-500">Loading...</div>
          ) : filteredReadings.length > 0 ? (
            <>
              <ReadingsTable
                readings={pageItems}
                deleting={deleting}
                onDelete={deleteReading}
                onRowClick={openForEdit}
              />
              <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200/60">
                <div className="text-sm text-slate-700">
                  Showing {pageItems.length} of {filteredReadings.length} (Page{" "}
                  {page} / {totalPages})
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-slate-100"
                  >
                    <FontAwesomeIcon icon={faAngleLeft} /> Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-slate-100"
                  >
                    Next <FontAwesomeIcon icon={faAngleRight} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState onAdd={openForAdd} />
          )}
        </section>
      </div>

      {showModal && patientId && (
        <AddSugarModal
          patientId={patientId}
          reading={selected ?? undefined}
          onClose={() => {
            setShowModal(false);
            setSelected(null);
          }}
          onSaved={closeAndRefresh}
        />
      )}
    </>
  );
}
