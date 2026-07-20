import { Info, Clock, Lock, Tag, AlertCircle, Sparkles, X, FileSignature, CheckCircle2, User, ChevronRight } from "lucide-react"

interface EditorRightRailProps {
  activePanel: 'none' | 'review' | 'info'
  document: any
  onClose: () => void
}

export function EditorRightRail({ activePanel, document, onClose }: EditorRightRailProps) {
  if (activePanel === 'none') return null

  return (
    <div className="w-[320px] border-l border-slate-200 bg-white flex flex-col shrink-0 h-full overflow-y-auto">
      {/* Panel Header */}
      <div className="h-14 border-b border-slate-100 flex items-center justify-between px-5">
        <div className="flex items-center font-semibold text-slate-800">
          {activePanel === 'info' && <><Info size={16} className="mr-2 text-[#256D85]" /> Document Details</>}
          {activePanel === 'review' && <><FileSignature size={16} className="mr-2 text-amber-600" /> Approval Status</>}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
          <X size={16} />
        </button>
      </div>

      {/* Panel Content */}
      <div className="p-5">
        {activePanel === 'info' && (
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-3">Properties</h3>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-slate-500 flex items-center"><CheckCircle2 size={14} className="mr-2 text-emerald-500"/> Status</span><span className="font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded capitalize">{document.status?.toLowerCase() || 'Draft'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 flex items-center"><User size={14} className="mr-2"/> Author</span><span className="font-medium text-slate-800">System Admin</span></div>
                <div className="flex justify-between"><span className="text-slate-500 flex items-center"><Clock size={14} className="mr-2"/> Created</span><span className="text-slate-800">{new Date(document.created_at).toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 flex items-center"><Clock size={14} className="mr-2"/> Last Edited</span><span className="text-slate-800">{new Date(document.updated_at).toLocaleDateString()}</span></div>
              </div>
            </div>
            <hr className="border-slate-100" />
            <div>
              <h3 className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-3">Security</h3>
              <div className="flex justify-between"><span className="text-slate-500 flex items-center"><Lock size={14} className="mr-2"/> Access</span><span className="font-medium text-slate-800">Workspace Only</span></div>
            </div>
          </div>
        )}

        {activePanel === 'review' && (
          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-800">Requested by System</span>
              <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full flex items-center">
                <Clock size={12} className="mr-1" /> Pending Review
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-start mt-3">
              <AlertCircle size={14} className="mr-1.5 mt-0.5 shrink-0" />
              This document has been draft. Further transitions require a new revision.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
