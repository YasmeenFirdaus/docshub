'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, File, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  onClose: () => void
  onSuccess?: () => void
  workspaceId?: string
  folderId?: string
}

const ALLOWED_TYPES = ['.docx', '.pdf', '.ppt', '.pptx', '.html', '.htm', '.md', '.txt']
const EDITABLE_TYPES = ['.docx', '.html', '.htm', '.md', '.txt']
const READONLY_TYPES = ['.pdf', '.ppt', '.pptx']

export function ImportModal({ onClose, onSuccess, workspaceId, folderId }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const validateFile = (f: File): string | null => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_TYPES.includes(ext)) {
      return `Unsupported file type. Allowed: ${ALLOWED_TYPES.join(', ')}`
    }
    const maxSize = 50 * 1024 * 1024 // 50 MB
    if (f.size > maxSize) return 'File must be under 50 MB'
    return null
  }

  const handleFile = (f: File) => {
    const err = validateFile(f)
    if (err) { setError(err); return }
    setError('')
    setFile(f)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const uploadFile = async () => {
    if (!file) return
    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)
    if (workspaceId) formData.append('workspace_id', workspaceId)
    if (folderId) formData.append('folder_id', folderId)

    try {
      const res = await fetch('/api/documents/import', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')

      if (data.htmlContent) {
        sessionStorage.setItem(`import_html_${data.document.id}`, data.htmlContent)
      }

      onSuccess?.()
      onClose()
      router.push(`/document/${data.document.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setUploading(false)
    }
  }

  const ext = file ? '.' + file.name.split('.').pop()?.toLowerCase() : ''
  const isReadOnly = READONLY_TYPES.includes(ext)
  const isEditable = EDITABLE_TYPES.includes(ext)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Import Document</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={ALLOWED_TYPES.join(',')}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {file ? (
              <div className="space-y-2">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl mx-auto flex items-center justify-center">
                  {isReadOnly ? <File className="w-6 h-6 text-slate-400" /> : <FileText className="w-6 h-6 text-indigo-500" />}
                </div>
                <p className="font-medium text-slate-800 text-sm">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="text-xs text-slate-400 hover:text-red-500 underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 bg-slate-100 rounded-xl mx-auto flex items-center justify-center">
                  <Upload className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Drop your file here</p>
                  <p className="text-xs text-slate-400 mt-1">or click to browse</p>
                </div>
                <p className="text-xs text-slate-400">DOCX, PDF, PPT, HTML, MD, TXT — up to 50 MB</p>
              </div>
            )}
          </div>

          {/* File type info */}
          {file && (
            <div className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm ${
              isReadOnly ? 'bg-amber-50 border border-amber-100' : 'bg-green-50 border border-green-100'
            }`}>
              <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${isReadOnly ? 'text-amber-500' : 'text-green-500'}`} />
              <div>
                {isReadOnly ? (
                  <p className="text-amber-700 font-medium text-xs">View-only import</p>
                ) : (
                  <p className="text-green-700 font-medium text-xs">Editable import</p>
                )}
                <p className={`text-xs mt-0.5 ${isReadOnly ? 'text-amber-600' : 'text-green-600'}`}>
                  {isReadOnly
                    ? 'PDF and PPT files are stored as-is and cannot be edited. You can view, share, and copy the link.'
                    : 'This file will be converted to an editable document. You can edit it in the DocHub editor.'}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={uploadFile}
              disabled={!file || uploading}
              className="flex-1 py-2.5 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition font-medium flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
