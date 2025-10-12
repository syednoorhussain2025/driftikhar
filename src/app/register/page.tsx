"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignUpPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const checkEmailMode = searchParams.get("check") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // If the user is already authenticated, send them away from sign-up
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      // Where to land after the user clicks the confirm link
      const emailRedirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: fullName ? { full_name: fullName.trim() } : undefined,
          emailRedirectTo,
        },
      });

      if (error) {
        setErr(error.message);
        return;
      }

      // Two possible outcomes:
      // A) Email confirmation required -> data.user exists, data.session is null.
      //    Show "check your email" by refreshing into confirmation state.
      // B) Confirmation not required (or provider creates a session) -> session exists.
      if (data.session) {
        router.replace("/dashboard");
      } else {
        // "Refresh" into confirmation UI
        const params = new URLSearchParams(searchParams?.toString() ?? "");
        params.set("check", "1");
        router.replace(`${pathname}?${params.toString()}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const goBackToForm = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("check");
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Optional: allow user to resend the confirmation email if they remained on the check screen.
  const handleResend = async () => {
    if (!email) {
      setErr("Enter your email above, then click Resend.");
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      // supabase-js v2 resend
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : undefined,
        },
      });
      if (error) setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 grid place-items-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="relative rounded-2xl bg-white shadow-lg ring-1 ring-slate-200 overflow-hidden">
          <div
            className="h-2"
            style={{ backgroundColor: "#1e3a8a" }} // brand bar
          />
          {!checkEmailMode ? (
            <form onSubmit={handleSubmit} className="p-6 sm:p-8">
              <header className="mb-6 text-center">
                <h1 className="text-2xl font-semibold text-slate-900">
                  Create your account
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Sign up to continue to{" "}
                  <span className="font-medium">Driftikhar.net</span>
                </p>
              </header>

              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Full name (optional)
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[#1e3a8a]"
                    placeholder="Dr. Iftikhar Ahmed"
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[#1e3a8a]"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[#1e3a8a]"
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              {err && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {err}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full rounded-xl py-2.5 font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: "#1e3a8a" }}
              >
                {loading ? "Creating account…" : "Sign up"}
              </button>

              <p className="mt-4 text-center text-sm text-slate-600">
                Already have an account?{" "}
                <a
                  href="/signin"
                  className="font-medium underline underline-offset-4"
                  style={{ color: "#1e3a8a" }}
                >
                  Sign in
                </a>
              </p>
            </form>
          ) : (
            <div className="p-6 sm:p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                {/* mail icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-slate-700"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
                  <path d="m22 8-10 6L2 8" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900">
                Check your email for confirmation
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                We’ve sent a verification link to{" "}
                <span className="font-medium">{email || "your inbox"}</span>.
                Click the link to activate your account.
              </p>

              {err && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {err}
                </p>
              )}

              <div className="mt-6 grid gap-3">
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 py-2.5 font-medium text-slate-800 disabled:opacity-60"
                >
                  {loading ? "Resending…" : "Resend confirmation email"}
                </button>
                <button
                  onClick={goBackToForm}
                  className="w-full rounded-xl py-2.5 font-semibold text-white"
                  style={{ backgroundColor: "#1e3a8a" }}
                >
                  Use a different email
                </button>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Didn’t get it? Check your spam/junk folder. The link may take a
                minute to arrive.
              </p>
            </div>
          )}
        </div>

        {/* Footer brand / tiny help */}
        <p className="mt-4 text-center text-xs text-slate-500">
          By creating an account, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
