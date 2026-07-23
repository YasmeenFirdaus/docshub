import { useState } from "react"
import Link from "next/link"
import { Sparkles, X, Users, FileText, Star, History } from "lucide-react"
import { useAIStore } from "@/stores/ai.store"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { DocSharePanel } from "@/components/document/DocSharePanel"
import { HistoryDialog } from "./HistoryDialog"
import { DocumentTypeBadge } from "@/components/document/DocumentTypeBadge"

interface EditorHeaderProps {
  documentId: string
  title: string
  location: string
  saveStatus: string
  visibility: string
  type: string
  workspaceId?: string
  folderId?: string
  ownerId: string
  activePanel: 'none' | 'review' | 'info'
  setActivePanel: (panel: 'none' | 'review' | 'info') => void
  content?: any
}

export function EditorHeader({ documentId, title, location, saveStatus, visibility, type, workspaceId, folderId, ownerId, activePanel, setActivePanel, content }: EditorHeaderProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const openDocumentPanel = useAIStore((s) => s.openDocumentPanel)
  const togglePanel = (panel: 'review' | 'info') => {
    setActivePanel(activePanel === panel ? 'none' : panel)
  }

  const returnUrl = folderId && workspaceId ? `/workspace/${workspaceId}/folder/${folderId}` : workspaceId ? `/workspace/${workspaceId}` : `/all-docs`

  return (
    <>
    <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-[#E7ECEA]/80 bg-white/70 px-5 backdrop-blur-xl">
      {/* Left: Navigation & Breadcrumbs */}
      <div className="flex items-center text-[13px]">
        <Link href={returnUrl} className="text-slate-500 hover:text-slate-800 transition-colors">
          Docs
        </Link>
        <span className="text-slate-300 mx-2">/</span>
        <span className="flex items-center gap-2 font-medium text-slate-900">
          <FileText size={14} className="text-[#256D85]" />
          {title || "Untitled"}
          <DocumentTypeBadge type={type} />
          <Star size={14} className="text-slate-300 hover:text-yellow-400 cursor-pointer transition-colors ml-1" />
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <span className={`mr-1 rounded-full px-2 py-1 text-xs font-semibold ${
          saveStatus === 'Saved' ? 'text-emerald-600' : 'text-amber-500'
        }`}>
          {saveStatus}
        </span>
        


        <button 
          onClick={() => openDocumentPanel({ id: documentId, title, content })}
          className="flex h-8 items-center gap-1.5 rounded-md text-[13px] font-medium text-[#256D85] hover:text-[#256D85] hover:bg-[#78C6C9]/14 transition-colors px-2"
        >
          <Sparkles size={14} /> Ask AI
        </button>

        <button 
          onClick={() => setIsShareModalOpen(true)}
          className="flex h-8 items-center gap-1.5 rounded-md text-[13px] font-medium text-slate-600 hover:text-slate-900 transition-colors px-2"
        >
          <Users size={14} /> Share
        </button>

        <button 
          onClick={() => setIsHistoryOpen(true)}
          className="flex h-8 items-center gap-1.5 rounded-md text-[13px] font-medium text-slate-600 hover:text-slate-900 transition-colors px-2"
        >
          <History size={14} /> Version History
        </button>

        <Link 
          href={returnUrl}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors ml-1"
        >
          <X size={18} />
        </Link>
      </div>
    </header>
    <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
      <DialogContent className="max-w-xl overflow-hidden p-0" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Share Document</DialogTitle>
        <DocSharePanel
          doc={{
            id: documentId,
            title,
            workspace_id: workspaceId || "",
            owner_id: ownerId,
            type,
          }}
          onClose={() => setIsShareModalOpen(false)}
        />
      </DialogContent>
    </Dialog>
    <HistoryDialog 
      documentId={documentId} 
      isOpen={isHistoryOpen} 
      onClose={() => setIsHistoryOpen(false)} 
    />
    </>
  )
}
