'use client'

import React, { useState, useEffect } from 'react'
import { LayoutList, FileText, User as UserIcon, Folder, Shield, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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

const renderResourceLink = (log: any, isLink: boolean = true) => {
  const { resource_type, resource_id, resource_label } = log.meta || {}
  const label = resource_label || log.entity_id || 'Unknown Resource'
  
  if (log.meta?.operation === 'DELETE' || log.meta?.operation === 'PERMANENT_DELETE') {
    return (
      <div className="flex items-center gap-1.5 truncate opacity-70" onClick={(e) => e.stopPropagation()}>
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

export function AnalyticsTable({ rows }: { rows: any[] }) {
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10
  const [selectedLog, setSelectedLog] = useState<any>(null)

  useEffect(() => {
    setCurrentPage(1)
  }, [rows])

  const totalPages = Math.ceil(rows.length / rowsPerPage)
  const paginatedRows = rows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  return (
    <div className="flex flex-col h-full gap-4 relative overflow-hidden">
      <div className="premium-card min-h-0 flex-1 flex flex-col overflow-hidden rounded-2xl relative z-0">
        <div className="overflow-auto flex-1 pb-16">
          <table className="w-full text-sm whitespace-nowrap min-w-[1000px]">
            <thead>
              <tr className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/95 text-[11px] uppercase tracking-[0.08em] text-slate-500 backdrop-blur">
                <th className="text-left px-5 py-2 font-semibold min-w-[150px]">Date</th>
                <th className="text-left px-4 py-2 font-semibold min-w-[120px]">Time</th>
                <th className="text-left px-4 py-2 font-semibold min-w-[180px]">Owner/Actor</th>
                <th className="text-left px-4 py-2 font-semibold min-w-[200px]">Story/Action</th>
                <th className="text-left px-4 py-2 font-semibold min-w-[200px]">Resource</th>
                <th className="text-left px-4 py-2 font-semibold min-w-[150px]">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16">
                    <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <LayoutList className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">No records found</p>
                      <p className="mt-1 text-sm text-slate-500">Try changing your filters.</p>
                    </div>
                  </td>
                </tr>
              )}
              {paginatedRows.map((doc) => {
                const d = new Date(doc.created_at)
                const dateStr = d.toLocaleDateString()
                const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                const owner = doc.user?.name || doc.user?.email || 'System'
                const source = (doc.meta as any)?.source || '—'

                return (
                  <tr
                    key={doc.id}
                    onClick={() => setSelectedLog(doc)}
                    className="group cursor-pointer border-b border-slate-100/80 transition-colors last:border-0 hover:bg-[#78C6C9]/10"
                  >
                    <td className="px-5 py-3 text-slate-600 transition-colors group-hover:bg-[#78C6C9]/10">
                      {dateStr}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {timeStr}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                          {owner.charAt(0)}
                        </div>
                        <span className="truncate max-w-[150px]">{owner}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#256D85] font-medium">
                      {doc.story}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {renderResourceLink(doc)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {source}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {rows.length > rowsPerPage && (
          <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/50 px-5 py-3">
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-800">{(currentPage - 1) * rowsPerPage + 1}</span> to <span className="font-semibold text-slate-800">{Math.min(currentPage * rowsPerPage, rows.length)}</span> of <span className="font-semibold text-slate-800">{rows.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center justify-center h-8 px-3 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#256D85] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const page = i + 1;
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "flex items-center justify-center h-8 min-w-[32px] px-2 text-xs font-semibold rounded-lg transition-all shadow-sm",
                          currentPage === page
                            ? "bg-[#256D85] text-white border-transparent"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#256D85]"
                        )}
                      >
                        {page}
                      </button>
                    )
                  }
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="text-slate-400 text-xs px-1">...</span>
                  }
                  return null;
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center justify-center h-8 px-3 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#256D85] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Slide-over Detail Drawer */}
      <div className={`fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl border-l transform transition-transform duration-300 ease-in-out z-50 ${selectedLog ? 'translate-x-0' : 'translate-x-full'}`}>
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
                <div className="text-slate-800"><span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono">{selectedLog.meta?.operation || selectedLog.action}</span></div>
                
                {selectedLog.meta?.source && (
                  <>
                    <div className="text-slate-500">Source Page</div>
                    <div className="text-slate-800">{selectedLog.meta.source}</div>
                  </>
                )}

                {selectedLog.meta?.location_before && selectedLog.meta?.location_after && (
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
          className="fixed inset-0 bg-slate-900/10 z-40 backdrop-blur-[1px] transition-opacity"
          onClick={() => setSelectedLog(null)}
        />
      )}
    </div>
  )
}
