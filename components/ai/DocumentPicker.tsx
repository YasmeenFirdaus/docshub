'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, FileText, X, Check } from 'lucide-react'

export type DocOption = {
  id: string
  title: string
  breadcrumb?: string
  content?: any
}

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (doc: DocOption) => void
  excludeIds?: string[]
}

/** Inline dropdown — caller controls open state and positions it */
export function DocumentPickerDropdown({ open, onClose, onSelect, excludeIds = [] }: Props) {
  const [query, setQuery] = useState('')
  const [docs, setDocs] = useState<DocOption[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const controller = new AbortController()
    fetch(`/api/documents?search=${encodeURIComponent(query)}&limit=30`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const rows: any[] = Array.isArray(data) ? data : data?.documents ?? []
        setDocs(
          rows
            .filter((d) => d?.id && !excludeIds.includes(d.id))
            .map((d) => ({
              id: d.id,
              title: d.title || 'Untitled',
              breadcrumb: [d.workspace?.name, d.folder?.name].filter(Boolean).join(' / '),
              // content intentionally NOT stored here — list API omits it
              // caller must fetch /api/documents/:id to get full content
            }))
        )
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [open, query, excludeIds.join(',')])

  if (!open) return null

  return (
    <div className="premium-card absolute bottom-full left-0 mb-2 w-full rounded-2xl z-50 overflow-hidden animate-doc-fade-up">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents…"
          className="flex-1 text-sm outline-none placeholder:text-slate-400 bg-transparent"
        />
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul className="max-h-52 overflow-y-auto">
        {loading && <li className="px-4 py-3 text-xs text-slate-400">Loading…</li>}
        {!loading && docs.length === 0 && (
          <li className="px-4 py-3 text-xs text-slate-400">No documents found</li>
        )}
        {docs.map((doc) => (
          <li key={doc.id}>
            <button
              type="button"
              onClick={() => { onSelect(doc); onClose() }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-[#78C6C9]/14 transition"
            >
              <FileText className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="flex-1 min-w-0">
                <span className="block truncate font-medium text-slate-800">{doc.title}</span>
                {doc.breadcrumb && (
                  <span className="text-xs text-slate-400 truncate block">{doc.breadcrumb}</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
