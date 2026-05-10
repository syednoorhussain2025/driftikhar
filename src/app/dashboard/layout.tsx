"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PatientProvider } from "./_context/PatientContext";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Open from global header burger
  useEffect(() => {
    const handler = () => setSidebarOpen(true);
    window.addEventListener("open-dashboard-sidebar", handler);
    return () => window.removeEventListener("open-dashboard-sidebar", handler);
  }, []);

  // Close on route change
  useEffect(() => {
    if (sidebarOpen) setSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  // If user resizes up to desktop, ensure layout is in a clean state
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setSidebarOpen(false);
    };
    if (mq.matches) setSidebarOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // 👇 Last-resort guard: clear any transient selection/focus after refresh/nav restore
  useEffect(() => {
    const clearTransient = () => {
      try {
        const sel = window.getSelection?.();
        if (sel && sel.rangeCount) sel.removeAllRanges();
        const ae = document.activeElement as HTMLElement | null;
        if (ae && typeof ae.blur === "function") ae.blur();
      } catch {}
    };
    // When the page is shown (including bfcache restores) and when it becomes visible
    window.addEventListener("pageshow", clearTransient);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") clearTransient();
    });
    return () => {
      window.removeEventListener("pageshow", clearTransient);
    };
  }, []);

  return (
    <PatientProvider>
      {/* Shell: isolated stacking context + overscroll containment + no tap highlight/selection */}
      <div
        id="dashboard-shell"
        className="min-h-screen bg-[#f5f7fb] lg:pl-72"
        style={{
          overscrollBehaviorY: "contain",
          WebkitTapHighlightColor: "transparent",
          WebkitUserSelect: "none",
        }}
      >
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main
          role="main"
          className="mx-auto max-w-7xl px-4 py-6 min-w-0 overflow-x-hidden"
        >
          {children}
        </main>
      </div>
    </PatientProvider>
  );
}
