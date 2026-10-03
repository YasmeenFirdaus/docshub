'use client'

import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { Check, Copy, Sparkles, X } from 'lucide-react'
import { InlineSelection } from '@/stores/ai.store'
import { markdownToHtml } from '@/lib/markdown'

type Props = {
  selection: InlineSelection | null
  onClose: () => void
}

const ACTIONS = [
  { id: 'fix-grammar', label: 'Fix grammar' },
  { id: 'make-professional', label: 'Make professional' },
  { id: 'shorten', label: 'Shorten' },
  { id: 'expand', label: 'Expand' },
  { id: 'simplify', label: 'Simplify' },
] as const

export function InlineAIMenu({ selection, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [adjustedTop, setAdjustedTop] = useState(selection?.y ?? 0)
  const [adjustedLeft, setAdjustedLeft] = useState(selection?.x ?? 0)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setResult('')
    setCopied(false)
    setLoading(false)
  }, [selection])

  useLayoutEffect(() => {
    if (!menuRef.current || !selection) return

    const menuWidth = 340
    const margin = 16
    let left = selection.x

    if (left - menuWidth / 2 < margin) {
      left = menuWidth / 2 + margin
    }
    if (left + menuWidth / 2 > window.innerWidth - margin) {
      left = window.innerWidth - menuWidth / 2 - margin
    }
    setAdjustedLeft(left)

    const menuHeight = menuRef.current.offsetHeight
    let topY = selection.y - menuHeight - 12
    if (topY < 80) {
      topY = selection.y + 24
    }

    const minTop = 80
    const maxTop = Math.max(minTop, window.innerHeight - menuHeight - 16)
    if (topY < minTop) topY = minTop
    if (topY > maxTop) topY = maxTop

    setAdjustedTop(topY)
  }, [selection, result, loading])

  const reject = () => {
    setResult('')
    setCopied(false)
  }

  if (!selection) return null

  const run = async (action: string) => {
    if (loading) return

    setLoading(true)
    setResult('')
    setCopied(false)

    try {
      const res = await fetch('/api/ai/editor/inline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          selectedText: selection.text,
          documentId: selection.documentId,
          documentContext: '',
        }),
      })

      const data = await res.json()
      setResult(data.replacement ?? data.result ?? data.answer ?? '')
    } finally {
      setLoading(false)
    }
  }

  const apply = () => {
    if (!result || !selection.onApply) return
    selection.onApply(result)
    onClose()
  }

  const copy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const showActions = !loading && !result

  return (
    <div
      ref={menuRef}
      className="fixed z-[80] w-[340px] rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[85vh] overflow-y-auto"
      style={{
        left: adjustedLeft,
        top: adjustedTop,
        transform: 'translate(-50%, 0)',
      }}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Sparkles className="h-3.5 w-3.5 text-[#256D85]" />
          Ask AI
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {showActions && (
        <div className="grid grid-cols-2 gap-2 p-3">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => run(action.id)}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-6 gap-2 text-xs text-slate-500 font-medium">
          <span className="w-5 h-5 border-2 border-[#256D85]/30 border-t-[#256D85] rounded-full animate-spin" />
          Thinking...
        </div>
      )}

      {result && (
        <div className="border-t border-slate-200 p-3">
          <div
            className="max-h-[260px] overflow-y-auto rounded-xl bg-slate-50 p-3 text-sm text-slate-700"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(result) }}
          />

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={apply}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#256D85] px-3 py-2 text-xs font-medium text-white hover:bg-[#1f5c70]"
            >
              <Check className="h-3.5 w-3.5" />
              Apply
            </button>

            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </button>

            <button
              type="button"
              onClick={reject}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="w-full border-t border-slate-200 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
      >
        Close
      </button>
    </div>
  )
}
