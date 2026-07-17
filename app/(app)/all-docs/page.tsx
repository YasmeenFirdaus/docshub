"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Filter,
  Plus,
  Search,
} from "lucide-react";

import { ImportButton } from "@/components/document/ImportButton";
import { DocTable } from "@/components/document/DocTable";
import type {
  DocumentRowData,
  FolderNode,
  Person,
  WorkspaceNode,
} from "@/components/document/types";

type RawPerson = {
  id?: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
};

type RawFolder = {
  id?: string;
  name?: string | null;
  children?: RawFolder[] | null;
};

type RawWorkspace = {
  id?: string;
  name?: string | null;
  folders?: RawFolder[] | null;
};

type RawDocument = {
  id?: string;
  title?: string | null;
  status?: string | null;
  workspace_id?: string | null;
  workspace_name?: string | null;
  workspace?: {
    id?: string;
    name?: string | null;
    folders?: RawFolder[] | null;
  } | null;
  folder_id?: string | null;
  folder_name?: string | null;
  folder?: {
    id?: string;
    name?: string | null;
  } | null;
  owner_name?: string | null;
  owner?: RawPerson | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  is_favorite?: boolean | null;
  favorite?: boolean | null;
  contributors?: RawPerson[] | null;
  reviewers?: RawPerson[] | null;
};

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function normalizePerson(person: RawPerson): Person | null {
  const id = typeof person.id === "string" ? person.id : "";
  if (!id) return null;

  return {
    id,
    name: typeof person.name === "string" && person.name.trim() ? person.name : "Unknown",
    email: typeof person.email === "string" ? person.email : "",
    avatar_url:
      typeof person.avatar_url === "string"
        ? person.avatar_url
        : typeof person.avatarUrl === "string"
          ? person.avatarUrl
          : null,
  };
}

function normalizePeople(input: RawPerson[] | null | undefined): Person[] {
  if (!Array.isArray(input)) return [];
  return input.map(normalizePerson).filter((item): item is Person => Boolean(item));
}

function normalizeFolders(input: RawFolder[] | null | undefined): FolderNode[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((folder) => {
      const id = typeof folder.id === "string" ? folder.id : "";
      if (!id) return null;

      return {
        id,
        name:
          typeof folder.name === "string" && folder.name.trim()
            ? folder.name
            : "Untitled Folder",
        children: normalizeFolders(folder.children ?? []),
      };
    })
    .filter((item): item is FolderNode => Boolean(item));
}

function normalizeWorkspaces(input: unknown): WorkspaceNode[] {
  const items = Array.isArray(input)
    ? input
    : typeof input === "object" && input !== null && Array.isArray((input as { workspaces?: unknown }).workspaces)
      ? ((input as { workspaces: unknown[] }).workspaces as RawWorkspace[])
      : [];

  return items
    .map((workspace) => {
      const id = typeof workspace.id === "string" ? workspace.id : "";
      if (!id) return null;

      return {
        id,
        name:
          typeof workspace.name === "string" && workspace.name.trim()
            ? workspace.name
            : "Untitled Workspace",
        folders: normalizeFolders(workspace.folders ?? []),
      };
    })
    .filter((item): item is WorkspaceNode => Boolean(item));
}

function normalizeDocuments(input: unknown): DocumentRowData[] {
  const items = Array.isArray(input)
    ? input
    : typeof input === "object" && input !== null && Array.isArray((input as { documents?: unknown }).documents)
      ? ((input as { documents: unknown[] }).documents as RawDocument[])
      : [];

  return items
    .map((doc) => {
      const id = typeof doc.id === "string" ? doc.id : "";
      if (!id) return null;

      const workspaceId =
        typeof doc.workspace_id === "string"
          ? doc.workspace_id
          : typeof doc.workspace?.id === "string"
            ? doc.workspace.id
            : "";

      const workspaceName =
        typeof doc.workspace?.name === "string" && doc.workspace.name.trim()
          ? doc.workspace.name
          : typeof doc.workspace_name === "string" && doc.workspace_name.trim()
            ? doc.workspace_name
            : "Private";

      const folderId =
        typeof doc.folder_id === "string"
          ? doc.folder_id
          : typeof doc.folder?.id === "string"
            ? doc.folder.id
            : null;

      const folderName =
        typeof doc.folder?.name === "string" && doc.folder.name.trim()
          ? doc.folder.name
          : typeof doc.folder_name === "string" && doc.folder_name.trim()
            ? doc.folder_name
            : null;

      const ownerName =
        typeof doc.owner_name === "string" && doc.owner_name.trim()
          ? doc.owner_name
          : typeof doc.owner?.name === "string" && doc.owner.name.trim()
            ? doc.owner.name
            : "Unknown";

      const rawStatus = typeof doc.status === "string" ? doc.status.toUpperCase() : "DRAFT";
      const status =
        rawStatus === "PUBLISHED" || rawStatus === "PRIVATE" ? rawStatus : "DRAFT";

      return {
        id,
        title:
          typeof doc.title === "string" && doc.title.trim()
            ? doc.title
            : "Untitled Document",
        status,
        workspace_id: workspaceId,
        workspace_name: workspaceName,
        folder_id: folderId,
        folder_name: folderName,
        owner_name: ownerName,
        updated_at_label: formatDateLabel(doc.updated_at ?? doc.updatedAt),
        is_favorite: Boolean(doc.is_favorite ?? doc.favorite),
        contributors: normalizePeople(doc.contributors ?? []),
        reviewers: normalizePeople(doc.reviewers ?? []),
      };
    })
    .filter((item): item is DocumentRowData => Boolean(item));
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return (await response.json()) as T;
}

export default function AllDocsPage() {
  const router = useRouter();

  const [docs, setDocs] = useState<DocumentRowData[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceNode[]>([]);
  const [members, setMembers] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [docsRes, workspacesRes, membersRes] = await Promise.allSettled([
        fetchJson<unknown>("/api/documents"),
        fetchJson<unknown>("/api/workspaces"),
        fetchJson<unknown>("/api/members"),
      ]);

      if (docsRes.status === "fulfilled") {
        setDocs(normalizeDocuments(docsRes.value));
      } else {
        setDocs([]);
      }

      if (workspacesRes.status === "fulfilled") {
        setWorkspaces(normalizeWorkspaces(workspacesRes.value));
      } else {
        setWorkspaces([]);
      }

      if (membersRes.status === "fulfilled") {
        const payload = membersRes.value;
        const list =
          Array.isArray(payload)
            ? payload
            : typeof payload === "object" && payload !== null && Array.isArray((payload as { members?: unknown }).members)
              ? (payload as { members: RawPerson[] }).members
              : typeof payload === "object" && payload !== null && Array.isArray((payload as { users?: unknown }).users)
                ? (payload as { users: RawPerson[] }).users
                : [];

        setMembers(normalizePeople(list));
      } else {
        setMembers([]);
      }
    } catch (err) {
      setDocs([]);
      setWorkspaces([]);
      setMembers([]);
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDocs();
  }, [fetchDocs]);

  const handleNewDocument = useCallback(async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Document" }),
      });

      if (!res.ok) {
        throw new Error("Failed to create document");
      }

      const newDoc = (await res.json()) as { id?: string };
      if (typeof newDoc.id === "string" && newDoc.id) {
        router.push(`/document/${newDoc.id}`);
        return;
      }

      throw new Error("Document id missing from response");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create document");
    } finally {
      setIsCreating(false);
    }
  }, [router]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center text-slate-400">
          Loading documents...
        </div>
      );
    }

    if (docs.length === 0) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-500">
          No documents found. Click “New” to create one.
        </div>
      );
    }

    return (
      <DocTable
        rows={docs}
        workspaces={workspaces}
        members={members}
        onRefresh={fetchDocs}
      />
    );
  }, [docs, fetchDocs, loading, members, workspaces]);

  return (
    <div className="mx-auto w-full max-w-[1400px] p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Knowledge Hub</h1>

        <div className="flex items-center gap-2">
          <ImportButton />
          <button
            type="button"
            onClick={handleNewDocument}
            disabled={isCreating}
            className="flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus size={16} className="mr-2" />
            {isCreating ? "Creating..." : "New"}
          </button>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            placeholder="Search documents..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <button
          type="button"
          className="flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          <Filter size={16} className="mr-2" />
          Filter
        </button>

        <button
          type="button"
          className="flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          <ArrowUpDown size={16} className="mr-2" />
          Sort
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {content}
    </div>
  );
}