// src/app/dashboard/layout.tsx
"use client";

import { useState } from "react";
import { PatientProvider } from "./_context/PatientContext";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <PatientProvider>
      <div className="min-h-screen bg-[#f5f7fb]">
        {/* Header (burger only in app area) */}
        <Header onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Sidebar:
            - Mobile: drawer (state-controlled)
            - Desktop: fixed rail (lg+) */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Desktop rail offset.
           Add overflow guards so children can't cause horizontal scroll. */}
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
