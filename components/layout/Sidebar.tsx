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
  Plus,
  ChevronRight,
  ChevronDown,
  Folder,
  Settings,
  MoreHorizontal,
  Edit2,
  Trash,
  FolderPlus,
  LogOut,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useSidebarStore } from "@/stores/sidebar.store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [spaceMenuOpen, setSpaceMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

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
    { name: "All Docs", icon: Layers, href: "/all-docs" },
    { name: "Shared with me", icon: Share2, href: "/shared-with-me" },
    { name: "Favorites", icon: Star, href: "/favorites" },
    { name: "Recent", icon: Clock, href: "/recent" },
    { name: "Trash", icon: Trash2, href: "/trash" },
  ];

  const handleAddFolder = async (
    workspaceId: string,
    parentId: string | null = null,
  ) => {
    setActiveMenu(null);
    const name = window.prompt("Enter new folder name:");
    if (!name) return;

    await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, workspace_id: workspaceId, parent_id: parentId }),
    });

    await fetchWorkspaces();

    if (parentId && !expandedFolders.has(parentId)) {
      toggleFolder(parentId);
    }
  };

  const handleRenameFolder = async (folderId: string, currentName: string) => {
    setActiveMenu(null);
    const newName = window.prompt("Enter new folder name:", currentName);
    if (!newName || newName === currentName) return;

    await fetch(`/api/folders/${folderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    await fetchWorkspaces();
  };

  const handleDeleteFolder = async (folderId: string) => {
    setActiveMenu(null);
    if (
      !window.confirm(
        "Are you sure you want to delete this folder? All nested items will be lost.",
      )
    )
      return;

    await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
    await fetchWorkspaces();
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
            className="group relative flex cursor-pointer items-center rounded-md py-1.5 pr-2 text-slate-600 hover:bg-slate-100"
            style={{ paddingLeft: `${depth * 16 + 24}px` }}
          >
            <button
              type="button"
              className="mr-1 flex h-4 w-4 items-center justify-center text-slate-400 hover:text-slate-600"
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
              <Folder size={16} className="mr-2 shrink-0 text-slate-400" />
              <span className="flex-1 truncate text-sm">{folder.name}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === folder.id ? null : folder.id);
              }}
              className="rounded p-1 text-slate-400 opacity-0 transition-opacity hover:text-slate-700 group-hover:opacity-100"
            >
              <MoreHorizontal size={14} />
            </button>

            {activeMenu === folder.id && (
              <div className="absolute right-2 top-8 z-50 w-40 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
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
            <div>{renderFolderTree(folders, workspaceId, folder.id, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div
      className="flex h-full w-[280px] flex-col border-r border-slate-200 bg-[#FAFBFC]"
      onClick={() => {
        setActiveMenu(null);
        setSpaceMenuOpen(false);
      }}
    >
      <div className="mb-4 flex h-14 items-center px-4">
        <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">
          <Layers size={18} />
        </div>
        <span className="font-semibold tracking-tight text-slate-800">
          {tenant?.name || "Enterprise DMS"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon size={18} className={`mr-3 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
              {item.name}
            </Link>
          );
        })}

        <div className="pb-2 pt-6">
          <div className="px-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Current Space
            </span>

            <div className="relative mt-2">
              <button
                type="button"
                onClick={() => setSpaceMenuOpen((v) => !v)}
                className="flex w-full items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <div className="mr-2 flex h-5 w-5 items-center justify-center rounded bg-indigo-100 text-xs font-bold text-indigo-700">
                  {activeWorkspace?.icon || activeWorkspace?.name?.charAt(0) || "S"}
                </div>
                <span className="min-w-0 flex-1 truncate">
                  {activeWorkspace?.name || "No space assigned"}
                </span>
                <ChevronDown size={14} className="ml-2 shrink-0 text-slate-400" />
              </button>

              {spaceMenuOpen && workspaces.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                  {workspaces.map((workspace) => (
                    <button
                      key={workspace.id}
                      type="button"
                      onClick={() => {
                        setActiveWorkspace(workspace.id);
                        setSpaceMenuOpen(false);
                        router.push(`/workspace/${workspace.id}`);
                      }}
                      className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                        activeWorkspaceId === workspace.id
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-700"
                      }`}
                    >
                      <div className="mr-2 flex h-5 w-5 items-center justify-center rounded bg-indigo-100 text-xs font-bold text-indigo-700">
                        {workspace.icon || workspace.name.charAt(0)}
                      </div>
                      <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Folders
              </span>
              <button
                type="button"
                onClick={() => activeWorkspace && handleAddFolder(activeWorkspace.id, null)}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
                aria-label="New folder"
              >
                <FolderPlus size={16} />
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
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center justify-between border-t border-slate-200 p-4 transition-colors hover:bg-slate-50 cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 font-bold text-sm text-amber-700">
                {session?.user?.name?.charAt(0) || "U"}
              </div>
              <div className="flex flex-col">
                <span className="max-w-[120px] truncate text-sm font-medium text-slate-700">
                  {session?.user?.name}
                </span>
                <span className="text-xs text-slate-500">{session?.user?.role}</span>
              </div>
            </div>
            <MoreHorizontal size={18} className="text-slate-400 transition-colors hover:text-indigo-600" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {(session?.user?.role === "ADMIN" || session?.user?.role === "OWNER") && (
            <>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/settings/members" className="flex items-center w-full">
                  <Settings size={14} className="mr-2 text-slate-500" />
                  Workspace Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
            onClick={() => signOut({ callbackUrl: "/login", redirect: true })}
          >
            <LogOut size={14} className="mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
