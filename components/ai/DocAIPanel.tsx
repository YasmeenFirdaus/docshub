'use client'

import { useEffect, useRef, useState } from 'react'
import {
  X, Sparkles, Send, FileText, Wand2, Tag, GitCompareArrows,
  PenLine, Plus, Loader2, Check,
} from 'lucide-react'
import { useAIStore } from '@/stores/ai.store'
import { DocumentPickerDropdown, type DocOption } from './DocumentPicker'

type AIMessage = { role: 'user' | 'assistant'; content: string }

const ACTIONS = [
  { id: 'ask',          label: 'Ask',           icon: <FileText className="h-3.5 w-3.5" /> },
  { id: 'summarize',    label: 'Summarize',     icon: <Wand2 className="h-3.5 w-3.5" />,     prompt: 'Please summarize this document.' },
  { id: 'suggest-tags', label: 'Suggest tags',  icon: <Tag className="h-3.5 w-3.5" />,       prompt: 'Suggest relevant tags for this document.' },
  { id: 'suggest-edits',label: 'Suggest edits', icon: <PenLine className="h-3.5 w-3.5" />,   prompt: 'Review this document and suggest improvements.' },
  { id: 'compare',      label: 'Compare',       icon: <GitCompareArrows className="h-3.5 w-3.5" />, prompt: 'Compare this document with another and highlight key differences.' },
] as const

type ActionId = typeof ACTIONS[number]['id']

async function fetchDocWithContent(id: string): Promise<DocOption | null> {
  try {
    const res = await fetch(`/api/documents/${id}`)
    if (!res.ok) return null
    const d = await res.json()
    return { id: d.id, title: d.title || 'Untitled', content: d.content }
  } catch { return null }
}

export function DocAIPanel() {
  const open = useAIStore((s) => s.documentOpen)
  const doc = useAIStore((s) => s.activeDocument)
  const close = useAIStore((s) => s.closeDocumentPanel)

  const [activeAction, setActiveAction] = useState<ActionId>('ask')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [tags, setTags] = useState<string[]>([])

  // Compare: pick a second document
  const [compareDoc, setCompareDoc] = useState<DocOption | null>(null)
  const [comparePickerOpen, setComparePickerOpen] = useState(false)
  const [fetchingCompare, setFetchingCompare] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!open || !doc) return null

  const handleActionChip = (action: typeof ACTIONS[number]) => {
    setActiveAction(action.id)
    if ('prompt' in action) setPrompt(action.prompt)
    textareaRef.current?.focus()
    if (action.id === 'compare' && !compareDoc) setComparePickerOpen(true)
  }

  const handlePickCompareDoc = async (basic: DocOption) => {
    setFetchingCompare(true)
    const full = await fetchDocWithContent(basic.id)
    setCompareDoc(full ?? basic)
    setFetchingCompare(false)
  }

  const send = async () => {
    const text = prompt.trim()
    if (loading || (activeAction === 'compare' && !compareDoc)) return

    const displayMsg = text || activeAction
    setMessages((prev) => [...prev, { role: 'user', content: displayMsg }])
    setPrompt('')
    const currentCompareDoc = compareDoc
    const currentAction = activeAction

    setCompareDoc(null)
    setActiveAction('ask')
    setLoading(true)

    try {
      let answer = ''

      if (currentAction === 'summarize') {
        const res = await fetch('/api/ai/document/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: doc.id, title: doc.title, content: doc.content }),
        })
        const data = await res.json()
        answer = data.summary ?? data.answer ?? JSON.stringify(data)

      } else if (currentAction === 'suggest-tags') {
        const res = await fetch('/api/ai/document/suggest-tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: doc.id, title: doc.title, content: doc.content }),
        })
        const data = await res.json()
        const tagList: string[] = Array.isArray(data.tags) ? data.tags : []
        setTags(tagList)
        answer = tagList.length ? `Suggested ${tagList.length} tags` : 'No tags suggested.'

      } else if (currentAction === 'suggest-edits') {
        const res = await fetch('/api/ai/document/suggest-edits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: doc.id, title: doc.title, content: doc.content, query: text || undefined }),
        })
        const data = await res.json()
        answer = data.answer ?? JSON.stringify(data)

      } else if (currentAction === 'compare' && currentCompareDoc) {
        const res = await fetch('/api/ai/document/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: doc.id,
            title: doc.title,
            content: doc.content,
            query: text || 'Compare these two documents and highlight key differences.',
            compareDoc: { title: currentCompareDoc.title, content: currentCompareDoc.content },
          }),
        })
        const data = await res.json()
        answer = data.answer ?? JSON.stringify(data)

      } else {
        // ask
        const res = await fetch('/api/ai/document/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: doc.id,
            title: doc.title,
            content: doc.content,
            query: text || 'Give me an overview of this document.',
          }),
        })
        const data = await res.json()
        answer = data.answer ?? JSON.stringify(data)
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: answer }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ AI request failed. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send() }
  }

  const canSend = !loading && !(activeAction === 'compare' && !compareDoc)

  return (
    <div className="fixed inset-0 z-[70]">
      <button type="button" onClick={close}
        className="absolute inset-0 bg-[#1E293B]/16 backdrop-blur-[1px]"
        aria-label="Close document AI panel" />

      <aside className="arctic-glass absolute right-0 top-0 h-full w-full max-w-[480px] border-l border-[#E7ECEA]/80 shadow-2xl flex flex-col animate-doc-slide-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="arctic-primary w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Document AI</p>
              <p className="text-xs text-slate-400 truncate max-w-[300px]">{doc.title}</p>
            </div>
          </div>
          <button type="button" onClick={close}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current doc chip */}
        <div className="px-5 py-3 border-b border-slate-100 shrink-0">
          <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider font-medium">Active document</p>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#78C6C9]/12 border border-[#78C6C9]/45 px-3 py-1 text-xs text-[#256D85] max-w-full">
            <FileText className="h-3 w-3 shrink-0" />
            <span className="truncate">{doc.title}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-[#78C6C9]/12 flex items-center justify-center mb-3">
                <Sparkles className="h-6 w-6 text-[#256D85]" />
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">Ask about this document</p>
              <p className="text-xs text-slate-400 max-w-[220px]">
                Use the quick actions below or type your question
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

          {/* Suggested tags card */}
          {tags.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 mb-2">
                <Check className="h-3.5 w-3.5" /> Suggested tags
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 border border-slate-200">{tag}</span>
                ))}
              </div>
            </div>
          )}

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

          {/* Compare doc chip */}
          {(compareDoc || fetchingCompare) && (
            <div className="flex flex-wrap gap-2 mb-2">
              {fetchingCompare && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                </span>
              )}
              {compareDoc && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs text-violet-700 max-w-[220px]">
                  <GitCompareArrows className="h-3 w-3 shrink-0" />
                  <span className="truncate">{compareDoc.title}</span>
                  <button type="button" onClick={() => setCompareDoc(null)} className="hover:text-violet-900 shrink-0">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Compare picker dropdown */}
          <div className="relative">
            <DocumentPickerDropdown
              open={comparePickerOpen}
              onClose={() => setComparePickerOpen(false)}
              onSelect={(doc) => handlePickCompareDoc(doc)}
              excludeIds={[doc.id]}
            />

            <div className="premium-control flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-1.5">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeAction === 'compare' && !compareDoc
                    ? 'Pick a document to compare with ↑'
                    : 'Ask about this document… (⌘↵ to send)'
                }
                rows={1}
                className="flex-1 text-sm outline-none bg-transparent resize-none placeholder:text-slate-400 max-h-32 leading-5"
                style={{ height: 'auto', minHeight: '20px' }}
                onInput={(e) => {
                  const t = e.currentTarget
                  t.style.height = 'auto'
                  t.style.height = `${Math.min(t.scrollHeight, 128)}px`
                }}
              />
              <button type="button" onClick={send} disabled={!canSend}
                className="arctic-primary shrink-0 flex items-center justify-center w-7 h-7 rounded-[10px] disabled:opacity-40 disabled:cursor-not-allowed transition">
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Quick action chips */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ACTIONS.map((a) => (
              <button key={a.id} type="button"
                onClick={() => handleActionChip(a)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                  activeAction === a.id
                    ? 'border-[#78C6C9] bg-[#78C6C9]/12 text-[#256D85]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-[#78C6C9]/14 hover:border-[#78C6C9]/45 hover:text-[#256D85]'
                }`}>
                {a.icon} {a.label}
              </button>
            ))}
            {activeAction === 'compare' && !compareDoc && (
              <button type="button" onClick={() => setComparePickerOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-violet-300 bg-violet-50 px-2.5 py-1 text-xs text-violet-600 hover:bg-violet-100 transition">
                <Plus className="h-3.5 w-3.5" /> Pick doc to compare
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
