'use client'

import { useEffect, useRef, useState } from "react"
import { Sparkles, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { 
  useCreateBlockNote, 
  SuggestionMenuController, 
  getDefaultReactSlashMenuItems,
  FormattingToolbarController,
  FormattingToolbar,
  BasicTextStyleButton,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  FileCaptionButton,
  FileReplaceButton,
  NestBlockButton,
  TextAlignButton,
  UnnestBlockButton
} from "@blocknote/react"
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
  const { title, setTitle, setContent, saveStatus, permissionError, setPermissionError } = useBlockNoteAutosave(documentId, initialTitle)

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
    uploadFile: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      return url;
    },
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

  // 4. WE REMOVED THE AUTO-LISTENER. INLINE AI IS NOW TRIGGERED BY TOOLBAR BUTTON.

  return (
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-4 py-8 sm:px-12 lg:px-16 relative">
      {/* Title */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm pt-4 pb-4 mb-2 flex flex-col gap-2 px-12">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full border-none bg-transparent text-[42px] font-bold leading-tight tracking-tight text-slate-900 outline-none placeholder:text-slate-300 focus:ring-0 px-0"
        />
      </div>

      <div ref={containerRef} className="flex-1 cursor-text relative pb-12">
        <BlockNoteView
          editor={editor}
          theme="light"
          onChange={() => setContent(editor.document)}
          slashMenu={false}
          formattingToolbar={false}
        >
          {!selection && (
            <FormattingToolbarController
              formattingToolbar={() => (
                <FormattingToolbar>
                  <BlockTypeSelect key={"blockTypeSelect"} />
                  <BasicTextStyleButton basicTextStyle={"bold"} key={"boldStyleButton"} />
                  <BasicTextStyleButton basicTextStyle={"italic"} key={"italicStyleButton"} />
                  <BasicTextStyleButton basicTextStyle={"underline"} key={"underlineStyleButton"} />
                  <BasicTextStyleButton basicTextStyle={"strike"} key={"strikeStyleButton"} />
                  <TextAlignButton textAlignment={"left"} key={"textAlignLeftButton"} />
                  <TextAlignButton textAlignment={"center"} key={"textAlignCenterButton"} />
                  <TextAlignButton textAlignment={"right"} key={"textAlignRightButton"} />
                  
                  <button
                    type="button"
                    onClick={() => {
                      const sel = window.getSelection()
                      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
                      const text = sel.toString().trim()
                      if (!text) return
                      const range = sel.getRangeAt(0)
                      const rect = range.getBoundingClientRect()
                      
                      const next = {
                        text,
                        x: Math.min(rect.left + rect.width / 2, window.innerWidth - 220),
                        y: Math.max(rect.top - 16, 20),
                        documentId,
                        onApply: (nextText: string) => {
                          document.execCommand('insertText', false, nextText)
                        },
                      }
                      
                      setSelection(next)
                      setInlineSelection(next)
                    }}
                    className="mx-1 flex h-7 items-center justify-center gap-1 rounded bg-[#78C6C9]/12 px-2 text-xs font-semibold text-[#256D85] hover:bg-[#78C6C9]/20 transition-colors"
                  >
                    <Sparkles size={14} />
                    Ask AI
                  </button>

                  <CreateLinkButton key={"createLinkButton"} />
                </FormattingToolbar>
              )}
            />
          )}
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

      <Dialog open={permissionError} onOpenChange={setPermissionError}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle size={20} />
              Permission Denied
            </DialogTitle>
            <DialogDescription className="pt-2 text-slate-600">
              You do not have permission to save changes to this document. Any modifications you make will not be saved.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setPermissionError(false)}>Understood</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
