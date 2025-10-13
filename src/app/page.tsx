"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const app = process.env.NEXT_PUBLIC_APP_NAME || "Dr Iftikhar's Clinic";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  async function loginEmail() {
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pw,
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    router.replace("/dashboard");
  }

  async function loginGoogle() {
    setErr(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/dashboard`
            : undefined,
      },
    });
    if (error) setErr(error.message);
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <main className="mx-auto max-w-6xl px-4 py-10">
        {/* Auth split card */}
        <section className="grid overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 lg:grid-cols-2">
          {/* Left: Medical photo */}
          <div className="relative hidden lg:block">
            <img
              src="https://mnlnbuosiczjalpgeara.supabase.co/storage/v1/object/public/images/medical.png"
              alt="Doctor reviewing a patient's chart"
              width={600}
              height={450}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://mnlnbuosiczjalpgeara.supabase.co/storage/v1/object/public/images/fallback.jpg";
              }}
            />
          </div>

          {/* Right: Sign-in form */}
          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-semibold text-slate-900">
                Welcome to Dr Ifikhar's Diabetes App
              </h1>
              <p className="mt-2 text-slate-600">
                {app} — secure diabetes records and quick insights.
              </p>
            </div>

            {err && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {err}
              </div>
            )}

            <div className="grid gap-3">
              <div>
                <label className="text-sm text-slate-700">Email</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="text-sm text-slate-700">Password</label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="••••••••"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <button
                onClick={loginEmail}
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>

              <div className="relative my-2 text-center text-xs text-slate-500">
                <span className="bg-white px-2">or</span>
                <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-slate-200" />
              </div>

              <button
                onClick={loginGoogle}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                {/* Google G icon (SVG) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="h-5 w-5"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.14 0 5.9 1.08 8.12 3.18l6.04-6.04C34.63 3.02 29.76 1 24 1 14.73 1 6.7 6.92 3.09 15.08l7.29 5.67C12.06 13.87 17.49 9.5 24 9.5z"
                  />
                  <path
                    fill="#34A853"
                    d="M46.5 24.5c0-1.62-.15-3.17-.43-4.67H24v9.1h12.7c-.55 2.97-2.22 5.48-4.7 7.18l7.29 5.67c4.27-3.95 6.71-9.76 6.71-17.28z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.38 28.23a14.44 14.44 0 0 1-.83-4.73c0-1.64.3-3.22.83-4.73l-7.29-5.67C1.79 16.54 1 20.16 1 24s.79 7.46 2.09 10.9l7.29-5.67z"
                  />
                  <path
                    fill="#4285F4"
                    d="M24 47c5.76 0 10.6-1.9 14.13-5.18l-7.29-5.67C29.04 37.02 26.66 38 24 38c-6.51 0-11.94-4.37-13.62-10.25l-7.29 5.67C6.7 41.08 14.73 47 24 47z"
                  />
                </svg>
                Continue with Google
              </button>
            </div>

            <div className="mt-5 text-sm text-slate-700">
              New patient?{" "}
              <button
                className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800"
                onClick={() => router.push("/login")}
              >
                Create an account
              </button>
            </div>
          </div>
        </section>

        {/* Info card */}
        <section className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200/60">
          <div className="font-medium text-slate-800">What happens next?</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>After sign-in, complete a one-time patient registration.</li>
            <li>Use “Add Sugar” from the header to log glucose readings.</li>
            <li>
              Admins can access the patient search from the header’s Admin
              button.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
