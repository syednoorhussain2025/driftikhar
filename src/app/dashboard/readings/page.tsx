"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { usePatient } from "../_context/PatientContext";
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

type ReadingsTableProps = {
  readings: any[];
  deleting: Record<string, boolean>;
  onDelete: (id: string) => void;
  onRowClick: (reading: any) => void;
};

/** Desktop / tablet table (visible from sm breakpoint up) */
const ReadingsTable = ({
  readings,
  deleting,
  onDelete,
  onRowClick,
}: ReadingsTableProps) => (
  <div className="hidden sm:block overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60">
    <table className="min-w-full text-left text-sm">
      <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
        <tr>
          <th scope="col" className="px-6 py-3 font-semibold">
            Date & Time
          </th>
          <th scope="col" className="px-6 py-3 font-semibold">
            Reading (mg/dL)
          </th>
          <th scope="col" className="px-6 py-3 font-semibold">
            Type
          </th>
          <th scope="col" className="relative px-6 py-3">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">
        {readings.map((r: any) => (
          <tr
            key={r.id}
            className="transition-colors hover:bg-gray-100 cursor-pointer"
            onClick={() => onRowClick(r)}
            title="Click to edit this reading"
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
                className="rounded-full p-2 text-slate-400 transition hover:bg-red-100 hover:text-red-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                title={deleting[r.id] ? "Deleting..." : "Delete reading"}
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

/** Mobile list (cards) – always shows Delete button */
const MobileReadingsList = ({
  readings,
  deleting,
  onDelete,
  onRowClick,
}: ReadingsTableProps) => (
  <div className="sm:hidden space-y-3">
    {readings.map((r) => (
      <div
        key={r.id}
        className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60"
        onClick={() => onRowClick(r)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onRowClick(r);
        }}
        title="Tap to edit this reading"
      >
        {/* Top row: date/time + type + delete */}
        <div className="flex items-start gap-3">
          <div className="min-w-0">
            <div className="text-sm text-slate-700">
              {dateFmt.format(new Date(r.datetime_utc))}
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              {r.mgdl}{" "}
              <span className="text-sm font-medium text-slate-500">mg/dL</span>
            </div>
          </div>

          <div className="ml-auto flex items-start gap-2">
            <span className={`${TYPE_PILL_CLASS} shrink-0`}>
              {prettyType(r.tag)}
            </span>

            {/* Delete button: isolated click target (doesn't trigger edit) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(r.id);
              }}
              disabled={!!deleting[r.id]}
              className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label={deleting[r.id] ? "Deleting..." : "Delete reading"}
              title={deleting[r.id] ? "Deleting..." : "Delete reading"}
            >
              <FontAwesomeIcon
                icon={faTrash}
                className={deleting[r.id] ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>
      </div>
    ))}
  </div>
);

/* ----------------------------- Main Page ----------------------------- */

export default function ReadingsPage() {
  const {
    patientId,
    readings,
    loading,
    deleting,
    deleteReading,
    refreshReadings,
    errorMsg,
  } = usePatient();

  const [rangeDays, setRangeDays] = useState<30 | 60 | 90 | 180 | 365 | 0>(90);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  const [page, setPage] = useState(1);

  // Filter by range
  const filteredReadings = useMemo(() => {
    if (rangeDays === 0) return readings;
    const cutoff = Date.now() - rangeDays * 86400000;
    return readings.filter((r) => new Date(r.datetime_utc).getTime() >= cutoff);
  }, [readings, rangeDays]);

  // Reset to first page when filters or data change
  useEffect(() => {
    setPage(1);
  }, [rangeDays, readings.length]);

  // Pagination slices
  const total = filteredReadings.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = useMemo(
    () => filteredReadings.slice(start, end),
    [filteredReadings, start, end]
  );

  const meanMgdl = useMemo(
    () => mean(filteredReadings.map((r) => r.mgdl)),
    [filteredReadings]
  );

  const isLoading = loading && readings.length === 0;

  // Handlers
  const openForAdd = useCallback(() => {
    setSelected(null);
    setShowModal(true);
  }, []);

  const openForEdit = useCallback((reading: any) => {
    setSelected(reading);
    setShowModal(true);
  }, []);

  const closeModalAndRefresh = useCallback(async () => {
    await refreshReadings();
    setShowModal(false);
    setSelected(null);
  }, [refreshReadings]);

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Error Message */}
        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMsg}
          </div>
        )}

        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Blood Sugar Readings
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              View, manage, and add new glucose entries.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={refreshReadings}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Refresh readings"
            >
              <FontAwesomeIcon icon={faSync} spin={loading} />
            </button>
            <button
              onClick={openForAdd}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title="Add a new glucose reading"
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Reading
            </button>
          </div>
        </header>

        {/* Date Range and KPIs */}
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="shrink-0 text-sm font-medium text-slate-700">
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

        {/* Main: Table (desktop) or Cards (mobile) */}
        <section>
          {isLoading ? (
            <div className="py-20 text-center text-slate-500">Loading...</div>
          ) : filteredReadings.length > 0 ? (
            <>
              {/* Mobile list */}
              <MobileReadingsList
                readings={pageItems}
                deleting={deleting}
                onDelete={deleteReading}
                onRowClick={openForEdit}
              />

              {/* Desktop/tablet table */}
              <ReadingsTable
                readings={pageItems}
                deleting={deleting}
                onDelete={deleteReading}
                onRowClick={openForEdit}
              />

              {/* Pagination */}
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200/60">
                <div className="text-sm text-slate-700">
                  Showing{" "}
                  <span className="font-semibold">
                    {Math.min(PAGE_SIZE, pageItems.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold">
                    {filteredReadings.length}
                  </span>{" "}
                  (Page <span className="font-semibold">{page}</span> of{" "}
                  <span className="font-semibold">{totalPages}</span>)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 disabled:opacity-50 hover:bg-slate-100"
                  >
                    <FontAwesomeIcon icon={faAngleLeft} />
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 disabled:opacity-50 hover:bg-slate-100"
                  >
                    Next
                    <FontAwesomeIcon icon={faAngleRight} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState onAdd={openForAdd} />
          )}
        </section>
      </div>

      {/* Add / Edit Modal */}
      {showModal && patientId && (
        <AddSugarModal
          patientId={patientId}
          /* provide existing reading when editing */
          reading={selected ?? undefined}
          /* refresh after close (save or cancel) */
          onClose={closeModalAndRefresh}
          /* also refresh after successful save */
          onSaved={closeModalAndRefresh}
        />
      )}
    </>
  );
}
