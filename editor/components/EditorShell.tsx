'use client'

import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export function EditorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Micro-header for quick navigation back to All Docs */}
      <header className="h-12 border-b border-slate-200 flex items-center px-4 bg-[#FAFBFC]">
        <Link 
          href="/all-docs" 
          className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={16} className="mr-1" />
          Back to Documents
        </Link>
      </header>
      
      {/* Editor Canvas Area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}