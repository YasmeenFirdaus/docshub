import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronLeft, FileSignature, Info, Sparkles, X, Link2, Download, Users } from "lucide-react"
import { useAIStore } from "@/stores/ai.store"

interface EditorHeaderProps {
  documentId: string
  title: string
  location: string
  saveStatus: string
  visibility: string
  type: string
  workspaceId: string
  activePanel: 'none' | 'review' | 'info'
  setActivePanel: (panel: 'none' | 'review' | 'info') => void
  content?: any
}

export function EditorHeader({ documentId, title, location, saveStatus, visibility, type, workspaceId, activePanel, setActivePanel, content }: EditorHeaderProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const openDocumentPanel = useAIStore((s) => s.openDocumentPanel)
  const togglePanel = (panel: 'review' | 'info') => {
    setActivePanel(activePanel === panel ? 'none' : panel)
  }

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-10">
      {/* Left: Navigation & Breadcrumbs */}
      <div className="flex items-center text-sm">
        <Link href="/all-docs" className="flex items-center font-medium text-slate-600 hover:text-slate-900 mr-4">
          <ChevronLeft size={16} className="mr-1" /> Back
        </Link>
        <div className="h-4 w-px bg-slate-300 mr-4"></div>
        <span className="text-slate-400">{location}</span>
        <span className="text-slate-400 mx-2">/</span>
        <span className="font-semibold text-slate-800">{title || "Untitled"}</span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <span className={`text-xs font-medium mr-2 ${
          saveStatus === 'Saved' ? 'text-emerald-600' : 'text-amber-500'
        }`}>
          {saveStatus}
        </span>
        
        <button 
          onClick={() => togglePanel('review')}
          className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${activePanel === 'review' ? 'bg-slate-100 border-slate-300 text-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <FileSignature size={14} className="mr-2" /> Review
        </button>

        <button 
          onClick={() => togglePanel('info')}
          className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${activePanel === 'info' ? 'bg-slate-100 border-slate-300 text-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <Info size={14} className="mr-2" /> Info
        </button>

        <button 
          onClick={() => openDocumentPanel({ id: documentId, title, content })}
          className="flex items-center px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Sparkles size={14} className="mr-2" /> Ask AI
        </button>

        <button 
          onClick={() => setIsShareModalOpen(true)}
          className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Share
        </button>
      </div>

      {isShareModalOpen && (
        <ShareModal 
          documentId={documentId} 
          title={title} 
          visibility={visibility} 
          type={type} 
          workspaceId={workspaceId} 
          onClose={() => setIsShareModalOpen(false)} 
        />
      )}
    </header>
  )
}

function ShareModal({ documentId, title, visibility, type, workspaceId, onClose }: any) {
  const [members, setMembers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [permission, setPermission] = useState<'VIEW' | 'EDIT'>('VIEW')
  const [sharing, setSharing] = useState(false)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (workspaceId) {
      fetch(`/api/workspaces/${workspaceId}/members`)
        .then((r) => r.json())
        .then(data => {
          // data could be { members: [] } or just [] depending on API
          setMembers(Array.isArray(data) ? data : (data.members || []))
        })
    }
  }, [workspaceId, visibility])

  const shareWithUser = async () => {
    if (!selectedUser) return
    setSharing(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedUser, permission }),
      })
      setMessage(res.ok ? 'Document shared!' : 'Failed to share')
    } catch {
      setMessage('Failed to share')
    } finally {
      setSharing(false)
      setSelectedUser('')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/document/${documentId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportDoc = async (format: 'docx' | 'pdf') => {
    const res = await fetch(`/api/documents/${documentId}/export?format=${format}`)
    if (!res.ok) { alert('Export failed'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Share Document</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 space-y-5">
          {/* Copy link */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Share Link</p>
            <button
              onClick={copyLink}
              className="w-full flex items-center gap-2.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition"
            >
              <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="flex-1 text-left truncate text-xs text-slate-500">
                {`${typeof window !== 'undefined' ? window.location.origin : ''}/document/${documentId}`}
              </span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full transition ${copied ? 'bg-green-100 text-green-600' : 'bg-white border border-slate-200 text-slate-600'}`}>
                {copied ? 'Copied!' : 'Copy'}
              </span>
            </button>
          </div>

          {/* Share with member */}
          {workspaceId && (
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Share with Member
              </p>
              <div className="space-y-2">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-indigo-400"
                >
                  <option value="">Select member...</option>
                  {members.map((m: any) => (
                    <option key={m.user?.id || m.id} value={m.user?.id || m.id}>
                      {m.user?.name ?? m.user?.email ?? m.name ?? m.email}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <select
                    value={permission}
                    onChange={(e) => setPermission(e.target.value as 'VIEW' | 'EDIT')}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="VIEW">View</option>
                    <option value="EDIT">Edit</option>
                  </select>
                  <button
                    onClick={shareWithUser}
                    disabled={sharing || !selectedUser}
                    className="flex-1 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium"
                  >
                    {sharing ? 'Sharing...' : 'Share'}
                  </button>
                </div>
                {message && (
                  <p className={`text-xs ${message.includes('shared') ? 'text-green-600' : 'text-red-500'}`}>
                    {message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Export */}
          {type === 'EDITABLE' && (
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Export & Download
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => exportDoc('docx')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 hover:bg-slate-100 transition"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  Download as .docx
                </button>
                <button
                  onClick={() => exportDoc('pdf')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 hover:bg-slate-100 transition"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  Download as PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
