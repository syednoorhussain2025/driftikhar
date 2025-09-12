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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/");
    });
  }, [router]);

  async function handleSubmit() {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) {
      alert("Not signed in");
      return;
    }

    // 1) Does patient already exist?
    const { data: existing } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let patientId: string | null = existing?.id ?? null;

    if (!patientId) {
      // 2) Create patient with generated code
      const { data: created, error: e1 } = await supabase.rpc(
        "gen_patient_code"
      );
      if (e1) {
        alert(e1.message);
        return;
      }

      const { data: patientRow, error: e2 } = await supabase
        .from("patients")
        .insert({ user_id: userId, patient_code: created as string })
        .select("id")
        .single();

      if (e2) {
        alert(e2.message);
        return;
      }
      patientId = patientRow.id;
    }

    // 3) Upsert demographics
    const { error: e3 } = await supabase.from("patient_demographics").upsert({
      patient_id: patientId,
      full_name: fullName.trim(),
      mobile: mobile.trim() || null,
      city: city.trim() || null,
      age: age === "" ? null : Number(age),
      gender: gender || null,
    });

    if (e3) {
      alert(e3.message);
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Patient registration</h1>
      <div className="mt-4 grid gap-3">
        <input
          className="w-full rounded-xl border px-3 py-2"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          className="w-full rounded-xl border px-3 py-2"
          placeholder="Mobile"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />
        <input
          className="w-full rounded-xl border px-3 py-2"
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          type="number"
          className="w-full rounded-xl border px-3 py-2"
          placeholder="Age"
          value={age}
          onChange={(e) =>
            setAge(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
        <select
          className="w-full rounded-xl border px-3 py-2"
          value={gender}
          onChange={(e) => setGender(e.target.value as any)}
        >
          <option value="">Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        <button
          onClick={handleSubmit}
          className="w-full rounded-xl bg-[#00b78b] py-2 font-semibold text-white"
        >
          Save & Continue
        </button>
      </div>
    </main>
  );
}
