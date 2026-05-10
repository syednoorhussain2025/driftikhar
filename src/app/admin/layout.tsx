"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handler = () => setSidebarOpen(true);
    window.addEventListener("open-dashboard-sidebar", handler);
    return () => window.removeEventListener("open-dashboard-sidebar", handler);
  }, []);

  useEffect(() => {
    if (sidebarOpen) setSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#f5f7fb] overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
