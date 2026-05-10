// src/components/Header.tsx
"use client";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

const STETHO_SVG =
  "https://mnlnbuosiczjalpgeara.supabase.co/storage/v1/object/public/icons/stethoscope-solid-full.svg";

export default function Header({
  onOpenSidebar,
}: {
  /** optional handler (used when Header is local); falls back to global event */
  onOpenSidebar?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<"patient" | "admin" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpen]);

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
        setRole((prof?.role as any) ?? null);
      }
      setLoading(false);
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
      } else setRole(null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = useCallback(() => router.push("/"), [router]);
  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/");
  }, [router]);

  const linkBtn =
    "inline-flex items-center gap-2 rounded-lg border border-transparent px-2.5 py-1.5 text-sm " +
    "text-slate-700 hover:text-[var(--brand-blue,#1e3a8a)] hover:border-slate-300 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue,#1e3a8a)]/40";
  const linkIcon = "text-orange-500";

  // show burger only in protected areas (auth is enforced by middleware, not needed here)
  const showBurger =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  // Fallback: if no prop provided (global header), fire a window event the dashboard listens for
  const openSidebar = () => {
    if (onOpenSidebar) {
      onOpenSidebar();
    } else {
      window.dispatchEvent(new CustomEvent("open-dashboard-sidebar"));
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between gap-4 py-2">
          {/* Left */}
          <div className="flex min-w-0 items-center gap-3">
            {showBurger && (
              <button
                type="button"
                className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-slate-100"
                aria-label="Open menu"
                onClick={openSidebar}
              >
                <FontAwesomeIcon
                  icon={faBars}
                  className="text-[var(--brand-blue,#1e3a8a)] text-lg"
                />
              </button>
            )}

            <Link href="/" className="group flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-blue,#1e3a8a)] shadow-sm"
              >
                <img src={STETHO_SVG} alt="" className="h-5 w-5 invert" />
              </span>
              <span className="flex min-w-0 flex-col items-end">
                <span className="truncate text-lg font-semibold text-[var(--brand-blue,#1e3a8a)] leading-none">
                  Dr Iftikhar&apos;s Diabetes Clinic
                </span>
                <em className="mt-[5px] text-[12px] italic text-slate-600 leading-none">
                  Pakistan&apos;s Premier Diabetes Center
                </em>
              </span>
            </Link>

            <div className="hidden md:block ml-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                <i className="fas fa-phone text-amber-600 text-[11px]" />
                For Appointments Contact 03332313996
              </span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Admin button always visible on mobile for admins */}
            {email && role === "admin" && (
              <button
                onClick={() => router.push("/admin")}
                className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-orange-600 transition-colors"
                title="Admin"
              >
                <i className="fas fa-user-shield" />
                Admin
              </button>
            )}

            {/* Home + profile hidden on mobile when burger is shown */}
            <button
              onClick={() => router.push("/")}
              className={`${linkBtn} ${showBurger ? "hidden lg:inline-flex" : ""}`}
              title="Home"
            >
              <i className={`fas fa-house ${linkIcon}`} />
              <span className="hidden sm:inline">Home</span>
            </button>

            {loading ? (
              <div className={`h-8 w-28 animate-pulse rounded-lg bg-slate-200 ${showBurger ? "hidden lg:block" : ""}`} />
            ) : email ? (
              <div className={`relative ${showBurger ? "hidden lg:block" : ""}`} ref={profileRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className={linkBtn}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <i className={`fas fa-user ${linkIcon}`} />
                  <span className="hidden max-w-[180px] truncate sm:inline">
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
                    className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border bg-white shadow-lg"
                  >
                    <div className="flex items-start gap-2 border-b px-4 py-2 text-xs text-slate-500">
                      <i className={`fas fa-circle-user ${linkIcon}`} />
                      <div>
                        <div className="font-medium text-slate-600">
                          Signed in as
                        </div>
                        <div className="truncate">{email}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        router.push("/dashboard");
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-slate-50"
                      role="menuitem"
                    >
                      <i className={`fas fa-gauge ${linkIcon}`} />
                      My Dashboard
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        router.push("/profile");
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-slate-50"
                      role="menuitem"
                    >
                      <i className={`fas fa-id-card ${linkIcon}`} />
                      Profile
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleSignOut();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-slate-50"
                      role="menuitem"
                    >
                      <i className={`fas fa-right-from-bracket ${linkIcon}`} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className={linkBtn}
                title="Sign in"
              >
                <i className={`fas fa-right-to-bracket ${linkIcon}`} />
                <span className="hidden sm:inline">Sign in</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
