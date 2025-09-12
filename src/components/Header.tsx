"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlusCircle,
  faUserShield,
  faUser,
  faChevronDown,
  faHouse, // ← NEW: Home icon
} from "@fortawesome/free-solid-svg-icons";

export default function Header() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<"patient" | "admin" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
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
        setRole(prof?.role as any);
      }

      setLoading(false);
    }
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      if (session?.user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then((res) => setRole(res.data?.role as any));
      } else {
        setRole(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
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
          className="select-none text-sm font-bold tracking-tight text-slate-900 hover:opacity-90"
        >
          Dr Iftikhikar&apos;s Clinic
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Home (always visible) */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1 rounded-xl border px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
            title="Home"
          >
            <FontAwesomeIcon icon={faHouse} />
            <span className="hidden sm:inline">Home</span>
          </button>

          {/* Add Sugar (signed in only) */}
          {email && (
            <button
              onClick={() => router.push("/add-sugar")}
              className="flex items-center gap-1 rounded-xl bg-[#00b78b] px-3 py-1.5 text-sm font-semibold text-white shadow hover:opacity-95"
              title="Quick add sugar reading"
            >
              <FontAwesomeIcon icon={faPlusCircle} />
              <span className="hidden sm:inline">Add Sugar</span>
            </button>
          )}

          {/* Admin (only admins) */}
          {email && role === "admin" && (
            <button
              onClick={() => router.push("/admin")}
              className="flex items-center gap-1 rounded-xl bg-[#F78300] px-3 py-1.5 text-sm font-semibold text-white shadow hover:opacity-95"
              title="Admin"
            >
              <FontAwesomeIcon icon={faUserShield} />
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
                className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-50"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <FontAwesomeIcon icon={faUser} />
                <span className="hidden max-w-[160px] truncate sm:inline">
                  {email}
                </span>
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`transition-transform ${
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
              className="rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
