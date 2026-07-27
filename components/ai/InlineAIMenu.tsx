'use client'

import { useState, useRef, useLayoutEffect } from 'react'
import { Check, Copy, Sparkles, X } from 'lucide-react'
import { InlineSelection } from '@/stores/ai.store'

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
  const [positionBelow, setPositionBelow] = useState(false)
  const [adjustedLeft, setAdjustedLeft] = useState(selection?.x ?? 0)
  const menuRef = useRef<HTMLDivElement>(null)

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
    const headerHeight = 80 // Header safety margin
    const goesIntoHeader = (selection.y - menuHeight) < headerHeight
    const fitsBelow = (selection.y + 24 + menuHeight) < window.innerHeight

    if (goesIntoHeader && fitsBelow) {
      setPositionBelow(true)
    } else {
      setPositionBelow(false)
    }
  }, [selection, result, loading])

  const reject = () => {
    setResult('')
  }

  if (!selection) return null

  const run = async (action: string) => {
    if (loading) return

    setLoading(true)
    setResult('')

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
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-[80] w-[340px] rounded-2xl border border-slate-200 bg-white shadow-2xl"
      style={{
        left: adjustedLeft,
        top: positionBelow ? selection.y + 24 : selection.y - 12,
        transform: positionBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'
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

      {result && (
        <div className="border-t border-slate-200 p-3">
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
            {result}
          </div>

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
              <Copy className="h-3.5 w-3.5" />
              Copy
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
