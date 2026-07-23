export type DocumentStatus = "DRAFT" | "PUBLISHED" | "PRIVATE";

export type FolderNode = {
  id: string;
  name: string;
  children?: FolderNode[];
};

export type WorkspaceNode = {
  id: string;
  name: string;
  folders: FolderNode[];
};

export type Person = {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
};

export type DocumentRowData = {
  id: string;
  title: string;
  status: DocumentStatus;
  workspace_edit: boolean;
  workspace_id: string;
  workspace_name: string;
  folder_id: string | null;
  folder_name: string | null;
  owner_id: string;
  owner_name: string;
  updated_at_label: string;
  created_at_label: string;
  is_favorite: boolean;
  contributors: Person[];
  sharing: Person[];
  reviewers: Person[];
  review_status?: string | null;
  type?: string;
};
