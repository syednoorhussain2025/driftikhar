"use client";

import { PatientProvider } from "./_context/PatientContext";
import Sidebar from "./_components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PatientProvider>
      <div className="min-h-screen bg-[#f5f7fb] lg:pl-72">
        <Sidebar />
        <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
      </div>
    </PatientProvider>
  );
}
