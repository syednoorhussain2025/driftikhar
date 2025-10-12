// src/components/Sidebar.tsx
"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGauge,
  faNotesMedical,
  faChartLine,
  faHeartPulse,
  faUser,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

type SidebarProps = {
  /** Controls mobile drawer visibility */
  isOpen?: boolean;
  /** Called to close the drawer (overlay click, Esc, close btn, link click) */
  onClose?: () => void;
};

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const labelId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

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
    { href: "/dashboard/account", label: "My Account", icon: faUser },
  ];

  // Lock body scroll when drawer is open (mobile)
  useEffect(() => {
    if (!isOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen]);

  // Close on Escape (mobile)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  /* ---------- Desktop rail (unchanged behavior on lg+) ---------- */
  const DesktopRail = (
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
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                active
                  ? "border-b-2 border-orange-500 text-slate-900"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
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

  /* ---------- Mobile drawer ---------- */
  const MobileDrawer = (
    <div
      className={`fixed inset-0 z-50 lg:hidden transition-[visibility] ${
        isOpen ? "visible" : "invisible"
      }`}
    >
      {/* Overlay */}
      <button
        aria-label="Close menu"
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        className={`
          absolute left-0 top-0 h-full w-72 max-w-[85vw]
          bg-white shadow-2xl border-r
          transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b">
          <h2 id={labelId} className="text-sm font-semibold">
            Menu
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-slate-100"
            aria-label="Close menu"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <nav className="p-3 flex flex-col gap-2">
          {items.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose} // close drawer after navigation
                className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  active
                    ? "border-b-2 border-orange-500 text-slate-900"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
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
      </div>
    </div>
  );

  return (
    <>
      {DesktopRail}
      {MobileDrawer}
    </>
  );
}
