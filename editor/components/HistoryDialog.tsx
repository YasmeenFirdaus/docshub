import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronLeft, ChevronRight, X } from "lucide-react"

interface Version {
  id: string
  version: number
  reason: string
  created_at: string
  saved_by: string
  saved_by_user: { name: string, email: string, avatar_url?: string }
  is_current: boolean
}

interface HistoryDialogProps {
  documentId: string
  isOpen: boolean
  onClose: () => void
  onRestoreSelect?: (versionId: string) => Promise<void>
}

export function HistoryDialog({ documentId, isOpen, onClose, onRestoreSelect }: HistoryDialogProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [totalVersions, setTotalVersions] = useState(0)

  useEffect(() => {
    if (isOpen) {
      loadVersions(1)
    }
  }, [isOpen])

  const loadVersions = async (pageNumber: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/versions?page=${pageNumber}&limit=5`)
      const data = await res.json()
      if (data.versions) {
        setVersions(data.versions)
        setHasMore(data.versions.length === 5)
        setPage(pageNumber)
        // Mocking total versions based on the highest version number
        if (data.versions.length > 0 && pageNumber === 1) {
          setTotalVersions(data.versions[0].version)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (version: Version) => {
    if (!confirm(`Restore Version ${version.version}? Current changes will be saved as a new version before restoring.`)) return
    
    setRestoringId(version.id)
    try {
      if (onRestoreSelect) {
        await onRestoreSelect(version.id)
        onClose()
      } else {
        const res = await fetch(`/api/documents/${documentId}/versions/${version.id}/restore`, {
          method: 'POST'
        })
        if (res.ok) {
          window.location.reload()
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setRestoringId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + 
           d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatReason = (reason: string) => {
    return reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Calculate pagination mock display
  const totalPages = Math.ceil(totalVersions / 5) || 1;
  const startCount = ((page - 1) * 5) + 1;
  const endCount = Math.min(page * 5, totalVersions);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl flex flex-col p-0 gap-0 rounded-2xl overflow-hidden bg-white border-none shadow-xl max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <DialogTitle className="text-base font-bold text-slate-900">
            Version History
          </DialogTitle>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto bg-white p-4">
          {loading && versions.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#256D85]" />
            </div>
          ) : (
            <table className="w-full text-left text-xs mb-2">
              <thead>
                <tr className="border-b-2 border-slate-100 text-[10px] font-bold text-slate-500 tracking-wide">
                  <th className="pb-2 font-bold w-[15%]">Version</th>
                  <th className="pb-2 font-bold w-[25%]">Updated At</th>
                  <th className="pb-2 font-bold w-[25%]">Updated By</th>
                  <th className="pb-2 font-bold w-[25%]">Reason</th>
                  <th className="pb-2 font-bold text-right w-[10%]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {versions.map((v) => (
                  <tr key={v.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{v.version}</span>
                        {v.is_current && (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-emerald-600 border border-emerald-100">
                            Current
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 whitespace-nowrap text-slate-700 text-xs font-medium">
                      {formatDate(v.created_at)}
                    </td>
                    <td className="py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {v.saved_by_user.avatar_url ? (
                          <img src={v.saved_by_user.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600">
                            {v.saved_by_user.name?.charAt(0) || 'U'}
                          </div>
                        )}
                        <span className="font-semibold text-slate-700 text-xs truncate max-w-[100px]">{v.saved_by_user.name || v.saved_by_user.email}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-xs text-slate-600 truncate max-w-[120px]">
                      {formatReason(v.reason)}
                    </td>
                    <td className="py-2.5 whitespace-nowrap text-right">
                      {v.is_current ? (
                        <span className="text-slate-400 font-bold pr-2">—</span>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 px-2 text-[10px] font-bold text-[#256D85] border-[#78C6C9]/40 bg-[#78C6C9]/5 hover:bg-[#78C6C9]/10 rounded-md transition-colors"
                          onClick={() => handleRestore(v)}
                          disabled={restoringId === v.id}
                        >
                          {restoringId === v.id ? '...' : 'Restore'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                
                {versions.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                      No version history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer / Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="text-xs font-medium text-slate-500">
            {totalVersions > 0 ? `Showing ${startCount} to ${endCount} of ${totalVersions}` : 'Showing 0'}
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => page > 1 && loadVersions(page - 1)}
              disabled={page === 1}
              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-40 disabled:hover:text-slate-500 transition-colors"
            >
              <ChevronLeft size={12} /> Prev
            </button>
            
            <div className="flex items-center gap-0.5 mx-1">
              <button className="flex h-6 w-6 items-center justify-center rounded-md bg-[#256D85] text-white text-[11px] font-bold">
                {page}
              </button>
              {hasMore && (
                <>
                  <button onClick={() => loadVersions(page + 1)} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 text-[11px] font-bold transition-colors">
                    {page + 1}
                  </button>
                  {page + 2 <= totalPages && (
                    <button onClick={() => loadVersions(page + 2)} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 text-[11px] font-bold transition-colors">
                      {page + 2}
                    </button>
                  )}
                  {totalPages > page + 2 && <span className="text-slate-400 mx-0.5 font-bold text-xs">...</span>}
                  {totalPages > page + 1 && (
                    <button onClick={() => loadVersions(totalPages)} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 text-[11px] font-bold transition-colors">
                      {totalPages}
                    </button>
                  )}
                </>
              )}
            </div>
            
            <button 
              onClick={() => hasMore && loadVersions(page + 1)}
              disabled={!hasMore}
              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-40 disabled:hover:text-slate-500 transition-colors"
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
