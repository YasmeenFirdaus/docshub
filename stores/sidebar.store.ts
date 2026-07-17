import { create } from "zustand"

interface SidebarState {

  activeWorkspaceId: string | null

  expandedFolders: Set<string>

  setActiveWorkspace: (id: string) => void

  toggleFolder: (id: string) => void
}

export const useSidebarStore =
create<SidebarState>((set) => ({

  activeWorkspaceId: null,

  expandedFolders: new Set(),

  setActiveWorkspace: (id) =>
    set({
      activeWorkspaceId: id,
    }),

  toggleFolder: (id) =>
    set((state) => {

      const folders =
        new Set(state.expandedFolders)

      if (folders.has(id))

        folders.delete(id)

      else

        folders.add(id)

      return {

        expandedFolders: folders,
      }
    }),
}))