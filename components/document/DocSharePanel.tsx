'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Link2,
  Loader2,
  MoreHorizontal,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import type { DocumentRowData } from './types'
import { cn } from '@/lib/utils'

type Permission = 'VIEW' | 'EDIT'

type ShareableDoc = Pick<DocumentRowData, 'id' | 'title' | 'workspace_id' | 'owner_id'> & {
  type?: string
}

interface Props {
  doc: ShareableDoc
  onClose?: () => void
  onRefresh?: () => void
}

interface Member {
  role?: string
  user: {
    id: string
    name: string | null
    email: string
    avatar_url?: string | null
    role?: string
  }
}

interface Share {
  id: string
  permission: Permission
  user: {
    id: string
    name: string | null
    email: string
    avatar_url?: string | null
  }
}

type SelectedMember = {
  user: Member['user']
  workspaceRole?: string
  permission: Permission
}

const permissionLabels: Record<Permission, string> = {
  VIEW: 'Viewer',
  EDIT: 'Editor',
}

function initials(name?: string | null, email?: string) {
  const label = name?.trim() || email || '?'
  return label.charAt(0).toUpperCase()
}

function normalizeMembers(data: unknown): Member[] {
  const rows = Array.isArray(data) ? data : (data as any)?.members ?? []
  return rows
    .map((item: any) => ({
      role: item?.role,
      user: item?.user ?? item,
    }))
    .filter((item: Member) => typeof item.user?.id === 'string')
}

function memberLabel(member: Member['user']) {
  return member.name?.trim() || member.email
}

export function DocSharePanel({ doc, onClose, onRefresh }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [shares, setShares] = useState<Share[]>([])
  const [selected, setSelected] = useState<SelectedMember[]>([])
  const [search, setSearch] = useState('')
  const [membersLoading, setMembersLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState<Share | null>(null)

  const documentUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/document/${doc.id}`

  const loadShares = async () => {
    const res = await fetch(`/api/documents/${doc.id}/share`)
    if (!res.ok) return
    setShares(await res.json())
  }

  useEffect(() => {
    let alive = true
    setMembersLoading(true)
    fetch(`/api/workspaces/${doc.workspace_id}/members`)
      .then((r) => r.json())
      .then((data) => {
        if (alive) setMembers(normalizeMembers(data))
      })
      .catch(() => {
        if (alive) setMembers([])
      })
      .finally(() => {
        if (alive) setMembersLoading(false)
      })
    void loadShares()
    return () => {
      alive = false
    }
  }, [doc.id, doc.workspace_id])

  const selectedIds = useMemo(() => new Set(selected.map((item) => item.user.id)), [selected])
  const sharedIds = useMemo(() => new Set(shares.map((share) => share.user.id)), [shares])

  const filteredMembers = members.filter((member) => {
    const haystack = `${member.user.name ?? ''} ${member.user.email}`.toLowerCase()
    return haystack.includes(search.trim().toLowerCase())
  })

  const suggestedMembers = filteredMembers.filter(
    (member) => member.user.id !== doc.owner_id && !selectedIds.has(member.user.id),
  )

  const selectMember = (member: Member) => {
    if (member.user.id === doc.owner_id) return
    setSelected((prev) => {
      if (prev.some((item) => item.user.id === member.user.id)) return prev
      const existingShare = shares.find((share) => share.user.id === member.user.id)
      return [
        ...prev,
        {
          user: member.user,
          workspaceRole: member.role ?? member.user.role,
          permission: existingShare?.permission ?? 'VIEW',
        },
      ]
    })
    setSearch('')
  }

  const updateSelectedPermission = (userId: string, permission: Permission) => {
    setSelected((prev) => prev.map((item) => item.user.id === userId ? { ...item, permission } : item))
  }

  const removeSelected = (userId: string) => {
    setSelected((prev) => prev.filter((item) => item.user.id !== userId))
  }

  const shareWithUsers = async () => {
    if (selected.length === 0 || sharing) return
    setSharing(true)
    setNotice(null)
    try {
      for (const item of selected) {
        const res = await fetch(`/api/documents/${doc.id}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: item.user.id, permission: item.permission }),
        })
        if (!res.ok) throw new Error('Failed to share document')
      }
      setNotice({
        type: 'success',
        text: `Access updated. ${selected.length} ${selected.length === 1 ? 'person can' : 'people can'} now access this document.`,
      })
      setSelected([])
      await loadShares()
      onRefresh?.()
    } catch {
      setNotice({ type: 'error', text: 'Failed to share. Please try again.' })
    } finally {
      setSharing(false)
    }
  }

  const updatePermission = async (userId: string, nextPermission: Permission) => {
    const res = await fetch(`/api/documents/${doc.id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, permission: nextPermission }),
    })
    if (res.ok) {
      setNotice({ type: 'success', text: 'Permission updated.' })
      await loadShares()
      onRefresh?.()
    } else {
      setNotice({ type: 'error', text: 'Failed to update permission.' })
    }
  }

  const removeShare = async (share: Share) => {
    const res = await fetch(`/api/documents/${doc.id}/share`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: share.user.id }),
    })
    if (res.ok) {
      setNotice({ type: 'success', text: 'Access removed.' })
      setOpenMenu(null)
      setPendingRemove(null)
      await loadShares()
      onRefresh?.()
    } else {
      setNotice({ type: 'error', text: 'Failed to remove access.' })
    }
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(documentUrl)
    setCopied(true)
    setNotice({ type: 'success', text: 'Link copied.' })
    setTimeout(() => setCopied(false), 2000)
  }

  const copyEmail = async (email: string) => {
    await navigator.clipboard.writeText(email)
    setOpenMenu(null)
    setNotice({ type: 'success', text: 'Email copied.' })
  }

  const exportDoc = async (format: 'docx' | 'pdf') => {
    const res = await fetch(`/api/documents/${doc.id}/export?format=${format}`)
    if (!res.ok) {
      setNotice({ type: 'error', text: 'Export failed.' })
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.title}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-h-[min(88vh,720px)] w-full overflow-y-auto bg-white">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#E7ECEA] bg-white/88 px-5 py-4 backdrop-blur-xl">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-[#1E293B]">Share & Export</h2>
          <p className="mt-1 truncate text-sm text-slate-500">{doc.title}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-[#F5F7F6] hover:text-slate-700"
            aria-label="Close share modal"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-4 px-5 py-4">
        {notice && (
          <div
            className={cn(
              'flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm animate-doc-fade-up',
              notice.type === 'success'
                ? 'border-[#83AF78]/30 bg-[#83AF78]/10 text-[#35623b]'
                : 'border-[#D96B6B]/30 bg-[#D96B6B]/10 text-[#9f3c3c]',
            )}
          >
            {notice.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <X className="mt-0.5 h-4 w-4" />}
            <span>{notice.text}</span>
          </div>
        )}

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1E293B]">
            <Link2 className="h-4 w-4 text-[#256D85]" />
            Share Link
          </div>
          <p className="text-xs text-slate-500">Only people with access can view</p>
          <div className="premium-control flex h-10 items-center gap-3 rounded-xl px-3">
            <span className="min-w-0 flex-1 truncate text-sm text-slate-500">{documentUrl}</span>
            <button
              type="button"
              onClick={copyLink}
              className="rounded-lg border border-[#E7ECEA] bg-white px-3 py-1.5 text-xs font-semibold text-[#1E293B] shadow-sm transition hover:bg-[#F5F7F6]"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </section>

        <section className="space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1E293B]">
            <Users className="h-4 w-4 text-[#256D85]" />
            Share with people
          </div>
          <div className="flex h-10 items-center gap-2 rounded-xl bg-[#FAFAF9] px-3 ring-1 ring-[#E7ECEA] transition focus-within:ring-2 focus-within:ring-[#78C6C9]/45">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="h-full flex-1 bg-transparent text-sm text-[#1E293B] outline-none placeholder:text-slate-400"
            />
          </div>

          {selected.length > 0 && (
            <div className="space-y-2 animate-doc-fade-up">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Selected ({selected.length})</p>
              {selected.map((item) => (
                <MemberRow
                  key={item.user.id}
                  user={item.user}
                  badge={item.workspaceRole}
                  right={
                    <div className="flex items-center gap-2">
                      <PermissionSelect value={item.permission} onChange={(permission) => updateSelectedPermission(item.user.id, permission)} />
                      <button
                        type="button"
                        onClick={() => removeSelected(item.user.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-[#F5F7F6] hover:text-slate-700"
                        aria-label={`Remove ${memberLabel(item.user)}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  }
                  selected
                />
              ))}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Suggested</p>
            {membersLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-12 rounded-xl skeleton-shimmer" />
                ))}
              </div>
            ) : suggestedMembers.length > 0 ? (
              <div className="space-y-1.5">
                {suggestedMembers.slice(0, 6).map((member) => {
                  const alreadyShared = sharedIds.has(member.user.id)
                  return (
                    <button
                      key={member.user.id}
                      type="button"
                      onClick={() => selectMember(member)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition hover:bg-[#F5F7F6]"
                    >
                      <Avatar user={member.user} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-[#1E293B]">{memberLabel(member.user)}</p>
                          {(member.role || member.user.role) && <Badge>{member.role || member.user.role}</Badge>}
                        </div>
                        <p className="truncate text-xs text-slate-500">{member.user.email}</p>
                      </div>
                      <span className="text-xs font-medium text-slate-500">
                        {alreadyShared ? 'Has access' : 'Select'}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="rounded-xl bg-[#FAFAF9] px-4 py-4 text-center text-sm text-slate-500">No members found.</p>
            )}
          </div>
        </section>

        {shares.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">People with Access ({shares.length})</p>
            <div className="space-y-1.5">
              {shares.map((share) => (
                <MemberRow
                  key={share.id}
                  user={share.user}
                  right={
                    <div className="flex items-center gap-2">
                      <PermissionSelect value={share.permission} onChange={(permission) => updatePermission(share.user.id, permission)} />
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenMenu(openMenu === share.id ? null : share.id)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-[#F5F7F6] hover:text-slate-700"
                          aria-label={`More actions for ${memberLabel(share.user)}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {openMenu === share.id && (
                          <div className="premium-card absolute right-0 top-8 z-20 w-40 rounded-xl p-1 animate-doc-fade-up">
                            <MenuButton icon={<Copy className="h-3.5 w-3.5" />} onClick={() => copyEmail(share.user.email)}>
                              Copy Email
                            </MenuButton>
                            <MenuButton danger icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => { setPendingRemove(share); setOpenMenu(null) }}>
                              Remove Access
                            </MenuButton>
                          </div>
                        )}
                      </div>
                    </div>
                  }
                />
              ))}
            </div>
          </section>
        )}

        {pendingRemove && (
          <section className="rounded-xl border border-[#D96B6B]/30 bg-[#D96B6B]/10 p-3 animate-doc-fade-up">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-4 w-4 text-[#D96B6B]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#1E293B]">
                  Remove {memberLabel(pendingRemove.user)}'s access?
                </p>
                <p className="mt-1 text-xs text-slate-600">They will no longer be able to access this document through sharing.</p>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingRemove(null)}
                className="h-9 rounded-lg border border-[#E7ECEA] bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-[#F5F7F6]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => removeShare(pendingRemove)}
                className="h-9 rounded-lg bg-[#D96B6B] px-3 text-xs font-semibold text-white transition hover:bg-[#c55f5f]"
              >
                Remove
              </button>
            </div>
          </section>
        )}

        <section className="space-y-1.5 border-t border-[#E7ECEA] pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Export</p>
          <button
            type="button"
            onClick={() => exportDoc('docx')}
            className="flex w-full items-center gap-3 rounded-xl border border-[#E7ECEA] bg-white px-3 py-2.5 text-sm font-medium text-[#1E293B] transition hover:bg-[#F5F7F6]"
          >
            <FileText className="h-4 w-4 text-[#256D85]" />
            Download DOCX
          </button>
          <button
            type="button"
            onClick={() => exportDoc('pdf')}
            className="flex w-full items-center gap-3 rounded-xl border border-[#E7ECEA] bg-white px-3 py-2.5 text-sm font-medium text-[#1E293B] transition hover:bg-[#F5F7F6]"
          >
            <Download className="h-4 w-4 text-[#256D85]" />
            Download PDF
          </button>
        </section>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-[#E7ECEA] bg-white/88 px-5 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-xl border border-[#E7ECEA] bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-[#F5F7F6]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={shareWithUsers}
          disabled={selected.length === 0 || sharing}
          className="arctic-primary flex h-10 min-w-[120px] items-center justify-center rounded-xl px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"
        >
          {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Share${selected.length > 0 ? ` (${selected.length})` : ''}`}
        </button>
      </div>
    </div>
  )
}

function PermissionSelect({ value, onChange }: { value: Permission; onChange: (value: Permission) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Permission)}
      className="premium-control h-8 rounded-lg px-2.5 text-xs font-semibold text-[#1E293B]"
    >
      <option value="VIEW">{permissionLabels.VIEW}</option>
      <option value="EDIT">{permissionLabels.EDIT}</option>
    </select>
  )
}

function Avatar({ user }: { user: Member['user'] }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E7ECEA] bg-[#78C6C9]/18 text-xs font-semibold uppercase text-[#256D85]">
      {initials(user.name, user.email)}
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-[#78C6C9]/12 px-1.5 py-0.5 text-[10px] font-semibold text-[#256D85]">
      {children}
    </span>
  )
}

function MemberRow({
  user,
  badge,
  right,
  selected,
}: {
  user: Member['user']
  badge?: string
  right: React.ReactNode
  selected?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-xl border px-2.5 py-1.5 transition',
        selected ? 'border-[#78C6C9]/45 bg-[#78C6C9]/10' : 'border-[#E7ECEA] bg-white',
      )}
    >
      <Avatar user={user} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-[#1E293B]">{memberLabel(user)}</p>
          {badge && <Badge>{badge}</Badge>}
        </div>
        <p className="truncate text-xs text-slate-500">{user.email}</p>
      </div>
      {right}
    </div>
  )
}

function MenuButton({
  children,
  icon,
  danger,
  onClick,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition hover:bg-[#F5F7F6]',
        danger ? 'text-[#D96B6B]' : 'text-slate-700',
      )}
    >
      {icon}
      {children}
    </button>
  )
}
