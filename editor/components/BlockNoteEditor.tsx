'use client'

import { useCreateBlockNote, SuggestionMenuController } from "@blocknote/react"
import { BlockNoteView } from "@blocknote/mantine"
import "@blocknote/mantine/style.css"
import { useBlockNoteAutosave } from "../hooks/useBlockNoteAutosave"
import { getCustomSlashMenuItems } from "../blocks/CustomSlashMenuItems"
import { useEffect } from "react"

interface BlockNoteEditorProps {
  documentId: string
  initialTitle: string
  initialContent: any
  onSaveStatusChange: (status: string) => void
}

export function BlockNoteEditor({ documentId, initialTitle, initialContent, onSaveStatusChange }: BlockNoteEditorProps) {
  const { title, setTitle, setContent, saveStatus } = useBlockNoteAutosave(documentId, initialTitle)

  // 1. INITIALIZE EDITOR WITH CONTENT FROM DB
  const editor = useCreateBlockNote({
    initialContent: initialContent && initialContent.length > 0 ? initialContent : undefined,
  })

  // 2. BUBBLE SAVE STATUS
  useEffect(() => {
    onSaveStatusChange(saveStatus)
  }, [saveStatus, onSaveStatusChange])

  return (
    <div className="max-w-4xl mx-auto py-12 px-12 h-full flex flex-col relative">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled Document"
        className="text-4xl font-bold text-slate-900 placeholder:text-slate-300 border-none outline-none mb-8 px-[50px] bg-transparent focus:ring-0"
      />

      <div className="flex-1 cursor-text">
        <BlockNoteView 
          editor={editor} 
          theme="light" 
          onChange={() => setContent(editor.document)}
          slashMenu={false}
        >
          <SuggestionMenuController
            triggerCharacter={"/"}
            getItems={async (query) => 
              getCustomSlashMenuItems(editor).filter((item) => 
                item.title.toLowerCase().startsWith(query.toLowerCase()) || 
                item.aliases?.some(alias => alias.toLowerCase().startsWith(query.toLowerCase()))
              )
            }
          />
        </BlockNoteView>
      </div>
    </div>
  )
}