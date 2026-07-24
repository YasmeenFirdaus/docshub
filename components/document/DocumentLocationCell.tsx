"use client";

import * as React from "react";
import { ChevronDown, ChevronsRight, FolderOpen, MoveRight, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import type { FolderNode, WorkspaceNode } from "./types";

type LocationSelection = {
  workspaceId: string;
  workspaceName: string;
  folderId: string | null;
  folderName: string | null;
};

function flattenFolders(
  folders: FolderNode[],
  depth = 0,
  workspaceName?: string,
): Array<{ id: string; name: string; depth: number; path: string }> {
  const result: Array<{ id: string; name: string; depth: number; path: string }> = [];

  for (const folder of folders) {
    const path = workspaceName ? `${workspaceName} / ${folder.name}` : folder.name;
    result.push({ id: folder.id, name: folder.name, depth, path });

    if (folder.children?.length) {
      result.push(...flattenFolders(folder.children, depth + 1, workspaceName));
    }
  }

  return result;
}

export function DocumentLocationCell({
  documentId,
  workspaceId,
  workspaceName,
  folderId,
  folderName,
  workspaces,
  onMove,
  disabled,
}: {
  documentId: string;
  workspaceId: string;
  workspaceName: string;
  folderId: string | null;
  folderName: string | null;
  workspaces: WorkspaceNode[];
  onMove?: (documentId: string, next: LocationSelection) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [currentWorkspaceId, setCurrentWorkspaceId] = React.useState(workspaceId);
  const [currentWorkspaceName, setCurrentWorkspaceName] = React.useState(workspaceName);
  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(folderId);
  const [currentFolderName, setCurrentFolderName] = React.useState<string | null>(folderName);

  React.useEffect(() => {
    setCurrentWorkspaceId(workspaceId);
    setCurrentWorkspaceName(workspaceName);
    setCurrentFolderId(folderId);
    setCurrentFolderName(folderName);
  }, [workspaceId, workspaceName, folderId, folderName]);

  const currentPath = `${currentWorkspaceName}${currentFolderName ? ` / ${currentFolderName}` : ""}`;

  const activeWorkspace = React.useMemo(
    () => workspaces.find((item) => item.id === currentWorkspaceId) ?? null,
    [workspaces, currentWorkspaceId],
  );

  const workspaceItems = React.useMemo(() => {
    return workspaces.map((item) => ({
      id: item.id,
      label: item.name,
      workspaceName: item.name,
      folderId: null as string | null,
      folderName: null as string | null,
      kind: "workspace" as const,
    }));
  }, [workspaces]);

  const folderItems = React.useMemo(() => {
    if (!activeWorkspace) return [];
    return flattenFolders(activeWorkspace.folders, 0, activeWorkspace.name).map((item) => ({
      id: item.id,
      label: item.path,
      workspaceName: activeWorkspace.name,
      folderId: item.id,
      folderName: item.name,
      kind: "folder" as const,
    }));
  }, [activeWorkspace]);

  if (disabled) {
    return (
      <Button
        type="button"
        variant="ghost"
        disabled
        className="h-8 max-w-[260px] justify-start gap-1 rounded-md px-2 text-left text-sm font-medium opacity-70"
      >
        <span className="truncate">{currentPath}</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-8 max-w-[260px] justify-start gap-1 rounded-md px-2 text-left text-sm font-medium"
        >
          <span className="truncate">{currentPath}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[360px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search location..." />
          <CommandList>
            <CommandEmpty>No location found.</CommandEmpty>

            <CommandGroup heading="Workspaces">
              {workspaceItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.label}
                  onSelect={async () => {
                    const next = {
                      workspaceId: item.id,
                      workspaceName: item.workspaceName,
                      folderId: null,
                      folderName: null,
                    };

                    const previous = {
                      workspaceId: currentWorkspaceId,
                      workspaceName: currentWorkspaceName,
                      folderId: currentFolderId,
                      folderName: currentFolderName,
                    };

                    setCurrentWorkspaceId(next.workspaceId);
                    setCurrentWorkspaceName(next.workspaceName);
                    setCurrentFolderId(null);
                    setCurrentFolderName(null);
                    setOpen(false);

                    try {
                      if (onMove) {
                        await Promise.resolve(onMove(documentId, next));
                      }
                    } catch {
                      setCurrentWorkspaceId(previous.workspaceId);
                      setCurrentWorkspaceName(previous.workspaceName);
                      setCurrentFolderId(previous.folderId);
                      setCurrentFolderName(previous.folderName);
                    }
                  }}
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading={activeWorkspace ? `Folders in ${activeWorkspace.name}` : "Folders"}>
              {folderItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.label}
                  onSelect={async () => {
                    const next = {
                      workspaceId: currentWorkspaceId,
                      workspaceName: currentWorkspaceName,
                      folderId: item.folderId,
                      folderName: item.folderName,
                    };

                    const previous = {
                      workspaceId: currentWorkspaceId,
                      workspaceName: currentWorkspaceName,
                      folderId: currentFolderId,
                      folderName: currentFolderName,
                    };

                    setCurrentWorkspaceId(next.workspaceId);
                    setCurrentWorkspaceName(next.workspaceName);
                    setCurrentFolderId(next.folderId);
                    setCurrentFolderName(next.folderName);
                    setOpen(false);

                    try {
                      if (onMove) {
                        await Promise.resolve(onMove(documentId, next));
                      }
                    } catch {
                      setCurrentWorkspaceId(previous.workspaceId);
                      setCurrentWorkspaceName(previous.workspaceName);
                      setCurrentFolderId(previous.folderId);
                      setCurrentFolderName(previous.folderName);
                    }
                  }}
                >
                  <ChevronsRight className="mr-2 h-4 w-4" />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <div className="border-t p-2 text-xs text-slate-500">
              <Plus className="mr-1 inline h-3.5 w-3.5" />
              Moving keeps the same document ID and history.
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}