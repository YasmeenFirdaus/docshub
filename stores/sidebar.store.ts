import { create } from 'zustand'

interface SidebarState {
  expandedWorkspaces: Set<string>;
  expandedFolders: Set<string>;
  toggleWorkspace: (id: string) => void;
  toggleFolder: (id: string) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  expandedWorkspaces: new Set(),
  expandedFolders: new Set(),
  
  toggleWorkspace: (id) => set((state) => {
    const next = new Set(state.expandedWorkspaces)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return { expandedWorkspaces: next }
  }),
  
  toggleFolder: (id) => set((state) => {
    const next = new Set(state.expandedFolders)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return { expandedFolders: next }
  })
}))