import Link from "next/link"
import { ChevronLeft, FileSignature, Info, Sparkles } from "lucide-react"

interface EditorHeaderProps {
  title: string
  location: string
  saveStatus: string
  activePanel: 'none' | 'review' | 'info' | 'ai'
  setActivePanel: (panel: 'none' | 'review' | 'info' | 'ai') => void
}

export function EditorHeader({ title, location, saveStatus, activePanel, setActivePanel }: EditorHeaderProps) {
  const togglePanel = (panel: 'review' | 'info' | 'ai') => {
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
          onClick={() => togglePanel('ai')}
          className="flex items-center px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Sparkles size={14} className="mr-2" /> Ask AI
        </button>

        <button className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          Share
        </button>
      </div>
    </header>
  )
}