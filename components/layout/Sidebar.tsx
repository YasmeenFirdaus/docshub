"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Layers,
  Share2,
  Star,
  Clock,
  Trash2,
  ChevronRight,
  ChevronDown,
  Library,
  Folder,
  Settings,
  MoreHorizontal,
  Edit2,
  Trash,
  FolderPlus,
  LogOut,
  SidebarClose,
  SidebarOpen,
  MoreVertical,
  Activity,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useSidebarStore } from "@/stores/sidebar.store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";


type TenantNode = {
  id: string;
  name: string;
  slug: string;
};

type FolderNode = {
  id: string;
  name: string;
  workspace_id: string;
  parent_id: string | null;
  order: number;
};

type WorkspaceNode = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  folders: FolderNode[];
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const { activeWorkspaceId, setActiveWorkspace, expandedFolders, toggleFolder } =
    useSidebarStore();

  const [tenant, setTenant] = useState<TenantNode | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceNode[]>([]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: 'addFolder' | 'renameFolder' | 'deleteFolder' | null;
    folderId?: string;
    workspaceId?: string;
    parentId?: string | null;
    title: string;
    description: string;
    inputValue: string;
    inputPlaceholder?: string;
    confirmLabel: string;
  }>({
    isOpen: false,
    type: null,
    title: '',
    description: '',
    inputValue: '',
    confirmLabel: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWorkspaces = async () => {
    const res = await fetch("/api/workspaces");
    if (!res.ok) return;

    const data = (await res.json()) as {
      tenant?: TenantNode | null;
      workspaces?: WorkspaceNode[];
    };

    const nextWorkspaces = Array.isArray(data.workspaces) ? data.workspaces : [];
    setTenant(data.tenant ?? null);
    setWorkspaces(nextWorkspaces);

    const validActive =
      activeWorkspaceId && nextWorkspaces.some((w) => w.id === activeWorkspaceId)
        ? activeWorkspaceId
        : nextWorkspaces[0]?.id ?? null;

    if (validActive && validActive !== activeWorkspaceId) {
      setActiveWorkspace(validActive);
    }
  };

  useEffect(() => {
    void fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (!pathname.startsWith("/workspace/")) return;

    const workspaceId = pathname.split("/")[2];
    if (workspaceId && workspaceId !== activeWorkspaceId) {
      setActiveWorkspace(workspaceId);
    }
  }, [pathname, activeWorkspaceId, setActiveWorkspace]);

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0] ?? null;

  const navItems = [
    { name: "Dashboard", icon: Activity, href: session?.user?.role === "ADMIN" ? "/admin/dashboard" : "/home" },
    { name: "All Docs", icon: Layers, href: "/all-docs" },
    { name: "Shared with me", icon: Share2, href: "/shared-with-me" },
    { name: "Favorites", icon: Star, href: "/favorites" },
    { name: "Recent", icon: Clock, href: "/recent" },
    { name: "Trash", icon: Trash2, href: "/trash" },
  ];

  const handleAddFolder = async (workspaceId: string, parentId: string | null = null) => {
    setActiveMenu(null);
    setDialogConfig({
      isOpen: true,
      type: 'addFolder',
      workspaceId,
      parentId,
      title: 'Create Folder',
      description: 'Enter a name for the new folder.',
      inputValue: '',
      inputPlaceholder: 'New folder name',
      confirmLabel: 'Create'
    });
  };

  const handleRenameFolder = async (folderId: string, currentName: string) => {
    setActiveMenu(null);
    setDialogConfig({
      isOpen: true,
      type: 'renameFolder',
      folderId,
      title: 'Rename Folder',
      description: 'Enter a new name for the folder.',
      inputValue: currentName,
      inputPlaceholder: 'Folder name',
      confirmLabel: 'Rename'
    });
  };

  const handleDeleteFolder = async (folderId: string) => {
    setActiveMenu(null);
    setDialogConfig({
      isOpen: true,
      type: 'deleteFolder',
      folderId,
      title: 'Delete Folder',
      description: 'Are you sure you want to delete this folder? All nested items will be lost.',
      inputValue: '',
      confirmLabel: 'Delete'
    });
  };

  const handleDialogConfirm = async () => {
    if (isSubmitting) return;
    const { type, folderId, workspaceId, parentId, inputValue } = dialogConfig;

    if (type !== 'deleteFolder' && !inputValue.trim()) return;

    setIsSubmitting(true);
    try {
      if (type === 'addFolder') {
        await fetch("/api/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: inputValue.trim(), workspace_id: workspaceId, parent_id: parentId }),
        });
        await fetchWorkspaces();
        if (parentId && !expandedFolders.has(parentId)) {
          toggleFolder(parentId);
        }
      } else if (type === 'renameFolder') {
        await fetch(`/api/folders/${folderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: inputValue.trim() }),
        });
        await fetchWorkspaces();
      } else if (type === 'deleteFolder') {
        await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
        await fetchWorkspaces();
      }
    } finally {
      setIsSubmitting(false);
      setDialogConfig((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const renderFolderTree = (
    folders: FolderNode[],
    workspaceId: string,
    parentId: string | null = null,
    depth = 0,
  ) => {
    const currentLevelFolders = [...folders]
      .filter((f) => (f.parent_id ?? null) === parentId)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

    return currentLevelFolders.map((folder) => {
      const hasChildren = folders.some((f) => f.parent_id === folder.id);
      const isExpanded = expandedFolders.has(folder.id);

      return (
        <div key={folder.id} className="relative">
          <div
            className="group relative flex cursor-pointer items-center rounded-lg py-1.5 pr-2 text-[#256D85] transition-all hover:bg-[#FAFAF9]/80 hover:text-[#256D85] hover:shadow-sm"
            style={{ paddingLeft: `${depth * 10 + 10}px` }}
          >
            <button
              type="button"
              className="mr-1 flex h-5 w-5 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) toggleFolder(folder.id);
              }}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )
              ) : null}
            </button>

            <button
              type="button"
              className="flex min-w-0 flex-1 items-center text-left"
              onClick={() => router.push(`/workspace/${workspaceId}/folder/${folder.id}`)}
            >
              <Folder size={15} className="mr-2 shrink-0 text-slate-400" />
              <span className="flex-1 truncate text-[13px] font-medium">{folder.name}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === folder.id ? null : folder.id);
              }}
              className="rounded-md p-1 text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
            >
              <MoreHorizontal size={14} />
            </button>

            {activeMenu === folder.id && (
              <div className="premium-card absolute right-2 top-8 z-50 w-44 rounded-xl py-1 animate-doc-fade-up">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddFolder(workspaceId, folder.id);
                  }}
                  className="flex w-full items-center px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <FolderPlus size={14} className="mr-2" /> Add Subfolder
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRenameFolder(folder.id, folder.name);
                  }}
                  className="flex w-full items-center border-t border-slate-100 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <Edit2 size={14} className="mr-2" /> Rename
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.id);
                  }}
                  className="flex w-full items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash size={14} className="mr-2" /> Delete
                </button>
              </div>
            )}
          </div>

          {isExpanded && hasChildren && (
            <div className="animate-doc-fade-up">{renderFolderTree(folders, workspaceId, folder.id, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div
      className={`arctic-glass flex h-full flex-col border-r border-[#E7ECEA]/80 transition-all duration-300 ${
        isCollapsed ? "w-[72px]" : "w-[284px]"
      }`}
      onClick={() => {
        setActiveMenu(null);
      }}
    >
      <div className={`mb-2 flex h-16 items-center px-4 ${!isCollapsed ? "justify-between" : "justify-center"}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center">
              <div className="arctic-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold">
                <Library size={16} />
              </div>
              <span className="ml-3 truncate font-semibold tracking-tight text-[#1E293B]">
                {tenant?.name || "DocHub"}
              </span>
            </div>
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-slate-400 hover:text-[#256D85] transition-colors"
            >
              <SidebarClose size={18} />
            </button>
          </>
        ) : (
          <div className="group cursor-pointer flex items-center justify-center" onClick={() => setIsCollapsed(false)}>
            <div className="arctic-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold transition-all group-hover:hidden">
              <Library size={16} />
            </div>
            <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-slate-500 hover:text-[#256D85] transition-all group-hover:flex">
              <SidebarOpen size={18} />
            </div>
          </div>
        )}
      </div>

      <div className={`flex-1 space-y-1 overflow-y-auto pb-3 ${isCollapsed ? "px-2" : "px-3"}`}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={`flex items-center rounded-lg py-2 transition-all ${
                isCollapsed ? "justify-center px-0" : "px-3"
              } ${
                isActive
                  ? "arctic-primary"
                  : "text-[#256D85] hover:bg-[#FAFAF9]/80 hover:text-[#256D85] hover:shadow-sm"
              }`}
            >
              <Icon size={17} className={`${isCollapsed ? "" : "mr-3"} ${isActive ? "text-white" : "text-[#256D85]/75"}`} />
              {!isCollapsed && <span className="text-sm font-medium">{item.name}</span>}
            </Link>
          );
        })}

        {!isCollapsed && (
          <div className="px-3">
            <div className="mb-2 flex items-center justify-between group px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {activeWorkspace?.name || "Folders"}
              </span>
              <button
                type="button"
                onClick={() => activeWorkspace && handleAddFolder(activeWorkspace.id, null)}
                className="text-slate-400 opacity-0 transition-all hover:text-[#256D85] group-hover:opacity-100"
                aria-label="New folder"
              >
                <FolderPlus size={15} strokeWidth={2.5} />
              </button>
            </div>

            <div className="mt-2 space-y-1">
              {activeWorkspace ? (
                renderFolderTree(activeWorkspace.folders, activeWorkspace.id, null, 0)
              ) : (
                <div className="px-3 py-2 text-xs italic text-slate-400">
                  No space assigned yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>



      <div className={`flex items-center justify-between border-t border-[#E7ECEA]/50 p-4 bg-white/20 backdrop-blur-md ${isCollapsed ? "flex-col gap-3 px-2 py-4" : ""}`}>
        <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
          <div className="flex h-9 w-9 items-center justify-center shrink-0 rounded-full bg-gradient-to-br from-[#78C6C9]/20 to-[#F5F7F6] font-bold text-sm text-[#256D85] shadow-sm border border-[#78C6C9]/30">
            {session?.user?.name?.charAt(0) || "U"}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="max-w-[120px] truncate text-sm font-medium text-slate-700">
                {session?.user?.name}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{session?.user?.role}</span>
            </div>
          )}
        </div>
        <div className={`flex items-center gap-0.5 ${isCollapsed ? "flex-col" : ""}`}>
          <button
            onClick={() => signOut({ callbackUrl: "/login", redirect: true })}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50/80 transition-all duration-200"
            aria-label="Logout"
          >
            <LogOut size={17} strokeWidth={2} />
          </button>
        </div>
      </div>

      <Dialog open={dialogConfig.isOpen} onOpenChange={(isOpen) => setDialogConfig((prev) => ({ ...prev, isOpen }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogConfig.title}</DialogTitle>
            <DialogDescription>{dialogConfig.description}</DialogDescription>
          </DialogHeader>
          {(dialogConfig.type === 'addFolder' || dialogConfig.type === 'renameFolder') && (
            <div className="py-4">
              <Input
                value={dialogConfig.inputValue}
                onChange={(e) => setDialogConfig((prev) => ({ ...prev, inputValue: e.target.value }))}
                placeholder={dialogConfig.inputPlaceholder}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDialogConfirm();
                }}
              />
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setDialogConfig((prev) => ({ ...prev, isOpen: false }))}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDialogConfirm}
              disabled={isSubmitting || (dialogConfig.type !== 'deleteFolder' && !dialogConfig.inputValue.trim())}
              variant={dialogConfig.type === 'deleteFolder' ? 'destructive' : 'default'}
            >
              {isSubmitting ? 'Please wait...' : dialogConfig.confirmLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
