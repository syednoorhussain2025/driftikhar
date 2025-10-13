// src/app/dashboard/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { PatientProvider } from "./_context/PatientContext";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Open the sidebar when the global header's burger is clicked
  useEffect(() => {
    const handler = () => setSidebarOpen(true);
    window.addEventListener("open-dashboard-sidebar", handler);
    return () => window.removeEventListener("open-dashboard-sidebar", handler);
  }, []);

  return (
    <PatientProvider>
      <div className="min-h-screen bg-[#f5f7fb]">
        {/* Sidebar:
            - Mobile: drawer (state-controlled via global header event)
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
