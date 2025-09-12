"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"; // ← use your configured client

export default function Header() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<"patient" | "admin" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        const user = data.session?.user ?? null;
        setEmail(user?.email ?? null);

        if (user) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("role")
            .eq("user_id", user.id)
            .maybeSingle();
          setRole((prof?.role as any) ?? null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      if (session?.user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then((res) => setRole((res.data?.role as any) ?? null));
      } else {
        setRole(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/");
  }, [router]);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur shadow-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Left: Logo */}
        <Link
          href="/"
          className="select-none text-xl font-bold tracking-tight text-blue-700 hover:text-blue-800"
        >
          Dr Iftikhar&apos;s Clinic
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Home (always visible) */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1 rounded-xl border border-blue-700 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
            title="Home"
          >
            <i className="fas fa-house mr-1" />
            <span className="hidden sm:inline">Home</span>
          </button>

          {/* Add Sugar (signed in only) */}
          {email && (
            <button
              onClick={() => router.push("/add-sugar")}
              className="flex items-center gap-1 rounded-xl bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-blue-800"
              title="Quick add sugar reading"
            >
              <i className="fas fa-plus-circle mr-1" />
              <span className="hidden sm:inline">Add Sugar</span>
            </button>
          )}

          {/* Admin (only admins) */}
          {email && role === "admin" && (
            <button
              onClick={() => router.push("/admin")}
              className="flex items-center gap-1 rounded-xl bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-blue-800"
              title="Admin"
            >
              <i className="fas fa-user-shield mr-1" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          {/* Auth menu */}
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-200" />
          ) : email ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-blue-700 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <i className="fas fa-user" />
                <span className="hidden max-w-[160px] truncate sm:inline">
                  {email}
                </span>
                <i
                  className={`fas fa-chevron-down transition-transform ${
                    menuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border bg-white shadow-lg"
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/dashboard");
                    }}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                    role="menuitem"
                  >
                    My Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleSignOut();
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                    role="menuitem"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="rounded-xl bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-blue-800"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
