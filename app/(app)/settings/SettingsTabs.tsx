"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SettingsTabs() {
  const pathname = usePathname();

  const tabs = [
    { name: "Manage Members", href: "/settings/members" },
    { name: "Analytics", href: "/settings/analytics" },
  ];

  return (
    <nav className="flex space-x-6">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={`whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium transition-colors ${
              isActive
                ? "border-[#256D85] text-[#256D85]"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {tab.name}
          </Link>
        );
      })}
    </nav>
  );
}
