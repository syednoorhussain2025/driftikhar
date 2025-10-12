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
        {/* Global header (burger appears only in app area) */}
        <Header onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Sidebar:
            - Mobile: drawer controlled by state above
            - Desktop: fixed rail (lg+) */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Content offset so it doesn't sit under the desktop rail */}
        <div className="lg:pl-72">
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        </div>
      </div>
    </PatientProvider>
  );
}
