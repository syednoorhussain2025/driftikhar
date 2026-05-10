"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { usePatient } from "../_context/PatientContext";
import AddBPModal from "@/components/AddBPModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faFilter,
  faAngleLeft,
  faAngleRight,
} from "@fortawesome/free-solid-svg-icons";

type BP = {
  id: string;
  patient_id: string;
  datetime_utc: string;
  systolic: number;
  diastolic: number;
  note: string | null;
  created_at: string;
};

type RangeKey = "15d" | "30d" | "60d" | "90d" | "custom";

const PAGE_SIZE = 50;

function mean(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : NaN;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString();
  const timeStr = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { dateStr, timeStr };
}

/* --------------------------- Mobile list --------------------------- */

function MobileBPList({
  items,
  onEdit,
  onDelete,
}: {
  items: BP[];
  onEdit: (bp: BP) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="sm:hidden space-y-3">
      {items.map((r) => {
        const { dateStr, timeStr } = formatDateTime(r.datetime_utc);
        return (
          <div
            key={r.id}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60"
            role="button"
            tabIndex={0}
            onClick={() => onEdit(r)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onEdit(r)}
            title="Tap to edit this reading"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900">
                  {dateStr}
                </div>
                <div className="text-xs text-slate-600">{timeStr}</div>

                <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
                  {r.systolic}/{r.diastolic}{" "}
                  <span className="text-sm font-semibold text-slate-600">
                    mmHg
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(r.id);
                }}
                className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-200 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                aria-label="Delete reading"
                title="Delete"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>

            {r.note && (
              <div className="mt-2 text-sm text-slate-700">{r.note}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */

export default function BloodPressurePage() {
  const { patientId } = usePatient();

  const [items, setItems] = useState<BP[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>("30d");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [addOpen, setAddOpen] = useState(false);
  const [selectedReading, setSelectedReading] = useState<BP | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Canonical fetch with pagination + count
  const loadReadings = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);

    let query = supabase
      .from("bp_readings")
      .select(
        "id, patient_id, datetime_utc, systolic, diastolic, note, created_at",
        { count: "exact", head: false }
      )
      .eq("patient_id", patientId)
      .order("datetime_utc", { ascending: false });

    const now = new Date();
    const since = (days: number) => new Date(now.getTime() - days * 86400000);

    if (range !== "custom") {
      const days =
        range === "15d" ? 15 : range === "30d" ? 30 : range === "60d" ? 60 : 90;
      query = query.gte("datetime_utc", since(days).toISOString());
    } else if (from) {
      const toIso = to
        ? new Date(to + "T23:59:59.999").toISOString()
        : undefined;
      query = query.gte("datetime_utc", new Date(from).toISOString());
      if (toIso) query = query.lte("datetime_utc", toIso);
    }

    // Pagination window
    const startIdx = (page - 1) * PAGE_SIZE;
    const endIdx = startIdx + PAGE_SIZE - 1;
    query = query.range(startIdx, endIdx);

    const { data, error: err, count } = await query.returns<BP[]>();
    if (err) setError(err.message);
    setItems(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [patientId, range, from, to, page]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [range, from, to, patientId]);

  const avgSys = useMemo(() => mean(items.map((i) => i.systolic)), [items]);
  const avgDia = useMemo(() => mean(items.map((i) => i.diastolic)), [items]);

  async function handleDelete(id: string) {
    const ok = window.confirm("Delete this reading permanently?");
    if (!ok) return;
    const { error: delErr } = await supabase
      .from("bp_readings")
      .delete()
      .eq("id", id);
    if (delErr) {
      toast.error(delErr.message || "Failed to delete reading.");
      return;
    }
    toast.success("BP reading deleted.");
    const remaining = total - 1;
    const newTotalPages = Math.max(1, Math.ceil(remaining / PAGE_SIZE));
    if (page > newTotalPages) setPage(newTotalPages);
    else loadReadings();
  }

  return (
    <div className="w-full p-0 text-[15px]">
      {/* Header / Actions */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-0">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Blood Pressure
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            View, add, and manage your blood pressure readings.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedReading(null);
            setAddOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <FontAwesomeIcon icon={faPlus} />
          Add Blood Pressure
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-sm font-medium text-slate-700">
            <FontAwesomeIcon icon={faFilter} className="h-4 w-4" />
            Time range:
          </span>

          {(["15d", "30d", "60d", "90d"] as RangeKey[]).map((rk) => (
            <button
              key={rk}
              onClick={() => setRange(rk)}
              className={`rounded-full px-3 py-1.5 text-sm ring-1 transition ${
                range === rk
                  ? "bg-amber-600 text-white ring-amber-600"
                  : "bg-white text-slate-800 ring-slate-300 hover:bg-slate-100"
              }`}
            >
              {rk.replace("d", " days")}
            </button>
          ))}

          <button
            onClick={() => setRange("custom")}
            className={`rounded-full px-3 py-1.5 text-sm ring-1 transition ${
              range === "custom"
                ? "bg-amber-600 text-white ring-amber-600"
                : "bg-white text-slate-800 ring-slate-300 hover:bg-slate-100"
            }`}
          >
            Custom
          </button>

          {range === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-600">to</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Averages */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-600">Average Systolic</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">
            {Number.isFinite(avgSys) ? Math.round(avgSys) : "—"}{" "}
            <span className="text-base font-semibold text-slate-600">mmHg</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-600">Average Diastolic</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">
            {Number.isFinite(avgDia) ? Math.round(avgDia) : "—"}{" "}
            <span className="text-base font-semibold text-slate-600">mmHg</span>
          </div>
        </div>
      </div>

      {/* List header (desktop/tablet only) */}
      <div className="hidden sm:block border-y border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
        Readings
      </div>

      {/* Mobile list */}
      {!loading && items.length > 0 && (
        <MobileBPList
          items={items}
          onEdit={(bp) => {
            setSelectedReading(bp);
            setAddOpen(true);
          }}
          onDelete={handleDelete}
        />
      )}

      {/* Desktop/tablet list */}
      <div className="hidden sm:block bg-white">
        {/* Table-like header row */}
        <div className="grid grid-cols-12 gap-2 border-b border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">
          <div className="col-span-4">Date</div>
          <div className="col-span-3">Reading</div>
          <div className="col-span-4">Note</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-4 w-3/4 rounded bg-slate-200" />
              <div className="h-4 w-2/3 rounded bg-slate-200" />
              <div className="h-4 w-1/2 rounded bg-slate-200" />
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">No readings found.</div>
        ) : (
          <ul>
            {items.map((r) => {
              const { dateStr, timeStr } = formatDateTime(r.datetime_utc);
              return (
                <li
                  key={r.id}
                  className="grid grid-cols-12 items-center gap-2 border-b border-slate-100 px-3 py-2 hover:bg-slate-50"
                  onClick={() => {
                    setSelectedReading(r);
                    setAddOpen(true);
                  }}
                  title="Click to edit this reading"
                >
                  <div className="col-span-4">
                    <div className="text-sm font-medium text-slate-900">
                      {dateStr}
                    </div>
                    <div className="text-xs text-slate-600">{timeStr}</div>
                  </div>
                  <div className="col-span-3">
                    <div className="text-base font-bold text-slate-800">
                      {r.systolic}/{r.diastolic}{" "}
                      <span className="text-sm font-semibold">mmHg</span>
                    </div>
                  </div>
                  <div className="col-span-4">
                    <div className="line-clamp-2 text-sm text-slate-700">
                      {r.note ? (
                        r.note
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(r.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 hover:bg-slate-100"
                      title="Delete"
                    >
                      <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-3 flex flex-col items-stretch gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-700">
          Showing <span className="font-semibold">{items.length}</span> of{" "}
          <span className="font-semibold">{total}</span> readings
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 disabled:opacity-50 hover:bg-slate-100"
            aria-label="Previous page"
          >
            <FontAwesomeIcon icon={faAngleLeft} className="h-4 w-4" />
            Prev
          </button>
          <div className="text-sm text-slate-700">
            Page <span className="font-semibold">{page}</span> of{" "}
            <span className="font-semibold">{totalPages}</span>
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 disabled:opacity-50 hover:bg-slate-100"
            aria-label="Next page"
          >
            Next
            <FontAwesomeIcon icon={faAngleRight} className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mt-3 rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Modal */}
      <AddBPModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setSelectedReading(null);
        }}
        patientId={patientId ?? ""}
        selectedReading={selectedReading}
        onAdded={() => {
          loadReadings();
          setSelectedReading(null);
        }}
      />
    </div>
  );
}
