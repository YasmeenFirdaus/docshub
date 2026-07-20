'use client'

'use client'

import { useState, useEffect } from "react"
import { Users, Mail, Shield, MoreVertical, Clock, Plus, X } from "lucide-react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useSidebarStore } from "@/stores/sidebar.store"

export default function MembersPage() {
  const { data: session } = useSession()
  const isAdminOrOwner = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'
  const { activeWorkspaceId } = useSidebarStore()

  const [email, setEmail] = useState("")
  const [role, setRole] = useState("USER")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [notice, setNotice] = useState("")
  
  const [users, setUsers] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch all members and invites
  const fetchMembers = async () => {
    if (!activeWorkspaceId) return; // Wait until workspace is loaded
    const res = await fetch(`/api/members?workspaceId=${activeWorkspaceId}`)
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users || [])
      setInvitations(data.invitations || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMembers()
  }, [activeWorkspaceId])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isAdminOrOwner) return

    const res = await fetch('/api/members/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role, workspace_id: activeWorkspaceId })
    })

    if (res.ok) {
      setNotice(`Invitation sent to ${email}`)
      setEmail("")
      setInviteOpen(false)
      // Refresh the table to show the new pending invite
      fetchMembers()
    } else {
      const errorData = await res.json()
      setNotice(errorData.error || "Invitation failed")
    }
  }

  const confirmRevoke = async () => {
    if (!revokeTargetId || isRevoking) return
    setIsRevoking(true)
    try {
      const res = await fetch(`/api/members/invite/${revokeTargetId}`, { method: 'DELETE' })
      if (res.ok) fetchMembers() // Refresh table to remove the deleted invite
    } finally {
      setIsRevoking(false)
      setRevokeTargetId(null)
    }
  }

  const handleUpdateUser = async (id: string, updates: any) => {
    const res = await fetch(`/api/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    if (res.ok) fetchMembers()
    else {
      const err = await res.json()
      setNotice(err.error || "Update failed")
    }
  }

  const handleDeleteUser = (id: string) => {
    setDeleteTargetId(id)
  }

  const confirmDelete = async () => {
    if (!deleteTargetId || isDeleting) return
    setIsDeleting(true)
    try {
      const url = activeWorkspaceId 
        ? `/api/members/${deleteTargetId}?workspaceId=${activeWorkspaceId}` 
        : `/api/members/${deleteTargetId}`
      const res = await fetch(url, { method: 'DELETE' })
      if (res.ok) fetchMembers()
      else {
        const err = await res.json()
        setNotice(err.error || "Delete failed")
      }
    } finally {
      setIsDeleting(false)
      setDeleteTargetId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-5 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1E293B]">Organization Members</h1>
          <p className="mt-1 text-sm text-slate-500">Manage team access, roles, and pending invitations.</p>
        </div>
        {isAdminOrOwner && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="arctic-primary flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition hover:-translate-y-px"
          >
            <Plus size={16} />
            Invite Member
          </button>
        )}
      </div>

      {notice && (
        <div className="mb-5 rounded-xl border border-[#78C6C9]/30 bg-[#78C6C9]/12 px-4 py-3 text-sm font-medium text-[#256D85]">
          {notice}
        </div>
      )}

      {/* Members & Invites List */}
      <div className="premium-card overflow-hidden rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-6 py-3.5">User</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Role</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            
            {loading && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Loading members...</td>
              </tr>
            )}

            {/* Render Pending Invitations */}
            {!loading && invitations.map((invite) => (
              <tr key={invite.id} className="bg-slate-50/40 transition-colors hover:bg-[#78C6C9]/10">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center font-bold">
                    <Mail size={14} />
                  </div>
                  <div>
                    <div className="font-medium text-slate-600 italic">Pending Invite</div>
                    <div className="text-xs text-slate-500">{invite.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock size={12} className="mr-1" /> Pending
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 flex items-center gap-1.5">
                  {invite.role === 'ADMIN' && <Shield size={14} className="text-[#256D85]" />}
                  {invite.role === 'ADMIN' ? 'Admin' : 'User'}
                </td>
                <td className="px-6 py-4 text-right text-slate-400">
                  {isAdminOrOwner && (
                    <button 
                      onClick={() => setRevokeTargetId(invite.id)} 
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {/* Render Active Users */}
            {!loading && users.map((user) => (
              <tr key={user.id} className="transition-colors hover:bg-[#78C6C9]/10">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#78C6C9]/18 text-[#256D85] rounded-full flex items-center justify-center font-bold">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">{user.name || 'Unnamed User'}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {isAdminOrOwner && user.id !== session?.user?.id ? (
                    <select 
                      value={user.status || 'ACTIVE'} 
                      onChange={(e) => handleUpdateUser(user.id, { status: e.target.value })}
                      className="text-xs border border-slate-200 rounded px-2 py-1 bg-white outline-none focus:border-[#256D85]"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.status === 'INACTIVE' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'} border`}>
                      {user.status === 'INACTIVE' ? 'Inactive' : 'Active'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-600 flex items-center gap-1.5">
                  {user.role === 'ADMIN' && <Shield size={14} className="text-[#256D85]" />}
                  {isAdminOrOwner && user.id !== session?.user?.id ? (
                    <select 
                      value={user.role} 
                      onChange={(e) => handleUpdateUser(user.id, { role: e.target.value })}
                      className="text-xs border border-slate-200 rounded px-2 py-1 bg-white outline-none focus:border-[#256D85]"
                    >
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  ) : (
                    user.role === 'ADMIN' ? 'Admin' : 'User'
                  )}
                </td>
                <td className="px-6 py-4 text-right text-slate-400">
                  {isAdminOrOwner && user.id !== session?.user?.id && (
                    <button onClick={() => handleDeleteUser(user.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {!loading && users.length === 0 && invitations.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No members found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/24 p-4 backdrop-blur-sm">
          <div className="premium-card w-full max-w-md rounded-2xl animate-doc-fade-up">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#1E293B]">Invite new member</h2>
                <p className="mt-1 text-sm text-slate-500">Send an email invitation with the selected role.</p>
              </div>
              <button onClick={() => setInviteOpen(false)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="premium-control h-10 w-full rounded-lg px-3 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="premium-control h-10 w-full rounded-lg px-3 text-sm"
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setInviteOpen(false)} className="premium-control h-10 rounded-lg px-4 text-sm font-semibold text-slate-700">
                  Cancel
                </button>
                <button type="submit" className="arctic-primary h-10 rounded-lg px-4 text-sm font-semibold transition">
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Dialog open={!!revokeTargetId} onOpenChange={(isOpen) => !isOpen && setRevokeTargetId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke this invitation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setRevokeTargetId(null)}
              disabled={isRevoking}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRevoke}
              disabled={isRevoking}
              variant="destructive"
            >
              {isRevoking ? 'Revoking...' : 'Revoke'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTargetId} onOpenChange={(isOpen) => !isOpen && setDeleteTargetId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member from the workspace? They will lose access to all documents here.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteTargetId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? 'Removing...' : 'Remove'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
