'use client'

import { useState, useEffect, useMemo } from "react"
import { AnalyticsTable } from "./AnalyticsTable"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Search } from "lucide-react"
import { FilterBar, FilterCondition } from "@/components/document/FilterBar"

export default function AnalyticsPage() {
  const { data: session } = useSession()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterCondition[]>([])

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'OWNER') {
      return
    }
    
    // Fetch a large number of logs to filter on client
    fetch('/api/admin/activity?limit=1000')
      .then(res => res.json())
      .then(data => {
        setLogs(data.logs || [])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [session])

  const filterFields = useMemo(() => {
    const owners = new Set<string>()
    const stories = new Set<string>()
    const sources = new Set<string>()
    
    logs.forEach(log => {
      const owner = log.user?.name || log.user?.email || 'System'
      if (owner) owners.add(owner)
      
      if (log.story) stories.add(log.story)
      
      const source = (log.meta as any)?.source
      if (source) sources.add(source)
    })
    
    return [
      { id: 'owner', label: 'Owner/Actor', type: 'select', options: Array.from(owners).sort() },
      { id: 'story', label: 'Story/Action', type: 'select', options: Array.from(stories).sort() },
      { id: 'source', label: 'Source', type: 'select', options: Array.from(sources).sort() },
      { id: 'document', label: 'Document', type: 'text' },
      { id: 'date', label: 'Date', type: 'date' },
    ]
  }, [logs])

  // Client-side filtering
  const filteredLogs = logs.filter(log => {
    const q = searchQuery.toLowerCase()
    const owner = (log.user?.name || log.user?.email || 'System').toLowerCase()
    const story = (log.story || '').toLowerCase()
    const source = ((log.meta as any)?.source || '').toLowerCase()
    const docName = ((log.meta as any)?.resource_label || '').toLowerCase()
    const dateStr = new Date(log.created_at).toISOString().split('T')[0]

    // Search query
    if (q) {
      if (!owner.includes(q) && !story.includes(q) && !source.includes(q) && !docName.includes(q)) {
        return false
      }
    }

    // Advanced filters
    for (const f of filters) {
      const op = f.operator
      const val = typeof f.value === 'string' ? f.value.toLowerCase() : f.value

      let fieldVal = ''
      if (f.field === 'owner') fieldVal = owner
      else if (f.field === 'story') fieldVal = story
      else if (f.field === 'source') fieldVal = source
      else if (f.field === 'document') fieldVal = docName
      else if (f.field === 'date') fieldVal = dateStr

      if (f.field === 'date') {
        if (op === 'eq' && fieldVal !== f.value) return false
        if (op === 'before' && new Date(fieldVal) >= new Date(f.value)) return false
        if (op === 'after' && new Date(fieldVal) <= new Date(f.value)) return false
      } else {
        if (op === 'is' || op === 'eq') {
          if (fieldVal !== val) return false
        } else if (op === 'is_not' || op === 'neq') {
          if (fieldVal === val) return false
        } else if (op === 'contains') {
          if (!fieldVal.includes(val)) return false
        } else if (op === 'not_contains') {
          if (fieldVal.includes(val)) return false
        }
      }
    }

    return true
  })

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-5 lg:p-8">
        <div className="mb-6 h-10 w-48 rounded-lg skeleton-shimmer" />
        <div className="h-96 w-full rounded-2xl skeleton-shimmer" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-5 lg:p-8 h-full flex flex-col">
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FilterBar filters={filters} setFilters={setFilters} fields={filterFields} />
          <span className="ml-1 text-sm text-slate-500 font-medium">{filteredLogs.length} records</span>
        </div>

        <div className="relative w-full sm:w-48">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search analytics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-[13px] outline-none transition-all focus:border-[#256D85] focus:ring-1 focus:ring-[#78C6C9]"
          />
        </div>
      </div>
      
      <div className="flex-1 min-h-0">
        <AnalyticsTable rows={filteredLogs} />
      </div>
    </div>
  )
}
