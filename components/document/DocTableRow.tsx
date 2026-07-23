"use client";

import * as React from "react";
import { PencilLine, Star } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  addContributors,
  addReviewers,
  archiveDocument,
  deleteDocument,
  moveDocument,
  renameDocument,
  toggleFavorite,
  updateDocumentStatus,
} from "./doc-api";
import type { DocumentRowData, Person, WorkspaceNode } from "./types";
import { DocumentActionMenu } from "./ActionMenu";
import { DocumentLocationCell } from "./DocumentLocationCell";
import { DocumentPeopleCell } from "./DocumentPeopleCell";
import { DocumentStatusCell } from "./DocumentStatusCell";
import { DocumentTypeBadge } from "./DocumentTypeBadge";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function DocTableRow({
  doc,
  workspaces,
  members,
  onRefresh,
  onShare,
}: {
  doc: DocumentRowData;
  workspaces: WorkspaceNode[];
  members: Person[];
  onRefresh: () => void;
  onShare?: (documentId: string) => void;
}) {
  const router = useRouter();
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState(doc.title);
  const [localTitle, setLocalTitle] = React.useState(doc.title);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setLocalTitle(doc.title);
    setTitleDraft(doc.title);
  }, [doc.title]);

  React.useEffect(() => {
    if (!editingTitle) return;
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [editingTitle]);

  async function commitRename() {
    const nextTitle = titleDraft.trim();

    if (!nextTitle) {
      setTitleDraft(localTitle);
      setEditingTitle(false);
      return;
    }

    if (nextTitle === localTitle) {
      setEditingTitle(false);
      return;
    }

    const previous = localTitle;
    setLocalTitle(nextTitle);
    setEditingTitle(false);

    try {
      await renameDocument(doc.id, nextTitle);
      onRefresh();
    } catch {
      setLocalTitle(previous);
      setTitleDraft(previous);
    }
  }

  function stopAll(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  return (
    <tr className="group border-b border-slate-200 transition-colors hover:bg-slate-50">
      <td
        className="px-4 py-3 min-w-[200px]"
        onPointerDownCapture={stopAll}
        onMouseDownCapture={stopAll}
        onClick={stopAll}
      >
        {editingTitle ? (
          <Input
            ref={inputRef}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void commitRename();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setTitleDraft(localTitle);
                setEditingTitle(false);
              }
            }}
            className="h-8"
          />
        ) : (
          <div className="flex max-w-full items-center gap-2 text-left">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/document/${doc.id}`);
              }}
              className="truncate font-medium text-slate-900 hover:text-[#256D85] hover:underline"
            >
              {localTitle}
            </button>
            <DocumentTypeBadge type={doc.type || "EDITABLE"} />

            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setEditingTitle(true);
              }}
              className="shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-slate-600 outline-none"
              aria-label="Rename document"
            >
              <PencilLine className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </td>

      <td
        className="px-4 py-3"
        onPointerDownCapture={stopAll}
        onMouseDownCapture={stopAll}
        onClick={stopAll}
      >
        <DocumentStatusCell
          documentId={doc.id}
          status={doc.status}
          workspaceEdit={doc.workspace_edit}
          onChange={async (documentId, nextStatus, nextWorkspaceEdit) => {
            await updateDocumentStatus(documentId, nextStatus, nextWorkspaceEdit);
            onRefresh();
          }}
        />
      </td>

      <td
        className="px-4 py-3"
        onPointerDownCapture={stopAll}
        onMouseDownCapture={stopAll}
        onClick={stopAll}
      >
        <DocumentLocationCell
          documentId={doc.id}
          workspaceId={doc.workspace_id}
          workspaceName={doc.workspace_name}
          folderId={doc.folder_id}
          folderName={doc.folder_name}
          workspaces={workspaces}
          onMove={async (documentId, next) => {
            await moveDocument(documentId, next.workspaceId, next.folderId);
            onRefresh();
          }}
        />
      </td>

      <td
        className="px-4 py-3"
        onPointerDownCapture={stopAll}
        onMouseDownCapture={stopAll}
        onClick={stopAll}
      >
        <DocumentPeopleCell
          documentId={doc.id}
          mode="contributors"
          people={doc.contributors}
          selectablePeople={members}
          onUpdateContributors={async (documentId, userIds) => {
            await addContributors(documentId, userIds);
            onRefresh();
          }}
        />
      </td>

      <td
        className="px-4 py-3"
        onPointerDownCapture={stopAll}
        onMouseDownCapture={stopAll}
        onClick={stopAll}
      >
        <DocumentPeopleCell
          documentId={doc.id}
          mode="reviewers"
          people={doc.reviewers}
          selectablePeople={members}
          onUpdateReviewers={async (documentId, reviewerIds) => {
            await addReviewers(documentId, reviewerIds);
            onRefresh();
          }}
        />
      </td>

      <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
        {doc.owner_name}
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px]">
              {initials(doc.owner_name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-slate-500">{doc.updated_at_label}</span>
        </div>
      </td>

      <td
        className="px-4 py-3 text-right"
        onPointerDownCapture={stopAll}
        onMouseDownCapture={stopAll}
        onClick={stopAll}
      >
        <div className="inline-flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full transition-colors",
              doc.is_favorite
                ? "text-yellow-400 hover:text-yellow-500"
                : "text-slate-400 hover:text-slate-600",
            )}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={async (e) => {
              e.stopPropagation();
              await toggleFavorite(doc.id);
              onRefresh();
            }}
          >
            <Star className={cn("h-4 w-4", doc.is_favorite && "fill-current")} />
          </Button>

          <DocumentActionMenu
            documentId={doc.id}
            onRename={() => setEditingTitle(true)}
            onShare={onShare}
            onArchive={async (documentId: string) => {
              await archiveDocument(documentId);
              onRefresh();
            }}
            onDelete={async (documentId: string) => {
              await deleteDocument(documentId);
              onRefresh();
            }}
          />
        </div>
      </td>
    </tr>
  );
}
