// src/app/dashboard/layout.tsx
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
    const mq = window.matchMedia("(min-width: 1024px)"); // Tailwind lg breakpoint
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setSidebarOpen(false);
    };
    // Current state on mount
    if (mq.matches) setSidebarOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <PatientProvider>
      <div className="min-h-screen bg-[#f5f7fb]">
        {/* Sidebar:
            - Mobile: drawer (opened via global header event)
            - Desktop: fixed rail (lg+) */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Keep content offset for desktop rail and prevent horizontal overflow */}
        <div className="lg:pl-72">
          <main
            role="main"
            className="mx-auto max-w-7xl px-4 py-6 overflow-hidden min-w-0"
          >
            {children}
          </main>
        </div>
      </div>
    </PatientProvider>
  );
}
