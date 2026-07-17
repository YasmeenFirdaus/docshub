'use client'

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { 
  Layers, Share2, Star, Clock, Trash2, Plus, 
  ChevronRight, ChevronDown, Folder, Settings, MoreHorizontal, Edit2, Trash, FolderPlus
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useSidebarStore } from "@/stores/sidebar.store"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  
  const { activeWorkspaceId, setActiveWorkspace } = useSidebarStore()
  const [tenant, setTenant] = useState<{ name: string } | null>(null)
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const fetchWorkspaces = async () => {
    const res = await fetch('/api/workspaces')
    if (res.ok) {
      const data = await res.json()
      setWorkspaces(data)
    }
  }

  useEffect(() => {
    fetchWorkspaces()
  }, [])

  const navItems = [
    { name: "All Docs", icon: Layers, href: "/all-docs" },
    { name: "Shared with me", icon: Share2, href: "/shared-with-me" },
    { name: "Favorites", icon: Star, href: "/favorites" },
    { name: "Recent", icon: Clock, href: "/recent" },
    { name: "Trash", icon: Trash2, href: "/trash" },
  ]

  // --- Workspace Actions ---
  const handleAddWorkspace = async () => {
    const name = window.prompt("Enter new workspace name:")
    if (!name) return

    await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: '' })
    })
    fetchWorkspaces()
  }

  const handleRenameWorkspace = async (id: string, currentName: string) => {
    setActiveMenu(null)
    const newName = window.prompt("Enter new workspace name:", currentName)
    if (!newName || newName === currentName) return

    await fetch(`/api/workspaces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    })
    fetchWorkspaces()
  }

  const handleDeleteWorkspace = async (id: string) => {
    setActiveMenu(null)
    if (!window.confirm("Are you sure you want to permanently delete this workspace and all its contents?")) return

    await fetch(`/api/workspaces/${id}`, { method: 'DELETE' })
    fetchWorkspaces()
  }

  // --- Folder Actions ---
  const handleAddFolder = async (workspaceId: string, parentId: string | null = null) => {
    setActiveMenu(null)
    const name = window.prompt("Enter new folder name:")
    if (!name) return

    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Now sending parent_id to support nested folders
      body: JSON.stringify({ name, workspace_id: workspaceId, parent_id: parentId })
    })
    
    fetchWorkspaces()
    
    // Auto-expand the parent folder/workspace so the user sees their new creation
    if (parentId) {
      setExpandedFolders(prev => new Set(prev).add(parentId))
    } else if (!expandedWorkspaces.has(workspaceId)) {
      toggleWorkspace(workspaceId)
    }
  }

  const handleRenameFolder = async (folderId: string, currentName: string) => {
    setActiveMenu(null)
    const newName = window.prompt("Enter new folder name:", currentName)
    if (!newName || newName === currentName) return

    await fetch(`/api/folders/${folderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    })
    fetchWorkspaces()
  }

  const handleDeleteFolder = async (folderId: string) => {
    setActiveMenu(null)
    if (!window.confirm("Are you sure you want to delete this folder? All nested items will be lost.")) return

    await fetch(`/api/folders/${folderId}`, { method: 'DELETE' })
    fetchWorkspaces()
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  // --- Recursive Folder Rendering Engine ---
  const renderFolderTree = (folders: any[], workspaceId: string, parentId: string | null = null, depth: number = 0) => {
    // Filter to only get the folders belonging to the current level
    const currentLevelFolders = folders.filter(f => f.parent_id === parentId)

    return currentLevelFolders.map((folder) => {
      const hasChildren = folders.some(f => f.parent_id === folder.id)
      const isExpanded = expandedFolders.has(folder.id)

      return (
        <div key={folder.id}>
          {/* Folder Row */}
          <div 
            className="flex items-center py-1.5 hover:bg-slate-100 rounded-md cursor-pointer text-slate-600 group relative pr-2"
            // Dynamically add padding based on how deep the folder is nested
            style={{ paddingLeft: `${(depth * 16) + 24}px` }}
            onClick={() => toggleFolder(folder.id)}
          >
            {/* Expand/Collapse Chevron (only shows if there are subfolders) */}
            <div className="w-4 h-4 mr-1 flex items-center justify-center text-slate-400 hover:text-slate-600">
              {hasChildren ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
            </div>

            <Folder size={16} className="mr-2 text-slate-400 shrink-0" />
            <span className="text-sm flex-1 truncate">{folder.name}</span>
            
            {/* Folder Context Menu Trigger */}
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === folder.id ? null : folder.id) }}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 p-1 rounded transition-opacity"
            >
              <MoreHorizontal size={14} />
            </button>

            {/* Folder Context Menu Dropdown */}
            {activeMenu === folder.id && (
              <div className="absolute right-2 top-8 w-40 bg-white border border-slate-200 shadow-lg rounded-md py-1 z-50">
                <button onClick={(e) => { e.stopPropagation(); handleAddFolder(workspaceId, folder.id) }} className="w-full flex items-center px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                  <FolderPlus size={14} className="mr-2" /> Add Subfolder
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleRenameFolder(folder.id, folder.name) }} className="w-full flex items-center px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 border-t border-slate-100">
                  <Edit2 size={14} className="mr-2" /> Rename
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id) }} className="w-full flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                  <Trash size={14} className="mr-2" /> Delete
                </button>
              </div>
            )}
          </div>

          {/* Render Nested Children recursively */}
          {isExpanded && hasChildren && (
            <div>
              {renderFolderTree(folders, workspaceId, folder.id, depth + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <div className="w-[280px] h-full bg-[#FAFBFC] border-r border-slate-200 flex flex-col" onClick={() => setActiveMenu(null)}>
      {/* Header */}
      <div className="h-14 flex items-center px-4 mb-4">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold mr-3">
          <Layers size={18} />
        </div>
        <span className="font-semibold text-slate-800 tracking-tight">Enterprise DMS</span>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link key={item.name} href={item.href} className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
              <Icon size={18} className={`mr-3 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
              {item.name}
            </Link>
          )
        })}

        {/* Workspaces Section */}
        <div className="pt-6 pb-2">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Workspaces</span>
            {session?.user?.role === 'ADMIN' && (
              <button onClick={handleAddWorkspace} className="text-slate-400 hover:text-slate-600 transition-colors">
                <Plus size={16} />
              </button>
            )}
          </div>

          {/* Dynamic Workspace Rendering */}
          <div className="space-y-1 relative">
            {workspaces.map(workspace => (
              <div key={workspace.id} className="mb-1">
                {/* Workspace Row */}
                <div className="flex items-center px-2 py-1.5 hover:bg-slate-100 rounded-md cursor-pointer group">
                  <button onClick={() => toggleWorkspace(workspace.id)} className="text-slate-400 mr-1 hover:text-slate-600">
                    {expandedWorkspaces.has(workspace.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="w-5 h-5 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium mr-2">
                    {workspace.icon}
                  </div>
                  <span className="text-sm font-medium text-slate-700 flex-1 truncate">{workspace.name}</span>
                  
                  {session?.user?.role === 'ADMIN' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === workspace.id ? null : workspace.id) }}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 p-1 rounded transition-opacity"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  )}
                </div>

                {/* Workspace Context Menu */}
                {activeMenu === workspace.id && (
                  <div className="absolute right-2 mt-1 w-40 bg-white border border-slate-200 shadow-lg rounded-md py-1 z-50">
                    <button onClick={() => handleAddFolder(workspace.id)} className="w-full flex items-center px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                      <FolderPlus size={14} className="mr-2" /> Add Folder
                    </button>
                    <button onClick={() => handleRenameWorkspace(workspace.id, workspace.name)} className="w-full flex items-center px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 border-t border-slate-100">
                      <Edit2 size={14} className="mr-2" /> Rename
                    </button>
                    <button onClick={() => handleDeleteWorkspace(workspace.id)} className="w-full flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                      <Trash size={14} className="mr-2" /> Delete
                    </button>
                  </div>
                )}

                {/* Top Level Folders Injection */}
                {expandedWorkspaces.has(workspace.id) && workspace.folders && (
                  <div className="mt-1">
                    {/* Calling our recursive render engine starting at depth 0 with null parentId */}
                    {renderFolderTree(workspace.folders, workspace.id, null, 0)}
                    
                    {workspace.folders.length === 0 && (
                      <div className="px-9 py-1 text-xs text-slate-400 italic">No folders yet</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add Workspace Button */}
        {session?.user?.role === 'ADMIN' && (
          <button onClick={handleAddWorkspace} className="flex items-center px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 w-full mt-2">
            <Plus size={16} className="mr-2" /> Add workspace
          </button>
        )}
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-slate-200 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
            {session?.user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">{session?.user?.name}</span>
            <span className="text-xs text-slate-500">{session?.user?.role}</span>
          </div>
        </div>
        <Link href="/settings/members">
          <Settings size={18} className="text-slate-400 hover:text-indigo-600 transition-colors" />
        </Link>
      </div>
    </div>
  )
}