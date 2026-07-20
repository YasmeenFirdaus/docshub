'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal, FileText, Lock, CheckCircle2, Star,
  Edit2, Copy, Archive, Trash2, Move, Share2, Link2,
  RotateCcw, ChevronRight, ChevronDown, Check, UserPlus,
  Search, Plus, LayoutList, Users, X, Loader2
} from 'lucide-react'
import { DocumentRowData, WorkspaceNode, Person, FolderNode } from './types'
import {
  archiveDocument,
  deleteDocument,
  duplicateDocument,
  toggleFavorite,
  updateDocumentStatus,
  renameDocument,
  moveDocument,
  addContributors,
  addReviewers,
  restoreDocument,
  permanentDeleteDocument
} from './doc-api'
import { Input } from "@/components/ui/input"
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { DocSharePanel } from './DocSharePanel'

interface DocTableProps {
  rows: DocumentRowData[]
  workspaces?: WorkspaceNode[]
  members?: Person[]
  showLocation?: boolean
  isTrash?: boolean
  onRefresh?: () => void
}

export function DocTable({ rows, workspaces = [], members = [], showLocation = true, isTrash = false, onRefresh }: DocTableProps) {
  const router = useRouter()
  const [contextDoc, setContextDoc] = useState<string | null>(null)

  // For renaming
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState<string>('')

  const [shareDoc, setShareDoc] = useState<DocumentRowData | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10
  const totalPages = Math.ceil(rows.length / rowsPerPage)

  // Reset page when rows change (e.g. searching/filtering)
  useEffect(() => {
    setCurrentPage(1)
  }, [rows])

  const paginatedRows = rows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  const runAction = async (doc: DocumentRowData, action: string) => {
    setContextDoc(null)
    if (action === 'NAVIGATE') { router.push(`/document/${doc.id}`); return }

    try {
      if (action === 'FAVORITE') {
        await toggleFavorite(doc.id)
      } else if (action === 'ARCHIVE') {
        await archiveDocument(doc.id)
      } else if (action === 'DELETE') {
        await deleteDocument(doc.id)
      } else if (action === 'RESTORE') {
        await restoreDocument(doc.id)
      } else if (action === 'PERMANENT_DELETE') {
        await permanentDeleteDocument(doc.id)
      } else if (action === 'DUPLICATE') {
        await duplicateDocument(doc.id)
      }
      onRefresh?.()
    } catch (err) {
      console.error(err)
    }
  }

  const updateStatus = async (docId: string, status: string) => {
    await updateDocumentStatus(docId, status as any)
    onRefresh?.()
  }

  const commitRename = async (doc: DocumentRowData) => {
    const nextTitle = titleDraft.trim()
    setEditingTitleId(null)

    if (!nextTitle || nextTitle === doc.title) return

    try {
      await renameDocument(doc.id, nextTitle)
      onRefresh?.()
    } catch (err) {
      console.error(err)
    }
  }

  const startRename = (doc: DocumentRowData) => {
    setTitleDraft(doc.title)
    setEditingTitleId(doc.id)
    setContextDoc(null)
  }

  return (
    <>
      <Dialog open={!!shareDoc} onOpenChange={(open) => !open && setShareDoc(null)}>
        <DialogContent className="max-w-xl overflow-hidden p-0" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Share Document</DialogTitle>
          {shareDoc && <DocSharePanel doc={shareDoc} onClose={() => setShareDoc(null)} onRefresh={onRefresh} />}
        </DialogContent>
      </Dialog>
      <div className="premium-card min-h-0 flex-1 flex flex-col overflow-hidden rounded-2xl relative z-0">
        <div className="overflow-auto flex-1 pb-16">
          <table className="w-full text-sm whitespace-nowrap min-w-[1200px]">
            <thead>
              <tr className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/95 text-[11px] uppercase tracking-[0.08em] text-slate-500 backdrop-blur">
                <th className="text-left px-5 py-2 font-semibold min-w-[280px]">Name</th>
                {showLocation && <th className="text-left px-4 py-2 font-semibold min-w-[200px]">Location</th>}
                <th className="text-left px-4 py-2 font-semibold min-w-[130px]">Status</th>
                <th className="text-left px-4 py-2 font-semibold min-w-[150px]">Review Status</th>
                <th className="text-left px-4 py-2 font-semibold min-w-[150px]">Reviewer</th>
                <th className="text-left px-4 py-2 font-semibold min-w-[150px]">Contributors</th>
                <th className="text-left px-4 py-2 font-semibold min-w-[150px]">Sharing</th>
                <th className="text-left px-4 py-2 font-semibold min-w-[120px]">Created</th>
                <th className="text-left px-4 py-2 font-semibold min-w-[120px]">Updated</th>
                <th className="text-left px-4 py-2 font-semibold min-w-[120px]">Viewed</th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={showLocation ? 11 : 10} className="px-6 py-16">
                    <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <LayoutList className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">No documents found</p>
                      <p className="mt-1 text-sm text-slate-500">Try changing your search or filters.</p>
                    </div>
                  </td>
                </tr>
              )}
              {paginatedRows.map((doc) => (
                <tr
                  key={doc.id}
                  className="group cursor-pointer border-b border-slate-100/80 transition-colors last:border-0 hover:bg-[#78C6C9]/10"
                  onClick={() => {
                    if (editingTitleId !== doc.id) {
                      router.push(`/document/${doc.id}`)
                    }
                  }}
                >
                  {/* Name */}
                  <td className="px-5 py-2 transition-colors group-hover:bg-[#78C6C9]/10">
                    {editingTitleId === doc.id ? (
                      <Input
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onBlur={() => commitRename(doc)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            commitRename(doc)
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault()
                            setEditingTitleId(null)
                          }
                        }}
                        autoFocus
                        className="h-8 w-full max-w-[200px]"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#78C6C9]/12 text-[#256D85] ring-1 ring-[#78C6C9]/30">
                          <FileText className="w-4 h-4" />
                        </span>
                        <span className="font-semibold text-slate-800 truncate max-w-[220px]">{doc.title}</span>
                        {doc.status === 'PUBLISHED' && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        )}
                        {doc.status === 'PRIVATE' && (
                          <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        {/* Action icons (Link, Favorite, Rename) */}
                        <div className="flex items-center gap-1 ml-auto pl-2">
                          <button
                            type="button"
                            title="Copy Link"
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-[#256D85] transition-colors opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation(); e.preventDefault();
                              navigator.clipboard.writeText(window.location.origin + '/document/' + doc.id);
                            }}
                          >
                            <Link2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Favorite"
                            className={cn(
                              "p-1 rounded transition-all",
                              doc.is_favorite
                                ? "text-yellow-400 hover:text-yellow-500 hover:bg-slate-100 opacity-100"
                                : "text-slate-400 hover:text-yellow-500 hover:bg-slate-200 opacity-0 group-hover:opacity-100"
                            )}
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); runAction(doc, 'FAVORITE') }}
                          >
                            <Star className={cn("w-3.5 h-3.5", doc.is_favorite && "fill-current")} />
                          </button>
                          <button
                            type="button"
                            title="Rename"
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-[#256D85] transition-colors opacity-0 group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); startRename(doc); }}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Location */}
                  {showLocation && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <LocationPopover
                        doc={doc}
                        workspaces={workspaces}
                        onRefresh={onRefresh}
                      />
                    </td>
                  )}

                  {/* Status */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <StatusDropdown
                      status={doc.status}
                      docId={doc.id}
                      workspaceEdit={doc.workspace_edit}
                      onChange={async (s, edit) => {
                        await updateDocumentStatus(doc.id, s as any, edit);
                        onRefresh?.();
                      }}
                    />
                  </td>

                  {/* Review Status */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <ReviewStatusPopover
                      docId={doc.id}
                      currentStatus={doc.review_status}
                      onRefresh={onRefresh}
                    />
                  </td>

                  {/* Reviewer */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <ReviewerPopover
                      docId={doc.id}
                      workspaceId={doc.workspace_id}
                      reviewers={doc.reviewers}
                      members={members}
                      onRefresh={onRefresh}
                    />
                  </td>

                  {/* Contributors */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <ContributorsPopover
                      docId={doc.id}
                      workspaceId={doc.workspace_id}
                      ownerId={doc.owner_id}
                      contributors={doc.contributors}
                      members={members}
                      onRefresh={onRefresh}
                    />
                  </td>

                  {/* Sharing */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <SharingButton sharing={doc.sharing} onClick={() => setShareDoc(doc)} />
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {doc.created_at_label}
                  </td>

                  {/* Updated */}
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {doc.updated_at_label}
                  </td>

                  {/* Viewed (Placeholder) */}
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    —
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-2 transition-colors group-hover:bg-[#78C6C9]/10" onClick={(e) => e.stopPropagation()}>
                    <div className="relative flex items-center justify-end gap-1">
                      <button
                        onClick={() => setContextDoc(contextDoc === doc.id ? null : doc.id)}
                        className="p-1.5 hover:bg-white rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 transition shadow-sm"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {contextDoc === doc.id && (
                        <div className="premium-card absolute right-0 top-8 z-[100] rounded-xl py-1 w-48 text-sm animate-doc-fade-up">
                          {isTrash ? (
                            <>
                              <MenuItem icon={<RotateCcw className="w-3.5 h-3.5" />} label="Restore"
                                onClick={() => runAction(doc, 'RESTORE')} />
                              <MenuItem icon={<Trash2 className="w-3.5 h-3.5" />} label="Delete permanently"
                                onClick={() => runAction(doc, 'PERMANENT_DELETE')} danger />
                            </>
                          ) : (
                            <>
                              <MenuItem icon={<Edit2 className="w-3.5 h-3.5" />} label="Rename"
                                onClick={() => startRename(doc)} />
                              <MenuItem icon={<Link2 className="w-3.5 h-3.5" />} label="Copy link"
                                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/document/${doc.id}`); setContextDoc(null) }} />
                              <MenuItem icon={<Copy className="w-3.5 h-3.5" />} label="Duplicate"
                                onClick={() => runAction(doc, 'DUPLICATE')} />
                              <MenuItem icon={<Users className="w-3.5 h-3.5" />} label="Share"
                                onClick={() => { setShareDoc(doc); setContextDoc(null) }} />
                              <div className="border-t border-slate-100 my-1" />
                              <MenuItem icon={<Archive className="w-3.5 h-3.5" />} label="Archive"
                                onClick={() => runAction(doc, 'ARCHIVE')} />
                              <MenuItem icon={<Trash2 className="w-3.5 h-3.5" />} label="Delete"
                                onClick={() => runAction(doc, 'DELETE')} danger />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {rows.length > rowsPerPage && (
          <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/50 px-5 py-3">
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-800">{(currentPage - 1) * rowsPerPage + 1}</span> to <span className="font-semibold text-slate-800">{Math.min(currentPage * rowsPerPage, rows.length)}</span> of <span className="font-semibold text-slate-800">{rows.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center justify-center h-8 px-3 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#256D85] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const page = i + 1;
                  // Show max 5 page numbers logic
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "flex items-center justify-center h-8 min-w-[32px] px-2 text-xs font-semibold rounded-lg transition-all shadow-sm",
                          currentPage === page
                            ? "bg-[#256D85] text-white border-transparent"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#256D85]"
                        )}
                      >
                        {page}
                      </button>
                    )
                  }
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="text-slate-400 text-xs px-1">...</span>
                  }
                  return null;
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center justify-center h-8 px-3 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#256D85] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function MenuItem({ icon, label, onClick, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 text-left ${danger ? 'text-red-500' : 'text-slate-700'}`}
    >
      <span className="shrink-0">{icon}</span>
      {label}
    </button>
  )
}

function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return
      }
      handler()
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}

// ----------------------------------------------------------------------------
// POPOVERS
// ----------------------------------------------------------------------------

function StatusDropdown({ status, docId, workspaceEdit, onChange }: { status: string; docId: string; workspaceEdit?: boolean; onChange: (s: string, edit?: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))

  const statuses = [
    { value: 'DRAFT', label: 'Draft', workspaceEdit: false, color: 'bg-slate-100 text-slate-600' },
    { value: 'PUBLISHED', label: 'Published (Can Edit)', workspaceEdit: true, color: 'bg-green-50 text-green-700' },
    { value: 'PUBLISHED', label: 'Published (View Only)', workspaceEdit: false, color: 'bg-green-50 text-green-700' },
    { value: 'PRIVATE', label: 'Private', workspaceEdit: false, color: 'bg-amber-50 text-amber-700' }
  ]

  const currentOption = statuses.find(s => s.value === status && (status !== 'PUBLISHED' || s.workspaceEdit === workspaceEdit)) || statuses[0]

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`text-xs px-2.5 py-1 rounded border border-transparent font-medium flex items-center gap-1 hover:border-slate-300 transition-colors ${currentOption.color}`}
      >
        {currentOption.label} <ChevronDown className="w-3 h-3 opacity-50" />
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-48">
          {statuses.map((s, idx) => (
            <button
              key={`${s.value}-${idx}`}
              onClick={() => { onChange(s.value, s.workspaceEdit); setOpen(false) }}
              className={`w-full text-left flex items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-50 ${(s.value === status && s.workspaceEdit === workspaceEdit) ? 'font-semibold text-[#256D85]' : 'text-slate-700'}`}
            >
              {s.label}
              {(s.value === status && s.workspaceEdit === workspaceEdit) && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ReviewStatusPopover({ docId, currentStatus, onRefresh }: { docId: string, currentStatus?: string | null, onRefresh?: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))

  const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED']
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CHANGES_REQUESTED: 'Changes Req'
  }
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-50 text-yellow-700',
    APPROVED: 'bg-green-50 text-green-700',
    REJECTED: 'bg-red-50 text-red-700',
    CHANGES_REQUESTED: 'bg-orange-50 text-orange-700'
  }

  const handleUpdate = async (status: string) => {
    try {
      await fetch(`/api/documents/${docId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_REVIEW_STATUS", payload: { status } }),
      }).then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(typeof data.error === "string" ? data.error : "Failed to update review status")
        }
      })
      onRefresh?.()
      setOpen(false)
    } catch (err) {
      console.error(err)
    }
  }

  const displayStatus = currentStatus || 'None'

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`text-xs px-2.5 py-1 rounded border border-transparent font-medium flex items-center gap-1 hover:border-slate-300 transition-colors ${colors[displayStatus] || 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
      >
        {labels[displayStatus] || '—'}
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-40">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => handleUpdate(s)}
              className={`w-full text-left flex items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-50 ${s === displayStatus ? 'font-semibold text-[#256D85]' : 'text-slate-700'}`}
            >
              {labels[s]}
              {s === displayStatus && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function normalizeWorkspaceMembers(input: unknown): Person[] {
  if (!Array.isArray(input)) return []
  return input
    .map((item: any) => item?.user ?? item)
    .filter((user: any) => typeof user?.id === 'string')
    .map((user: any) => ({
      id: user.id,
      name: typeof user.name === 'string' && user.name.trim() ? user.name : user.email ?? 'Unknown',
      email: typeof user.email === 'string' ? user.email : '',
      avatar_url: typeof user.avatar_url === 'string' ? user.avatar_url : null,
    }))
}

function useWorkspacePeople(open: boolean, workspaceId: string, fallbackMembers: Person[]) {
  const [workspaceMembers, setWorkspaceMembers] = useState<Person[]>([])

  useEffect(() => {
    if (!open || !workspaceId) {
      setWorkspaceMembers([])
      return
    }
    setWorkspaceMembers([])
    fetch(`/api/workspaces/${workspaceId}/members`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setWorkspaceMembers(normalizeWorkspaceMembers(data)))
      .catch(() => setWorkspaceMembers([]))
  }, [open, workspaceId])

  return open ? workspaceMembers : fallbackMembers
}

function ReviewerPopover({ docId, workspaceId, reviewers, members, onRefresh }: { docId: string, workspaceId: string, reviewers: Person[], members: Person[], onRefresh?: () => void }) {
  const [open, setOpen] = useState(false)
  const [draftReviewerIds, setDraftReviewerIds] = useState<string[]>(() => reviewers.map((reviewer) => reviewer.id))
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const workspaceMembers = useWorkspacePeople(open, workspaceId, members)
  useClickOutside(ref, () => setOpen(false))

  useEffect(() => {
    if (open) setDraftReviewerIds(reviewers.map((reviewer) => reviewer.id))
  }, [open, reviewers])

  const selectedReviewers = workspaceMembers.filter((member) => draftReviewerIds.includes(member.id))
  const hasChanges =
    draftReviewerIds.length !== reviewers.length ||
    draftReviewerIds.some((id) => !reviewers.some((reviewer) => reviewer.id === id))

  const handleToggle = (userId: string) => {
    setDraftReviewerIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const handleApply = async () => {
    if (!hasChanges || saving) return
    setSaving(true)
    try {
      await addReviewers(docId, draftReviewerIds)
      setOpen(false)
      onRefresh?.()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-100 rounded group transition-colors border border-transparent hover:border-slate-200 min-w-[32px] h-8"
      >
        {reviewers.length > 0 ? (
          <div className="flex -space-x-1.5">
            {reviewers.slice(0, 3).map(c => (
              <div key={c.id} className="w-5 h-5 rounded-full bg-[#78C6C9]/18 border-2 border-white text-[#256D85] text-[10px] font-semibold flex items-center justify-center uppercase shrink-0">
                {c.name[0]}
              </div>
            ))}
            {reviewers.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-slate-100 border-2 border-white text-slate-600 text-[10px] font-medium flex items-center justify-center shrink-0">
                +{reviewers.length - 3}
              </div>
            )}
          </div>
        ) : (
          <span className="text-slate-400 text-xs italic">Unassigned</span>
        )}
      </button>

      {open && (
        <div className="premium-card absolute top-9 left-0 z-50 w-72 overflow-hidden rounded-xl p-2 animate-doc-fade-up">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Assign Reviewers
            </span>
            <span className="text-xs font-medium text-slate-400">{draftReviewerIds.length} selected</span>
          </div>

          {selectedReviewers.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5 border-b border-[#E7ECEA] px-2 pb-2">
              {selectedReviewers.map((member) => (
                <span
                  key={member.id}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#78C6C9]/12 px-2 py-1 text-xs font-medium text-[#256D85]"
                >
                  <span className="truncate">{member.name}</span>
                  <button
                    type="button"
                    onClick={() => handleToggle(member.id)}
                    className="rounded-full p-0.5 transition hover:bg-[#78C6C9]/20"
                    aria-label={`Remove ${member.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="max-h-56 overflow-y-auto">
            {workspaceMembers.map(member => {
              const isSelected = draftReviewerIds.includes(member.id)
              return (
                <button
                  type="button"
                  key={member.id}
                  onClick={() => handleToggle(member.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-[#F5F7F6]"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold uppercase text-slate-600">
                    {member.name[0]}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{member.name}</span>
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border transition",
                      isSelected ? "border-[#256D85] bg-[#256D85] text-white" : "border-slate-300 bg-white",
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-2 flex items-center justify-end gap-2 border-t border-[#E7ECEA] px-1 pt-2">
            <button
              type="button"
              onClick={() => {
                setDraftReviewerIds(reviewers.map((reviewer) => reviewer.id))
                setOpen(false)
              }}
              className="h-8 rounded-lg px-3 text-xs font-semibold text-slate-500 transition hover:bg-[#F5F7F6] hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!hasChanges || saving}
              className="arctic-primary flex h-8 min-w-20 items-center justify-center rounded-lg px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ContributorsPopover({ docId, workspaceId, ownerId, contributors, members, onRefresh }: { docId: string, workspaceId: string, ownerId: string, contributors: Person[], members: Person[], onRefresh?: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const workspaceMembers = useWorkspacePeople(open, workspaceId, members)
  useClickOutside(ref, () => setOpen(false))

  const handleToggle = async (userId: string) => {
    const isSelected = contributors.some(c => c.id === userId)
    let newContributors = isSelected
      ? contributors.filter(c => c.id !== userId).map(c => c.id)
      : [...contributors.map(c => c.id), userId]

    try {
      await fetch(`/api/documents/${docId}/contributors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: newContributors }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(typeof data.error === "string" ? data.error : "Failed to update contributors")
          }
        })
      onRefresh?.()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-100 rounded transition-colors border border-transparent hover:border-slate-200 min-w-[32px] h-8"
      >
        {contributors.length > 0 ? (
          <div className="flex -space-x-1.5">
            {contributors.slice(0, 3).map(c => (
              <div key={c.id} className="w-5 h-5 rounded-full bg-emerald-100 border-2 border-white text-emerald-700 text-[10px] font-semibold flex items-center justify-center uppercase shrink-0">
                {c.name[0]}
              </div>
            ))}
            {contributors.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-slate-100 border-2 border-white text-slate-600 text-[10px] font-medium flex items-center justify-center shrink-0">
                +{contributors.length - 3}
              </div>
            )}
          </div>
        ) : (
          <UserPlus className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="absolute top-9 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-56 max-h-64 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider sticky top-0 bg-white/95 backdrop-blur">
            Add Contributors
          </div>
          {workspaceMembers.filter((member) => member.id !== ownerId).map(member => {
            const isShared = contributors.some(c => c.id === member.id)
            return (
              <label
                key={member.id}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={() => handleToggle(member.id)}
                  className="rounded border-slate-300 text-[#256D85] focus:ring-[#78C6C9] w-4 h-4 cursor-pointer"
                />
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold flex items-center justify-center uppercase shrink-0">
                  {member.name[0]}
                </div>
                <span className="text-sm text-slate-700 truncate">{member.name}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SharingButton({ sharing, onClick }: { sharing: Person[], onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-100 rounded transition-colors border border-transparent hover:border-slate-200 min-w-[32px] h-8"
    >
      {sharing.length > 0 ? (
        <div className="flex -space-x-1.5">
          {sharing.slice(0, 3).map(c => (
            <div key={c.id} className="w-5 h-5 rounded-full bg-[#78C6C9]/18 border-2 border-white text-[#256D85] text-[10px] font-semibold flex items-center justify-center uppercase shrink-0">
              {c.name[0]}
            </div>
          ))}
          {sharing.length > 3 && (
            <div className="w-5 h-5 rounded-full bg-slate-100 border-2 border-white text-slate-600 text-[10px] font-medium flex items-center justify-center shrink-0">
              +{sharing.length - 3}
            </div>
          )}
        </div>
      ) : (
        <Share2 className="w-3.5 h-3.5 text-slate-400" />
      )}
    </button>
  )
}

function SharingPopover({ docId, workspaceId, sharing, members, onRefresh }: { docId: string, workspaceId: string, sharing: Person[], members: Person[], onRefresh?: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const workspaceMembers = useWorkspacePeople(open, workspaceId, members)
  useClickOutside(ref, () => setOpen(false))

  const handleToggle = async (userId: string) => {
    const isSelected = sharing.some(c => c.id === userId)
    let newSharing = isSelected
      ? sharing.filter(c => c.id !== userId).map(c => c.id)
      : [...sharing.map(c => c.id), userId]

    try {
      await fetch(`/api/documents/${docId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shared_with: newSharing, permission: "VIEW", replace: true }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(typeof data.error === "string" ? data.error : "Failed to update sharing")
          }
        })
      onRefresh?.()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-100 rounded transition-colors border border-transparent hover:border-slate-200 min-w-[32px] h-8"
      >
        {sharing.length > 0 ? (
          <div className="flex -space-x-1.5">
            {sharing.slice(0, 3).map(c => (
              <div key={c.id} className="w-5 h-5 rounded-full bg-[#78C6C9]/18 border-2 border-white text-[#256D85] text-[10px] font-semibold flex items-center justify-center uppercase shrink-0">
                {c.name[0]}
              </div>
            ))}
            {sharing.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-slate-100 border-2 border-white text-slate-600 text-[10px] font-medium flex items-center justify-center shrink-0">
                +{sharing.length - 3}
              </div>
            )}
          </div>
        ) : (
          <UserPlus className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="absolute top-9 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-56 max-h-64 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider sticky top-0 bg-white/95 backdrop-blur">
            Share with
          </div>
          {workspaceMembers.map(member => {
            const isShared = sharing.some(c => c.id === member.id)
            return (
              <label
                key={member.id}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={() => handleToggle(member.id)}
                  className="rounded border-slate-300 text-[#256D85] focus:ring-[#78C6C9] w-4 h-4 cursor-pointer"
                />
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold flex items-center justify-center uppercase shrink-0">
                  {member.name[0]}
                </div>
                <span className="text-sm text-slate-700 truncate">{member.name}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LocationPopover({ doc, workspaces, onRefresh }: { doc: DocumentRowData, workspaces: WorkspaceNode[], onRefresh?: () => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))

  // For nested folders:
  const FolderTree = ({ folders, workspaceId, depth = 0 }: { folders: FolderNode[], workspaceId: string, depth?: number }) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})

    const handleMove = async (folderId: string | null) => {
      try {
        await moveDocument(doc.id, workspaceId, folderId)
        onRefresh?.()
        setOpen(false)
      } catch (err) {
        console.error(err)
      }
    }

    // Filter folders based on search
    const filteredFolders = search
      ? folders.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || (f.children && f.children.some(c => c.name.toLowerCase().includes(search.toLowerCase()))))
      : folders;

    if (filteredFolders.length === 0) return null;

    return (
      <div className="flex flex-col w-full">
        {filteredFolders.map(folder => {
          const hasChildren = folder.children && folder.children.length > 0
          const isExpanded = search ? true : expanded[folder.id]

          return (
            <div key={folder.id}>
              <div
                className="flex items-center w-full hover:bg-slate-50 rounded-md px-2 py-1.5 group/folder cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasChildren) {
                    setExpanded(prev => ({ ...prev, [folder.id]: !prev[folder.id] }))
                  }
                }}
              >
                <div className="p-0.5 text-slate-400 group-hover/folder:text-slate-600 mr-1 flex-shrink-0">
                  {hasChildren ? (
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  ) : (
                    <span className="w-3.5 h-3.5 inline-block" />
                  )}
                </div>
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className={`text-sm truncate font-medium ${doc.folder_id === folder.id ? 'text-[#256D85]' : 'text-slate-700'}`}>
                    {folder.name}
                  </span>
                  <div className="flex items-center opacity-0 group-hover/folder:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMove(folder.id) }}
                      className="px-2 py-1 bg-[#78C6C9]/12 hover:bg-[#78C6C9]/20 text-[#256D85] text-[10px] font-semibold rounded uppercase tracking-wider mr-1"
                    >
                      Move
                    </button>
                    {doc.folder_id === folder.id && <Check className="w-4 h-4 text-[#256D85] ml-1" />}
                  </div>
                </div>
              </div>
              {hasChildren && isExpanded && (
                <div className="ml-5 border-l border-slate-100 pl-1 mt-0.5">
                  <FolderTree folders={folder.children!} workspaceId={workspaceId} depth={depth + 1} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const isUnassigned = !doc.folder_id && (!doc.workspace_id || doc.workspace_name === 'Private')

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded group transition-colors border ${isUnassigned
            ? 'bg-slate-50 hover:bg-slate-100 border-dashed border-slate-300 text-slate-400 hover:text-slate-600'
            : 'hover:bg-slate-100 border-transparent hover:border-slate-200'
          }`}
      >
        {isUnassigned ? (
          <>
            <Plus className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Add Location</span>
          </>
        ) : (
          <span className="text-slate-500 text-xs truncate max-w-[150px]">
            {doc.workspace_name}
            {doc.folder_name && <> <span className="opacity-50 mx-0.5">/</span> {doc.folder_name}</>}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-9 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-[320px] max-h-[400px] overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#256D85] focus:ring-1 focus:ring-[#78C6C9]"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {workspaces.map(ws => {
              if (search && !ws.name.toLowerCase().includes(search.toLowerCase()) && !ws.folders.some(f => f.name.toLowerCase().includes(search.toLowerCase()))) {
                return null;
              }
              return (
                <div key={ws.id} className="mb-2 last:mb-0">
                  <button
                    type="button"
                    onClick={() => {
                      moveDocument(doc.id, ws.id, null)
                        .then(() => {
                          onRefresh?.()
                          setOpen(false)
                        })
                        .catch((err) => console.error(err))
                    }}
                    className="mb-1 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <span className="truncate">{ws.name}</span>
                    {!doc.folder_id && doc.workspace_id === ws.id ? (
                      <Check className="w-4 h-4 text-[#256D85] ml-2 shrink-0" />
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#256D85]">Move</span>
                    )}
                  </button>
                  <FolderTree folders={ws.folders} workspaceId={ws.id} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
