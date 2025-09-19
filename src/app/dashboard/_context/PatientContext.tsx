"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* ----------------------------- Types ----------------------------- */

export type Reading = {
  id: string;
  datetime_utc: string;
  mgdl: number;
  tag: string | null;
  note?: string | null;
};

type Demographics = {
  full_name: string | null;
  age: number | null;
  gender: string | null; // 'male' | 'female' | 'other' | null
  city: string | null;
};

type Ctx = {
  loading: boolean;
  errorMsg: string | null;
  // patient
  patientId: string | null;
  patientCode: string | null;
  name: string; // kept for backwards-compat (maps to full_name when present)
  email: string;
  demographics: Demographics;
  // data
  readings: Reading[];
  refreshReadings: () => Promise<void>;
  deleteReading: (id: string) => Promise<void>;
  deleting: Record<string, boolean>;
};

const PatientContext = createContext<Ctx | null>(null);

/* ----------------------------- Provider ----------------------------- */

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientCode, setPatientCode] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [demographics, setDemographics] = useState<Demographics>({
    full_name: null,
    age: null,
    gender: null,
    city: null,
  });

  const [readings, setReadings] = useState<Reading[]>([]);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Auth gate + react to sign-out
  useEffect(() => {
    let cancel = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancel || !mountedRef.current) return;
      if (!data.session) router.replace("/");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!mountedRef.current) return;
      if (!session) router.replace("/");
    });

    return () => {
      cancel = true;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  const fetchReadings = useCallback(async (pid: string) => {
    const { data, error } = await supabase
      .from("glucose_readings")
      .select("id, datetime_utc, mgdl, tag, note")
      .eq("patient_id", pid)
      .order("datetime_utc", { ascending: true }); // ascending is convenient for charts

    if (!mountedRef.current) return;

    if (error) {
      setErrorMsg(error.message || "Failed to load readings.");
      return;
    }
    setReadings((data || []) as Reading[]);
  }, []);

  const refreshReadings = useCallback(async () => {
    if (patientId) await fetchReadings(patientId);
  }, [fetchReadings, patientId]);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        router.replace("/");
        return;
      }
      setEmail(auth.user?.email || "");

      const { data: p, error: pErr } = await supabase
        .from("patients")
        .select("id, patient_code")
        .eq("user_id", uid)
        .maybeSingle();
      if (pErr) throw pErr;

      if (!p) {
        router.replace("/register");
        return;
      }

      if (!mountedRef.current) return;

      setPatientId(p.id);
      setPatientCode(p.patient_code);

      const { data: d, error: dErr } = await supabase
        .from("patient_demographics")
        .select("full_name, age, gender, city")
        .eq("patient_id", p.id)
        .maybeSingle();
      if (dErr) throw dErr;

      // expose full_name via both `name` and `demographics.full_name`
      const fullName = d?.full_name ?? "";
      setName(fullName);
      setDemographics({
        full_name: d?.full_name ?? null,
        age: d?.age ?? null,
        gender: d?.gender ?? null,
        city: d?.city ?? null,
      });

      await fetchReadings(p.id);
    } catch (e: any) {
      if (!mountedRef.current) return;
      setErrorMsg(e?.message ?? "Failed to load patient profile.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchReadings, router]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const deleteReading = useCallback(
    async (id: string) => {
      if (!patientId) return;
      if (!confirm("Delete this reading? This cannot be undone.")) return;

      setDeleting((s) => ({ ...s, [id]: true }));

      const { error } = await supabase
        .from("glucose_readings")
        .delete()
        .match({ id, patient_id: patientId });

      if (!mountedRef.current) return;

      if (error) {
        alert(error.message);
        setDeleting(({ [id]: _skip, ...rest }) => rest);
        return;
      }

      setReadings((prev) => prev.filter((r) => r.id !== id));
      setDeleting(({ [id]: _skip, ...rest }) => rest);
    },
    [patientId]
  );

  const value = useMemo<Ctx>(
    () => ({
      loading,
      errorMsg,
      patientId,
      patientCode,
      name,
      email,
      demographics,
      readings,
      refreshReadings,
      deleteReading,
      deleting,
    }),
    [
      loading,
      errorMsg,
      patientId,
      patientCode,
      name,
      email,
      demographics,
      readings,
      refreshReadings,
      deleteReading,
      deleting,
    ]
  );

  return (
    <PatientContext.Provider value={value}>{children}</PatientContext.Provider>
  );
}

/* ----------------------------- Hook ----------------------------- */

export function usePatient() {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error("usePatient must be used within PatientProvider");
  return ctx;
}
