'use client'

import { useEffect, useRef, useState } from "react"
import { Sparkles } from "lucide-react"
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react"
import { BlockNoteView } from "@blocknote/mantine"
import { BlockNoteSchema, defaultBlockSpecs, filterSuggestionItems } from "@blocknote/core"
import "@blocknote/mantine/style.css"

import { useBlockNoteAutosave } from "../hooks/useBlockNoteAutosave"
import { CalloutBlock } from "../blocks/CalloutBlock"
import { EmbedBlock } from "../blocks/EmbedBlock"
import { MermaidBlock } from "../blocks/MermaidBlock"
import { AttachmentBlock } from "../blocks/AttachmentBlock"
import { getCustomSlashMenuItems } from "../blocks/CustomSlashMenuItems"
import { getMentionMenuItems } from "../blocks/MentionMenuItems"
import { InlineAIMenu } from "@/components/ai/InlineAIMenu"
import { useAIStore } from "@/stores/ai.store"

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    callout: CalloutBlock,
    embed: EmbedBlock,
    mermaid: MermaidBlock,
    attachment: AttachmentBlock,
  },
});

interface BlockNoteEditorProps {
  documentId: string
  initialTitle: string
  initialContent: any
  onSaveStatusChange: (status: string) => void
}

export function BlockNoteEditor({ documentId, initialTitle, initialContent, onSaveStatusChange }: BlockNoteEditorProps) {
  const { title, setTitle, setContent, saveStatus } = useBlockNoteAutosave(documentId, initialTitle)

  const setInlineSelection = useAIStore((s) => s.setInlineSelection)
  const openDocumentPanel = useAIStore((s) => s.openDocumentPanel)
  const containerRef = useRef<HTMLDivElement>(null)

  const [selection, setSelection] = useState<{
    text: string
    x: number
    y: number
    documentId: string
    onApply?: (nextText: string) => void
  } | null>(null)

  // 1. INITIALIZE EDITOR WITH CONTENT FROM DB
  const editor = useCreateBlockNote({
    schema,
    initialContent: initialContent && initialContent.length > 0 ? initialContent : undefined,
  })

  // 2. BUBBLE SAVE STATUS
  useEffect(() => {
    onSaveStatusChange(saveStatus)
  }, [saveStatus, onSaveStatusChange])

  // 3. HANDLE HTML IMPORT
  useEffect(() => {
    const importHtml = sessionStorage.getItem(`import_html_${documentId}`)
    if (importHtml) {
      editor.tryParseHTMLToBlocks(importHtml).then((blocks) => {
        editor.replaceBlocks(editor.document, blocks)
        setContent(editor.document)
        sessionStorage.removeItem(`import_html_${documentId}`)
      })
    }
  }, [editor, documentId, setContent])

  // 4. INLINE AI SELECTION LISTENER
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setSelection(null)
        setInlineSelection(null)
        return
      }

      const text = sel.toString().trim()
      if (!text) {
        setSelection(null)
        setInlineSelection(null)
        return
      }

      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      if (!containerRef.current?.contains(range.commonAncestorContainer)) {
        setSelection(null)
        setInlineSelection(null)
        return
      }

      const next = {
        text,
        x: Math.min(rect.left + rect.width / 2, window.innerWidth - 220),
        y: Math.max(rect.top - 16, 20),
        documentId,
        onApply: (nextText: string) => {
          // ponytail: execCommand is deprecated but still works in all major browsers for contenteditable; upgrade path is BlockNote's internal insertText API
          document.execCommand('insertText', false, nextText)
        },
      }

      setSelection(next)
      setInlineSelection(next)
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [documentId, setInlineSelection])

  return (
    <div className="max-w-4xl mx-auto py-12 px-12 h-full flex flex-col relative w-full">
      {/* Title + Ask AI bar */}
      <div className="flex items-start justify-between gap-4 mb-8 px-[50px]">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled Document"
          className="text-4xl font-bold text-slate-900 placeholder:text-slate-300 border-none outline-none bg-transparent focus:ring-0 w-full"
        />
        <button
          type="button"
          onClick={() =>
            openDocumentPanel({
              id: documentId,
              title,
              content: editor.document,
            })
          }
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition"
        >
          <Sparkles className="w-4 h-4" />
          Ask AI
        </button>
      </div>

      <div ref={containerRef} className="flex-1 cursor-text relative">
        <BlockNoteView
          editor={editor}
          theme="light"
          onChange={() => setContent(editor.document)}
          slashMenu={false}
        >
          <SuggestionMenuController
            triggerCharacter={"/"}
            getItems={async (query) =>
              filterSuggestionItems(
                [
                  ...getDefaultReactSlashMenuItems(editor as any),
                  ...getCustomSlashMenuItems(editor),
                ],
                query
              )
            }
          />
          <SuggestionMenuController
            triggerCharacter={"@"}
            getItems={async (query) => getMentionMenuItems(query, editor)}
          />
        </BlockNoteView>

        <InlineAIMenu
          selection={selection}
          onClose={() => {
            setSelection(null)
            setInlineSelection(null)
          }}
        />
      </div>
    </div>
  )
}