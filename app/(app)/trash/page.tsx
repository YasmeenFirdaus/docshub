"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Upload
} from "lucide-react";

import { ImportModal } from "@/components/document/ImportModal";
import { DocTable } from "@/components/document/DocTable";
import { FilterBar, FilterCondition } from "@/components/document/FilterBar";
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
  workspace_edit?: boolean | null;
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
  owner_id?: string | null;
  owner?: RawPerson | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  is_favorite?: boolean | null;
  favorite?: boolean | null;
  shares?: { permission: string; user: RawPerson }[] | null;
  contributors?: { user: RawPerson }[] | null;
  review_requests?: { status: string; reviewer: RawPerson }[] | null;
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
    .reduce<FolderNode[]>((acc, folder) => {
      const id = typeof folder.id === "string" ? folder.id : "";
      if (!id) return acc;

      const children = normalizeFolders(folder.children ?? []);

      acc.push({
        id,
        name:
          typeof folder.name === "string" && folder.name.trim()
            ? folder.name
            : "Untitled Folder",
        ...(children.length > 0 ? { children } : {}),
      });

      return acc;
    }, []);
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

      const contributors = Array.isArray(doc.contributors) 
        ? normalizePeople(doc.contributors.map((c: any) => c.user))
        : [];

      const sharing = Array.isArray(doc.shares) 
        ? normalizePeople(doc.shares.map((s: any) => s.user))
        : [];
        
      const reviewers = Array.isArray(doc.review_requests)
        ? normalizePeople(doc.review_requests.map((r: any) => r.reviewer))
        : [];
        
      const reviewStatus = Array.isArray(doc.review_requests) && doc.review_requests.length > 0
        ? doc.review_requests[0].status
        : null;

      return {
        id,
        owner_id: typeof doc.owner_id === "string" ? doc.owner_id : "",
        title:
          typeof doc.title === "string" && doc.title.trim()
            ? doc.title
            : "Untitled Document",
        status: status as any,
        workspace_edit: typeof doc.workspace_edit === "boolean" ? doc.workspace_edit : true,
        workspace_id: workspaceId,
        workspace_name: workspaceName,
        folder_id: folderId,
        folder_name: folderName,
        owner_name: ownerName,
        created_at_label: formatDateLabel(doc.created_at ?? doc.createdAt),
        updated_at_label: formatDateLabel(doc.updated_at ?? doc.updatedAt),
        is_favorite: Boolean(doc.is_favorite ?? doc.favorite),
        contributors,
        sharing,
        reviewers,
        review_status: reviewStatus,
      };
    })
    .filter(Boolean) as DocumentRowData[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return (await response.json()) as T;
}

export default function TrashPage() {
  const router = useRouter();

  const [docs, setDocs] = useState<DocumentRowData[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceNode[]>([]);
  const [members, setMembers] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showImport, setShowImport] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sortBy, setSortBy] = useState('updated_at');

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (filters.length > 0) params.set('filters', JSON.stringify(filters));
    params.set('sort', sortBy);
    params.set('trash', 'true');

    try {
      const [docsRes, workspacesRes, membersRes] = await Promise.allSettled([
        fetchJson<unknown>(`/api/documents?${params.toString()}`),
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
  }, [searchQuery, filters, sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDocs();
    }, 300);
    return () => clearTimeout(timer);
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

  return (
    <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">Trash</h1>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
          <button
            type="button"
            onClick={handleNewDocument}
            disabled={isCreating}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {isCreating ? "Creating..." : "New Document"}
          </button>
        </div>
      </div>

      {/* Top Bar Filters & Search */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400"
          />
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 outline-none"
          >
            <option value="updated_at">Sort by Updated</option>
            <option value="created_at">Sort by Created</option>
          </select>
          <span className="text-sm text-slate-400">{docs.length} documents</span>
        </div>
      </div>
      
      {/* ClickUp Style Filter Bar */}
      <div className="mb-4 shrink-0">
        <FilterBar filters={filters} setFilters={setFilters} />
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shrink-0">
          {error}
        </div>
      ) : null}

      {/* Table */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="mt-4 text-slate-400 text-sm">Loading documents...</div>
        </div>
      ) : (
        <DocTable
          rows={docs}
          workspaces={workspaces}
          members={members}
          onRefresh={fetchDocs}
          showLocation={true}
          isTrash={true}
        />
      )}

      {showImport && <ImportModal onClose={() => setShowImport(false)} onSuccess={fetchDocs} />}
    </div>
  );
}
