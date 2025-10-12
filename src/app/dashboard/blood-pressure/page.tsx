"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
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
        { count: "exact", head: false } // fetch count alongside data
      )
      .eq("patient_id", patientId)
      .order("datetime_utc", { ascending: false });

    const now = new Date();
    const since = (days: number) => new Date(now.getTime() - days * 86400000);

    if (range !== "custom") {
      const days =
        range === "15d" ? 15 : range === "30d" ? 30 : range === "60d" ? 60 : 90;
      const start = since(days).toISOString();
      query = query.gte("datetime_utc", start);
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

  // Initial load + whenever filters/page change
  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  // Reset to page 1 when filters change (avoids empty pages)
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
      alert(delErr.message);
      return;
    }
    // Reload current page (if last item on last page, adjust page down)
    const remaining = total - 1;
    const newTotalPages = Math.max(1, Math.ceil(remaining / PAGE_SIZE));
    if (page > newTotalPages) setPage(newTotalPages);
    else loadReadings();
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

  return (
    <div className="w-full p-0 text-[15px]">
      {/* Header / Actions */}
      <div className="mb-4 flex items-center justify-between px-0">
        <h1 className="text-2xl font-semibold text-slate-900">
          Blood Pressure
        </h1>
        <button
          onClick={() => {
            setSelectedReading(null); // adding new
            setAddOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 text-white text-sm font-medium px-3 py-2 hover:bg-emerald-700"
        >
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
          Add Blood Pressure
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-none border-y border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
            <FontAwesomeIcon icon={faFilter} className="w-4 h-4" />
            Time range:
          </span>

          {(["15d", "30d", "60d", "90d"] as RangeKey[]).map((rk) => (
            <button
              key={rk}
              onClick={() => setRange(rk)}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                range === rk
                  ? "bg-amber-100 border-amber-300 text-amber-900"
                  : "bg-white border-slate-300 text-slate-800 hover:bg-slate-100"
              }`}
            >
              {rk.replace("d", " days")}
            </button>
          ))}

          <button
            onClick={() => setRange("custom")}
            className={`px-3 py-1.5 text-sm rounded-md border ${
              range === "custom"
                ? "bg-amber-100 border-amber-300 text-amber-900"
                : "bg-white border-slate-300 text-slate-800 hover:bg-slate-100"
            }`}
          >
            Custom
          </button>

          {range === "custom" && (
            <div className="flex items-center gap-2 ml-1">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-600">to</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Averages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 px-0">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-600">Average Systolic</div>
          <div className="text-3xl font-bold text-slate-900">
            {Number.isFinite(avgSys) ? Math.round(avgSys) : "—"}{" "}
            <span className="text-base font-semibold text-slate-900">mmHg</span>
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-600">Average Diastolic</div>
          <div className="text-3xl font-bold text-slate-900">
            {Number.isFinite(avgDia) ? Math.round(avgDia) : "—"}{" "}
            <span className="text-base font-semibold text-slate-900">mmHg</span>
          </div>
        </div>
      </div>

      {/* List Header */}
      <div className="border-y border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
        Readings
      </div>

      {/* List Body */}
      <div className="bg-white">
        {/* Table-like header row */}
        <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-200 text-sm font-medium text-slate-600">
          <div className="col-span-4">Date</div>
          <div className="col-span-3">Reading</div>
          <div className="col-span-4">Note</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
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
                  className="grid grid-cols-12 gap-2 px-3 py-2 items-center border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                  onClick={() => {
                    setSelectedReading(r);
                    setAddOpen(true);
                  }}
                  title="Click to edit this reading"
                >
                  {/* Date column */}
                  <div className="col-span-4">
                    <div className="text-sm font-medium text-slate-900">
                      {dateStr}
                    </div>
                    <div className="text-xs text-slate-600">{timeStr}</div>
                  </div>

                  {/* Reading column (dark grey) */}
                  <div className="col-span-3">
                    <div className="text-base font-bold text-slate-800">
                      {r.systolic}/{r.diastolic}{" "}
                      <span className="text-sm font-semibold">mmHg</span>
                    </div>
                  </div>

                  {/* Note column */}
                  <div className="col-span-4">
                    <div className="text-sm text-slate-700 line-clamp-2">
                      {r.note ? (
                        r.note
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(r.id);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-slate-300 text-slate-800 hover:bg-slate-100"
                      title="Delete"
                    >
                      <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
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
      <div className="flex items-center justify-between gap-3 py-3 border-t border-slate-200 bg-white">
        <div className="px-3 text-sm text-slate-700">
          Showing <span className="font-semibold">{items.length}</span> of{" "}
          <span className="font-semibold">{total}</span> readings
        </div>
        <div className="flex items-center gap-2 px-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-800 disabled:opacity-50 hover:bg-slate-100"
            aria-label="Previous page"
          >
            <FontAwesomeIcon icon={faAngleLeft} className="w-4 h-4" />
            Prev
          </button>
          <div className="text-sm text-slate-700">
            Page <span className="font-semibold">{page}</span> of{" "}
            <span className="font-semibold">{totalPages}</span>
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-800 disabled:opacity-50 hover:bg-slate-100"
            aria-label="Next page"
          >
            Next
            <FontAwesomeIcon icon={faAngleRight} className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 mx-3 text-sm rounded border border-rose-200 bg-rose-50 text-rose-700 p-2">
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
          // Refresh current page with current filters
          loadReadings();
          setSelectedReading(null);
        }}
      />
    </div>
  );
}
