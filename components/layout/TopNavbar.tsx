'use client'

import { usePathname } from 'next/navigation'
import { Search, Sparkles, Settings } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useAIStore } from '@/stores/ai.store'
import { NotificationDropdown } from '@/components/layout/NotificationDropdown'

export function TopNavbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const openWorkspacePanel = useAIStore((s) => s.openWorkspacePanel)

  const breadcrumb = pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/-/g, ' '))
    .filter((s) => !s.match(/^[a-z0-9]{20,}$/))

  const visibleBreadcrumb =
    breadcrumb.length > 4 ? [breadcrumb[0], '...', ...breadcrumb.slice(-2)] : breadcrumb

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-4 border-b border-[#E7ECEA]/80 bg-white/70 px-5 shadow-[0_1px_0_rgba(14,116,144,0.06)] backdrop-blur-xl">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-sm text-slate-500">
        {visibleBreadcrumb.map((part, i) => (
          <span key={`${part}-${i}`} className="flex min-w-0 items-center gap-1">
            {i > 0 && <span className="text-slate-300">/</span>}
            <span
              title={part === '...' ? breadcrumb.join(' / ') : part}
              className={`truncate capitalize ${
                i === visibleBreadcrumb.length - 1
                  ? 'max-w-[18rem] font-semibold text-[#1E293B]'
                  : part === '...'
                    ? 'max-w-8 text-slate-400'
                    : 'max-w-[12rem]'
              }`}
            >
              {part}
            </span>
          </span>
        ))}
      </div>

      <button
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
        className="premium-control flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-sm text-[#256D85]"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search documents</span>
        <kbd className="hidden rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500 sm:inline">
          Ctrl K
        </kbd>
      </button>

      <NotificationDropdown />

      <button
        onClick={openWorkspacePanel}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#256D85] transition hover:bg-[#FAFAF9] hover:text-[#256D85]"
        title="AI Co-Pilot"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      {(session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER') && (
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#78C6C9]/18 text-[#256D85] ring-2 ring-white transition hover:bg-[#78C6C9]/30"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </Link>
      )}
    </header>
  )
}
