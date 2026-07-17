'use client'

import { Bell, Search, Star } from "lucide-react"

export function TopNavbar() {
  return (
    <div className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 sticky top-0 z-10">
      <div className="flex items-center text-sm text-slate-500">
        <span className="hover:text-slate-800 cursor-pointer">Enterprise DMS</span>
        <span className="mx-2">/</span>
        <span className="font-medium text-slate-800">Dashboard</span>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="text-slate-400 hover:text-amber-500 transition-colors">
          <Star size={18} />
        </button>
        <button className="text-slate-400 hover:text-indigo-600 transition-colors">
          <Bell size={18} />
        </button>
      </div>
    </div>
  )
}