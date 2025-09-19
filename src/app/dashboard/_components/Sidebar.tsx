// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGauge,
  faNotesMedical,
  faChartLine,
  faHeartPulse,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

export default function Sidebar() {
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: "Dashboard", icon: faGauge },
    {
      href: "/dashboard/readings",
      label: "Sugar Readings",
      icon: faNotesMedical,
    },
    { href: "/dashboard/graphs", label: "Sugar Graphs", icon: faChartLine },
    {
      href: "/dashboard/blood-pressure",
      label: "Blood Pressure",
      icon: faHeartPulse,
    },
    // ✅ Added My Account page (keep it consistent with your style)
    { href: "/dashboard/account", label: "My Account", icon: faUser },
  ];

  return (
    <aside
      suppressHydrationWarning
      className="
        fixed left-4 top-20 z-30 hidden
        h-[calc(100vh-6rem)] w-64 overflow-auto
        rounded-xl border border-slate-200 bg-white p-4 shadow-md lg:block
      "
      aria-label="Sidebar"
    >
      <nav className="flex flex-col gap-2">
        {items.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out ${
                active
                  ? "border-b-2 border-orange-500 text-slate-900"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform transition-colors ${
                  active
                    ? "bg-orange-500 text-white"
                    : "bg-orange-400 text-white group-hover:bg-orange-500"
                }`}
              >
                <FontAwesomeIcon icon={icon} size="sm" />
              </span>
              <span
                className={`transition-transform duration-200 group-hover:translate-x-1 ${
                  active ? "font-semibold" : ""
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
