"use client";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  async function signUp() {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password: pw });
    setLoading(false);
    if (error) {
      alert(error.message);
      return;
    }
    // After sign-up, send user to register page to create patient record
    router.replace("/register");
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <div className="mt-4 space-y-2">
        <input
          className="w-full rounded-xl border px-3 py-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="w-full rounded-xl border px-3 py-2"
          placeholder="Password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <button
          onClick={signUp}
          disabled={loading}
          className="w-full rounded-xl bg-[#00b78b] py-2 font-semibold text-white"
        >
          {loading ? "Creating..." : "Create account"}
        </button>
      </div>
    </main>
  );
}
