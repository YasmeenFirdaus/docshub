'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, Sparkles, Send, FileText, Wand2, Tags, MapPin,
  GitCompareArrows, Paperclip, Plus, Loader2,
} from 'lucide-react'
import { useAIStore, type WorkspaceSummary } from '@/stores/ai.store'
import { DocumentPickerDropdown, type DocOption } from './DocumentPicker'

type AIMessage = { role: 'user' | 'assistant'; content: string }

// Which quick-action chips appear below the input
const QUICK_ACTIONS = [
  { id: 'summarize',   label: 'Summarize',    icon: <Wand2 className="h-3.5 w-3.5" />,           needsDoc: true,  needsTwo: false, prompt: 'Please summarize this document.' },
  { id: 'compare',    label: 'Compare',      icon: <GitCompareArrows className="h-3.5 w-3.5" />, needsDoc: false, needsTwo: true,  prompt: 'Compare these two documents and highlight the key differences.' },
  { id: 'tags',       label: 'Suggest tags', icon: <Tags className="h-3.5 w-3.5" />,             needsDoc: true,  needsTwo: false, prompt: 'Suggest relevant tags for this document.' },
  { id: 'location',   label: 'Location',     icon: <MapPin className="h-3.5 w-3.5" />,           needsDoc: true,  needsTwo: false, prompt: 'Suggest the best workspace and folder location for this document.' },
  { id: 'draft',      label: 'Draft',        icon: <Plus className="h-3.5 w-3.5" />,             needsDoc: false, needsTwo: false, prompt: 'Draft a new document on the following topic: ' },
] as const

type QuickActionId = typeof QUICK_ACTIONS[number]['id']

async function fetchDocWithContent(id: string): Promise<DocOption | null> {
  try {
    const res = await fetch(`/api/documents/${id}`)
    if (!res.ok) return null
    const d = await res.json()
    return {
      id: d.id,
      title: d.title || 'Untitled',
      breadcrumb: [d.workspace?.name, d.folder?.name].filter(Boolean).join(' / '),
      content: d.content,
    }
  } catch {
    return null
  }
}

export function AICopilotPanel() {
  const router = useRouter()
  const open = useAIStore((s) => s.workspaceOpen)
  const close = useAIStore((s) => s.closeWorkspacePanel)

  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('')
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [loading, setLoading] = useState(false)

  // Attached documents: docA is the primary, docB is for compare
  const [docA, setDocA] = useState<DocOption | null>(null)
  const [docB, setDocB] = useState<DocOption | null>(null)
  const [pickerOpen, setPickerOpen] = useState<'a' | 'b' | null>(null)
  const [fetchingDoc, setFetchingDoc] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load workspaces when panel opens
  useEffect(() => {
    if (!open) return
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((data) => {
        const rows = Array.isArray(data) ? data : data?.workspaces ?? []
        const normalized: WorkspaceSummary[] = rows
          .map((w: any) => ({ id: String(w.id ?? ''), name: String(w.name ?? 'Workspace') }))
          .filter((w: WorkspaceSummary) => w.id)
        setWorkspaces(normalized)
        setSelectedWorkspaceId((prev) => prev || normalized[0]?.id || '')
      })
      .catch(() => setWorkspaces([]))
  }, [open])

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!open) return null

  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId)

  const handleQuickAction = (qa: typeof QUICK_ACTIONS[number]) => {
    setPrompt(qa.prompt)
    textareaRef.current?.focus()
    // If it needs a doc and none attached yet, open picker
    if ((qa.needsDoc || qa.needsTwo) && !docA) setPickerOpen('a')
    if (qa.needsTwo && docA && !docB) setPickerOpen('b')
  }

  const handlePickDoc = async (slot: 'a' | 'b', basic: DocOption) => {
    setFetchingDoc(true)
    const full = await fetchDocWithContent(basic.id)
    if (slot === 'a') setDocA(full ?? basic)
    else setDocB(full ?? basic)
    setFetchingDoc(false)
  }

  const send = async () => {
    const text = prompt.trim()
    if (!text || loading) return

    // Build display message — include doc chip labels
    const docLabel = docA ? ` [${docA.title}]` : ''
    const docBLabel = docB ? ` vs [${docB.title}]` : ''
    const displayMsg = text + docLabel + docBLabel

    setMessages((prev) => [...prev, { role: 'user', content: displayMsg }])
    setPrompt('')
    
    const currentDocA = docA
    const currentDocB = docB
    setDocA(null)
    setDocB(null)
    
    setLoading(true)

    try {
      let answer = ''

      if (currentDocA && currentDocB) {
        // Compare
        const res = await fetch('/api/ai/workspace/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: text,
            doc_a: { title: currentDocA.title, content: currentDocA.content },
            doc_b: { title: currentDocB.title, content: currentDocB.content },
          }),
        })
        const data = await res.json()
        answer = data.comparison ?? data.answer ?? JSON.stringify(data)

      } else if (currentDocA) {
        // Single-doc: route to the right document endpoint
        let endpoint = '/api/ai/document/ask'
        if (text.toLowerCase().includes('summarize') || text.toLowerCase().includes('summary')) {
          endpoint = '/api/ai/document/summarize'
        } else if (text.toLowerCase().includes('tag')) {
          endpoint = '/api/ai/document/suggest-tags'
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: currentDocA.id,
            title: currentDocA.title,
            content: currentDocA.content,
            query: text,
          }),
        })
        const data = await res.json()
        if (Array.isArray(data.tags)) {
          answer = `Suggested tags: ${data.tags.join(', ')}`
        } else {
          answer = data.answer ?? data.summary ?? JSON.stringify(data)
        }

      } else {
        // Workspace-level query — no document context
        const res = await fetch('/api/ai/workspace/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: text,
            workspaceIds: selectedWorkspaceId ? [selectedWorkspaceId] : workspaces.map((w) => w.id),
          }),
        })
        const data = await res.json()
        answer = data.answer ?? data.summary ?? JSON.stringify(data)
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: answer }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ AI request failed. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <button type="button" aria-label="Close" onClick={close}
        className="absolute inset-0 bg-[#1E293B]/16 backdrop-blur-[1px]" />

      <aside className="arctic-glass absolute right-0 top-0 flex h-full w-full max-w-[480px] flex-col border-l border-[#E7ECEA]/80 shadow-2xl animate-doc-slide-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="arctic-primary w-7 h-7 rounded-lg flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">AI Co-Pilot</p>
              <p className="text-xs text-slate-400">
                {selectedWorkspace ? selectedWorkspace.name : 'Workspace assistant'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {workspaces.length > 1 && (
              <select
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 outline-none focus:border-[#256D85] bg-white"
              >
                {workspaces.map((ws) => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
              </select>
            )}
            <button type="button" onClick={close}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-[#78C6C9]/12 flex items-center justify-center mb-3">
                <Sparkles className="h-6 w-6 text-[#256D85]" />
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">Ask me anything</p>
              <p className="text-xs text-slate-400 max-w-[240px]">
                Attach a document with 📎, or pick a quick action below
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="arctic-primary w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 mr-2">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'arctic-primary rounded-tr-sm'
                  : 'bg-slate-50 border border-slate-200 text-slate-700 rounded-tl-sm'
              }`}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="arctic-primary w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 mr-2">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-sm px-3.5 py-2">
                <Loader2 className="h-4 w-4 text-[#256D85] animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-slate-100 px-4 py-3 shrink-0">

          {/* Attached doc chips */}
          {(docA || docB || fetchingDoc) && (
            <div className="flex flex-wrap gap-2 mb-2">
              {fetchingDoc && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                </span>
              )}
              {docA && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#78C6C9]/12 border border-[#78C6C9]/45 px-3 py-1 text-xs text-[#256D85] max-w-[200px]">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{docA.title}</span>
                  <button type="button" onClick={() => setDocA(null)} className="hover:text-[#1f5c70] shrink-0">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {docB && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs text-violet-700 max-w-[200px]">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{docB.title}</span>
                  <button type="button" onClick={() => setDocB(null)} className="hover:text-violet-900 shrink-0">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Document picker dropdown */}
          <div className="relative">
            <DocumentPickerDropdown
              open={pickerOpen === 'a'}
              onClose={() => setPickerOpen(null)}
              onSelect={(doc) => handlePickDoc('a', doc)}
              excludeIds={[docB?.id].filter(Boolean) as string[]}
            />
            <DocumentPickerDropdown
              open={pickerOpen === 'b'}
              onClose={() => setPickerOpen(null)}
              onSelect={(doc) => handlePickDoc('b', doc)}
              excludeIds={[docA?.id].filter(Boolean) as string[]}
            />

            {/* Textarea */}
            <div className="premium-control flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-1.5">
              <button
                type="button"
                onClick={() => setPickerOpen(pickerOpen ? null : 'a')}
                title="Attach document"
                className={`shrink-0 p-1 rounded-lg transition ${pickerOpen ? 'text-[#256D85] bg-[#78C6C9]/12' : 'text-slate-400 hover:text-[#256D85] hover:bg-slate-100'}`}
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything… (⌘↵ to send)"
                rows={1}
                className="flex-1 text-sm outline-none bg-transparent resize-none placeholder:text-slate-400 max-h-36 leading-5"
                style={{ height: 'auto', minHeight: '20px' }}
                onInput={(e) => {
                  const t = e.currentTarget
                  t.style.height = 'auto'
                  t.style.height = `${Math.min(t.scrollHeight, 144)}px`
                }}
              />
              <button type="button" onClick={send} disabled={loading || !prompt.trim()}
                className="arctic-primary shrink-0 flex items-center justify-center w-7 h-7 rounded-[10px] disabled:opacity-40 disabled:cursor-not-allowed transition">
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Quick action chips */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((qa) => (
              <button key={qa.id} type="button"
                onClick={() => handleQuickAction(qa)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-[#78C6C9]/14 hover:border-[#78C6C9]/45 hover:text-[#256D85] transition">
                {qa.icon}
                {qa.label}
              </button>
            ))}
            {docA && (
              <button type="button"
                onClick={() => setPickerOpen('b')}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-violet-300 bg-violet-50 px-2.5 py-1 text-xs text-violet-600 hover:bg-violet-100 transition">
                <Plus className="h-3.5 w-3.5" />
                Add 2nd doc
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
