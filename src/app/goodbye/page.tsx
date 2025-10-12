// src/app/goodbye/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Goodbye | Account Deleted",
};

export default function GoodbyePage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl bg-white shadow-lg border border-slate-100">
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-emerald-600/10 flex items-center justify-center">
                {/* Check icon */}
                <svg
                  aria-hidden
                  className="h-6 w-6 text-emerald-700"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>

              <h1 className="text-2xl font-semibold text-slate-900">
                Your account has been deleted
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                We’ve removed your profile and associated data. Thanks for
                trying our service.
              </p>
            </div>

            {/* Body */}
            <div className="mt-6 space-y-4 text-sm text-slate-600">
              <p>
                If this was unintentional, you’re welcome to create a new
                account anytime.
              </p>
            </div>

            {/* Actions */}
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#1e3a8a] py-3 font-semibold text-white text-[16px] shadow-md transition duration-200 hover:bg-[#243fa1] active:scale-[0.98]"
              >
                Go to homepage
              </Link>
            </div>
          </div>
        </div>

        {/* Small footer note */}
        <p className="mt-4 text-center text-xs text-slate-500">
          We’re continually improving—your feedback is appreciated.
        </p>
      </div>
    </main>
  );
}
