'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Search, Sparkles, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useAIStore } from '@/stores/ai.store'

export function TopNavbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const openWorkspacePanel = useAIStore((s) => s.openWorkspacePanel)

  // Cmd+K shortcut handled globally by OmniSearch component

  // Build breadcrumb from pathname
  const breadcrumb = pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/-/g, ' '))
    .filter((s) => !s.match(/^[a-z0-9]{20,}$/)) // filter out UUIDs/cids

  return (
    <header className="h-14 border-b border-slate-100 bg-white flex items-center px-4 gap-4 shrink-0 relative z-20">
      {/* Breadcrumb */}
      <div className="flex-1 flex items-center gap-1 text-sm text-slate-500 min-w-0">
        {breadcrumb.map((part, i) => (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <span className="text-slate-300">›</span>}
            <span className={`truncate capitalize ${i === breadcrumb.length - 1 ? 'text-slate-800 font-medium' : ''}`}>
              {part}
            </span>
          </span>
        ))}
      </div>

      {/* Search bar */}
      <div className="flex-shrink-0">
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search documents...</span>
          <kbd className="hidden sm:inline text-xs bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400">⌘K</kbd>
        </button>
      </div>

      {/* AI icon */}
      <button onClick={openWorkspacePanel} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition" title="AI Co-Pilot">
        <Sparkles className="w-5 h-5" />
      </button>

      {/* User avatar */}
      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold flex items-center justify-center uppercase shrink-0">
        {session?.user.name?.[0] ?? session?.user.email?.[0] ?? 'U'}
      </div>
    </header>
  )
}
