"use client";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignUpPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  async function signUp(e?: React.FormEvent) {
    e?.preventDefault();
    setErrorMsg(null);

    if (!email || !pw) {
      setErrorMsg("Please provide both email and password.");
      return;
    }
    if (pw.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pw,
    });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message ?? "Something went wrong.");
      return;
    }

    if (!data.session) {
      setConfirmationSent(true);
      setPw("");
      router.refresh();
      return;
    }

    router.replace("/register");
  }

  async function resendConfirmation() {
    if (!email) return;
    setResendLoading(true);
    setErrorMsg(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    setResendLoading(false);
    if (error) setErrorMsg(error.message ?? "Failed to resend email.");
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl bg-white shadow-lg border border-slate-100">
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-[#1e3a8a]/10 flex items-center justify-center">
                <svg
                  aria-hidden
                  className="h-6 w-6 text-[#1e3a8a]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M7 10V7a5 5 0 0 1 10 0v3" />
                  <rect x="5" y="10" width="14" height="11" rx="2" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Create your account
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Use your email and a secure password to get started.
              </p>
            </div>

            {/* Success (confirmation) state */}
            {confirmationSent ? (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <svg
                    aria-hidden
                    className="h-5 w-5 mt-0.5 text-emerald-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M22 5.5 12 13 2 5.5" />
                    <path d="M22 5.5v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-13" />
                  </svg>
                  <div className="text-sm">
                    <p className="font-medium text-emerald-900">
                      Check your email for confirmation
                    </p>
                    <p className="mt-1 text-emerald-900/80">
                      We’ve sent a confirmation link to{" "}
                      <span className="font-medium">{email}</span>. Please open
                      the link to verify your account. If you don’t see it,
                      check your spam or promotions folder.
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        onClick={resendConfirmation}
                        disabled={resendLoading}
                        className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
                        type="button"
                      >
                        {resendLoading ? "Resending..." : "Resend email"}
                      </button>
                      <button
                        onClick={() => {
                          setConfirmationSent(false);
                          router.refresh();
                        }}
                        className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        type="button"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Form
              <form onSubmit={signUp} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#1e3a8a]/20"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#1e3a8a]/20"
                    placeholder="••••••••"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    At least 6 characters.
                  </p>
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
                  {loading ? "Creating..." : "Create Account"}
                </button>

                <div className="pt-2 text-center text-sm text-slate-600">
                  Already have an account?{" "}
                  <a
                    href="/"
                    className="font-medium text-[#1e3a8a] hover:underline"
                  >
                    Sign in
                  </a>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
