"use client"

import { useState, useEffect, useCallback } from "react"
import { useDebounce } from "use-debounce"
import { Loader2, Search, FileText, User as UserIcon, Folder, Shield, X, ArrowRight, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ActivityMeta {
  operation?: string
  resource_type?: string
  resource_id?: string
  resource_label?: string
  source?: string
  workspace?: string
  context?: string
  location_before?: string
  location_after?: string
  previous?: any
  current?: any
  [key: string]: any
}

interface ActivityLog {
  id: string
  user_id: string
  action: string
  entity: string
  entity_id: string
  meta: ActivityMeta
  created_at: string
  story: string
  user?: { name: string, email: string, avatar_url?: string }
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch] = useDebounce(search, 400)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)

  const fetchLogs = useCallback(async (pageNum: number, searchQuery: string, append: boolean = false) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/activity?page=${pageNum}&limit=25&search=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      if (data.logs) {
        setLogs(prev => append ? [...prev, ...data.logs] : data.logs)
        setHasMore(data.logs.length === 25)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    fetchLogs(1, debouncedSearch, false)
  }, [debouncedSearch, fetchLogs])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchLogs(nextPage, debouncedSearch, true)
  }

  const getEntityIcon = (type?: string) => {
    switch (type) {
      case 'DOCUMENT': return <FileText size={14} className="text-[#256D85]" />
      case 'FOLDER': return <Folder size={14} className="text-amber-500" />
      case 'USER':
      case 'MEMBER': return <UserIcon size={14} className="text-blue-500" />
      case 'WORKSPACE': return <Shield size={14} className="text-slate-600" />
      default: return <FileText size={14} className="text-slate-400" />
    }
  }

  const renderResourceLink = (log: ActivityLog, isLink: boolean = true) => {
    const { resource_type, resource_id, resource_label } = log.meta
    const label = resource_label || log.entity_id || 'Unknown Resource'
    
    if (log.meta.operation === 'DELETE' || log.meta.operation === 'PERMANENT_DELETE') {
      return (
        <div className="flex items-center gap-1.5 truncate opacity-70">
          {getEntityIcon(resource_type)}
          <span className="text-slate-600 truncate line-through">{label}</span>
        </div>
      )
    }

    const content = (
      <div className="flex items-center gap-1.5 truncate">
        {getEntityIcon(resource_type)}
        <span className="text-slate-700 truncate font-medium hover:underline">{label}</span>
      </div>
    )

    if (!isLink) return content

    if (resource_type === 'DOCUMENT' && resource_id) {
      return <Link href={`/document/${resource_id}`} onClick={(e) => e.stopPropagation()}>{content}</Link>
    }
    if (resource_type === 'MEMBER' || resource_type === 'USER') {
      return <Link href={`/settings/members`} onClick={(e) => e.stopPropagation()}>{content}</Link>
    }
    if (resource_type === 'FOLDER' && resource_id && log.meta.workspace) {
      return <Link href={`/workspace/${log.meta.workspace}?folder=${resource_id}`} onClick={(e) => e.stopPropagation()}>{content}</Link>
    }
    
    return content
  }

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] relative overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#E7ECEA]/80 bg-white px-8">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Activity Logs</h1>
          <p className="text-xs text-slate-500">Workspace audit feed and event history.</p>
        </div>
        <div className="relative w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input 
            type="text"
            placeholder="Search Activity..."
            className="pl-9 bg-slate-50 h-9 rounded-full border-slate-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8 relative">
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-4 border-b bg-slate-50/80 p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <div className="col-span-2">Time</div>
            <div className="col-span-2">Actor</div>
            <div className="col-span-3">Story</div>
            <div className="col-span-2">Resource</div>
            <div className="col-span-2">Context</div>
            <div className="col-span-1 text-right">Result</div>
          </div>
          
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div 
                key={log.id} 
                onClick={() => setSelectedLog(log)}
                className="grid grid-cols-12 gap-4 p-4 text-sm items-center hover:bg-slate-50/60 transition-colors cursor-pointer"
              >
                <div className="text-slate-500 text-xs col-span-2" title={new Date(log.created_at).toLocaleString()}>
                  {new Date(log.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
                <div className="flex items-center gap-2 col-span-2 truncate">
                  {log.user?.avatar_url ? (
                    <img src={log.user.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                      {log.user?.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <span className="truncate text-slate-700">{log.user?.name || log.user?.email || 'System'}</span>
                </div>
                <div className="col-span-3 truncate text-slate-800">
                  {log.story}
                </div>
                <div className="col-span-2 truncate">
                  {renderResourceLink(log)}
                </div>
                <div className="col-span-2 truncate flex items-center">
                  {log.meta.source && (
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-medium">
                      {log.meta.source}
                    </span>
                  )}
                  {log.meta.context && (
                    <span className="ml-2 text-xs text-slate-500 truncate">{log.meta.context}</span>
                  )}
                </div>
                <div className="col-span-1 flex justify-end">
                  <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-medium border border-emerald-100">
                    <CheckCircle2 size={12} />
                    <span>Done</span>
                  </div>
                </div>
              </div>
            ))}

            {logs.length === 0 && !loading && (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                <Shield className="w-12 h-12 text-slate-200 mb-3" />
                <p>No activity logs found.</p>
              </div>
            )}
          </div>
          
          {loading && (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#256D85]" />
            </div>
          )}

          {hasMore && !loading && (
            <div className="p-4 border-t flex justify-center bg-slate-50">
              <Button variant="outline" size="sm" onClick={loadMore}>
                Load More
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Detail Drawer */}
      <div className={`absolute inset-y-0 right-0 w-[450px] bg-white shadow-2xl border-l transform transition-transform duration-300 ease-in-out z-50 ${selectedLog ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedLog && (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-5 border-b bg-slate-50/50">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <FileText size={16} className="text-[#256D85]" />
                Event Details
              </h2>
              <button onClick={() => setSelectedLog(null)} className="p-1 rounded hover:bg-slate-200 text-slate-500 transition">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-auto space-y-8">
              {/* Main Story & Actor */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-slate-900 leading-snug">{selectedLog.story}</h3>
                
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-white shadow-sm">
                  {selectedLog.user?.avatar_url ? (
                    <img src={selectedLog.user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600">
                      {selectedLog.user?.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-800">{selectedLog.user?.name || 'System'}</p>
                    <p className="text-xs text-slate-500">{new Date(selectedLog.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm border-t pt-6">
                <div className="text-slate-500">Resource</div>
                <div className="text-slate-800 font-medium">{renderResourceLink(selectedLog)}</div>
                
                <div className="text-slate-500">Operation</div>
                <div className="text-slate-800"><span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono">{selectedLog.meta.operation || selectedLog.action}</span></div>
                
                {selectedLog.meta.source && (
                  <>
                    <div className="text-slate-500">Source Page</div>
                    <div className="text-slate-800">{selectedLog.meta.source}</div>
                  </>
                )}

                {selectedLog.meta.location_before && selectedLog.meta.location_after && (
                  <>
                    <div className="text-slate-500">Moved From</div>
                    <div className="text-slate-800">{selectedLog.meta.location_before}</div>
                    <div className="text-slate-500">Moved To</div>
                    <div className="text-slate-800">{selectedLog.meta.location_after}</div>
                  </>
                )}
              </div>

            </div>
            
            <div className="p-5 border-t bg-slate-50 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedLog(null)}>Close</Button>
            </div>
          </div>
        )}
      </div>

      {/* Backdrop for drawer */}
      {selectedLog && (
        <div 
          className="absolute inset-0 bg-slate-900/10 z-40 backdrop-blur-[1px] transition-opacity"
          onClick={() => setSelectedLog(null)}
        />
      )}
    </div>
  )
}
