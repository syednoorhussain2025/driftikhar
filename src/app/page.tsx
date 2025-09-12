"use client";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const app = process.env.NEXT_PUBLIC_APP_NAME || "App";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  async function loginEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pw,
    });
    setLoading(false);
    if (error) alert(error.message);
    else router.replace("/dashboard");
  }

  async function loginGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/dashboard`
            : undefined,
      },
    });
    if (error) alert(error.message);
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">{app}</h1>
      <p className="mt-1 text-slate-600">
        Patient record management for diabetes.
      </p>

      <div className="mt-6 rounded-2xl border p-4">
        <h2 className="font-medium">Sign in</h2>
        <div className="mt-3 space-y-2">
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
            onClick={loginEmail}
            disabled={loading}
            className="w-full rounded-xl bg-[#00b78b] py-2 font-semibold text-white"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <button
            onClick={loginGoogle}
            className="w-full rounded-xl border py-2"
          >
            Continue with Google
          </button>
        </div>

        <div className="mt-4 text-sm">
          New patient?{" "}
          <button className="underline" onClick={() => router.push("/login")}>
            Create an account
          </button>
        </div>
      </div>
    </main>
  );
}
