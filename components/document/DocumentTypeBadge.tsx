import React from 'react';

const CONFIG = {
  EDITABLE: { label: "Editable", className: "bg-blue-100 text-blue-700 border border-blue-200" },
  PDF:      { label: "PDF",      className: "bg-red-100 text-red-700 border border-red-200" },
  PPT:      { label: "PPT",      className: "bg-orange-100 text-orange-700 border border-orange-200" },
} as const;

export function DocumentTypeBadge({ type }: { type: string }) {
  // Hide editable badge as we don't have specific format data (docx, md, etc.)
  if (!type || type === "EDITABLE") return null;

  // Use type from DB if known, otherwise fallback
  const cfg = CONFIG[type as keyof typeof CONFIG] || { label: type, className: "bg-slate-100 text-slate-700 border border-slate-200" };
  
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
