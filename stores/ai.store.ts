'use client'

import { create } from 'zustand'

export type WorkspaceSummary = {
  id: string
  name: string
}

export type DocumentSummary = {
  id: string
  title: string
  content: any
  workspace_id?: string | null
  workspace_name?: string | null
}

export type InlineSelection = {
  text: string
  x: number
  y: number
  documentId: string
  onApply?: (nextText: string) => void
}

type AIStore = {
  workspaceOpen: boolean
  documentOpen: boolean
  activeDocument: DocumentSummary | null
  inlineSelection: InlineSelection | null
  openWorkspacePanel: () => void
  closeWorkspacePanel: () => void
  openDocumentPanel: (doc: DocumentSummary) => void
  closeDocumentPanel: () => void
  setInlineSelection: (sel: InlineSelection | null) => void
  clearAllAI: () => void
}

export const useAIStore = create<AIStore>((set) => ({
  workspaceOpen: false,
  documentOpen: false,
  activeDocument: null,
  inlineSelection: null,

  openWorkspacePanel: () => set({ workspaceOpen: true }),
  closeWorkspacePanel: () => set({ workspaceOpen: false }),

  openDocumentPanel: (doc) =>
    set({
      documentOpen: true,
      activeDocument: doc,
    }),

  closeDocumentPanel: () =>
    set({
      documentOpen: false,
      activeDocument: null,
    }),

  setInlineSelection: (sel) => set({ inlineSelection: sel }),

  clearAllAI: () =>
    set({
      workspaceOpen: false,
      documentOpen: false,
      activeDocument: null,
      inlineSelection: null,
    }),
}))
