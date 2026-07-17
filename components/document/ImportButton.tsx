'use client'

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, Loader2 } from "lucide-react"

interface ImportButtonProps {
  workspaceId?: string
  folderId?: string
}

export function ImportButton({ workspaceId, folderId }: ImportButtonProps) {
  const router = useRouter()
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    const formData = new FormData()
    formData.append("file", file)
    if (workspaceId) formData.append("workspace_id", workspaceId)
    if (folderId) formData.append("folder_id", folderId)

    try {
      const res = await fetch('/api/documents/import', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        const { document, htmlContent } = await res.json()
        
        // Save the raw HTML to sessionStorage. 
        // The editor will grab this, convert it to blocks, and clear it out.
        sessionStorage.setItem(`import_html_${document.id}`, htmlContent)
        
        router.push(`/document/${document.id}`)
      } else {
        alert("Failed to import document.")
      }
    } catch (error) {
      console.error(error)
      alert("An error occurred during import.")
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <>
      <input 
        type="file" 
        accept=".docx,.pdf,.ppt,.pptx,.md,.html,.json,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint"        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        className="flex items-center px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
      >
        {isImporting ? <Loader2 size={16} className="mr-2 animate-spin text-slate-400" /> : <Upload size={16} className="mr-2" />}
        {isImporting ? "Importing..." : "Import"}
      </button>
    </>
  )
}