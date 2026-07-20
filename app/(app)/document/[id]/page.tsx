'use client'

import { useEffect, useState } from "react"
import { BlockNoteEditor } from "../../../../editor/components/BlockNoteEditor"
import { EditorHeader } from "../../../../editor/components/EditorHeader"
import { EditorRightRail } from "../../../../editor/components/EditorRightRail"
import { Loader2, FileText } from "lucide-react"

export default function DocumentPage({ params }: { params: { id: string } }) {
  const [doc, setDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [saveStatus, setSaveStatus] = useState('Saved')
  const [activePanel, setActivePanel] = useState<'none' | 'review' | 'info'>('none')

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await fetch(`/api/documents/${params.id}`)
        if (!res.ok) throw new Error("Document not found")
        const data = await res.json()
        
        // If it's a readonly file, it doesn't need to save, so set status accordingly
        if (data.type === 'READONLY') setSaveStatus('Read Only')
        
        setDoc(data)
      } catch (err) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchDoc()
  }, [params.id])

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-[#256D85]" />
        <p className="text-sm font-medium text-slate-500">Opening document...</p>
      </div>
    </div>
  )
  
  if (error || doc?.error) return (
    <div className="h-screen flex items-center justify-center text-red-500 bg-slate-50">
      <div className="premium-card rounded-2xl p-8 text-center">
        <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
        <p className="text-sm text-slate-600">This document does not exist or you do not have permission to view it.</p>
      </div>
    </div>
  )

  const locationPath = doc.workspace ? `${doc.workspace.name} ${doc.folder ? `/ ${doc.folder.name}` : ''}` : 'Private'

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-100">
      <EditorHeader 
        documentId={doc.id}
        title={doc.title} 
        location={locationPath}
        saveStatus={saveStatus} 
        visibility={doc.visibility}
        type={doc.type}
        workspaceId={doc.workspace_id}
        ownerId={doc.owner_id}
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        content={doc.content}
      />
      
      {/* Extract isPdf to determine iframe source */}

      <div className="flex flex-1 overflow-hidden">
        <main className="premium-card relative m-4 flex flex-1 flex-col overflow-y-auto rounded-2xl bg-white">
          
          {/* TRAFFIC CONTROLLER: Render Editor OR File Viewer */}
            {doc.type === 'EDITABLE' ? (
                <BlockNoteEditor 
                    documentId={doc.id} 
                    initialTitle={doc.title} 
                    initialContent={doc.content} 
                    onSaveStatusChange={setSaveStatus}
                />
                ) : (
                <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden rounded-xl">
                    {doc.file_url ? (
                    <iframe 
                        src={doc.type === 'PDF' || doc.file_url.toLowerCase().endsWith('.pdf') ? doc.file_url : `https://docs.google.com/viewer?url=${window.location.origin}${doc.file_url}&embedded=true`} 
                        className="w-full h-full border-none bg-white"
                        title={doc.title}
                    />
                    ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                        <p>File preview not available.</p>
                    </div>
                    )}
                </div>
            )}

        </main>

        <EditorRightRail 
          activePanel={activePanel} 
          document={doc} 
          onClose={() => setActivePanel('none')} 
        />
      </div>
    </div>
  )
}
