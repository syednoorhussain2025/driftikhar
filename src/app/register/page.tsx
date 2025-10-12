"use client";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPatient() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [city, setCity] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/");
    });
  }, [router]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setErrorMsg(null);

    // Minimal client-side validation
    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (age !== "" && (Number(age) < 0 || Number(age) > 120)) {
      setErrorMsg("Please enter a valid age.");
      return;
    }

    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setErrorMsg("You are not signed in.");
        setLoading(false);
        return;
      }

      // 1) Does patient already exist?
      const { data: existing, error: exErr } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (exErr) throw exErr;

      let patientId: string | null = existing?.id ?? null;

      if (!patientId) {
        // 2) Create patient with generated code
        const { data: created, error: genErr } = await supabase.rpc(
          "gen_patient_code"
        );
        if (genErr) throw genErr;

        const { data: patientRow, error: insErr } = await supabase
          .from("patients")
          .insert({ user_id: userId, patient_code: created as string })
          .select("id")
          .single();

        if (insErr) throw insErr;
        patientId = patientRow.id;
      }

      // 3) Upsert demographics
      const { error: upErr } = await supabase
        .from("patient_demographics")
        .upsert({
          patient_id: patientId!,
          full_name: fullName.trim(),
          mobile: mobile.trim() || null,
          city: city.trim() || null,
          age: age === "" ? null : Number(age),
          gender: gender || null,
        });

      if (upErr) throw upErr;

      router.replace("/dashboard");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl bg-white shadow-lg border border-slate-100 transition-all duration-300 hover:shadow-2xl">
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-[#1e3a8a]/10 flex items-center justify-center">
                {/* User/profile icon */}
                <svg
                  aria-hidden
                  className="h-6 w-6 text-[#1e3a8a]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z" />
                  <path d="M4 20a8 8 0 0 1 16 0" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Patient registration
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Tell us a bit about you to complete setup.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Full name
                </label>
                <input
                  id="fullName"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#1e3a8a]/20"
                  placeholder="e.g., Iftikhar Ahmed"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="mobile"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Mobile
                </label>
                <input
                  id="mobile"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#1e3a8a]/20"
                  placeholder="03XX-XXXXXXX"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  inputMode="tel"
                />
              </div>

              <div>
                <label
                  htmlFor="city"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  City
                </label>
                <input
                  id="city"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#1e3a8a]/20"
                  placeholder="Karachi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="age"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Age
                  </label>
                  <input
                    id="age"
                    type="number"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#1e3a8a]/20"
                    placeholder="e.g., 34"
                    value={age}
                    onChange={(e) =>
                      setAge(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    min={0}
                    max={120}
                  />
                </div>

                <div>
                  <label
                    htmlFor="gender"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Gender
                  </label>
                  <select
                    id="gender"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#1e3a8a]/20"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#1e3a8a] py-3 font-semibold text-white text-[16px] shadow-md transition duration-200 hover:bg-[#243fa1] hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save & Continue"}
              </button>

              <div className="pt-2 text-center text-sm text-slate-600">
                Want to go back?{" "}
                <a
                  href="/dashboard"
                  className="font-medium text-[#1e3a8a] hover:underline"
                >
                  Dashboard
                </a>
              </div>
            </form>
          </div>
        </div>

        {/* Optional tiny helper note (kept clean like Sign Up) */}
        {/* <p className="mt-4 text-center text-xs text-slate-500">
          Need help? Contact support.
        </p> */}
      </div>
    </main>
  );
}
