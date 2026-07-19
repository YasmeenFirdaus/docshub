'use client'

import { useState, useEffect } from "react"
import { Users, Mail, Shield, MoreVertical, Clock } from "lucide-react"
import { useSession } from "next-auth/react"

export default function MembersPage() {
  const { data: session } = useSession()
  const isAdminOrOwner = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'

  const [email, setEmail] = useState("")
  const [role, setRole] = useState("USER")
  
  const [users, setUsers] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch all members and invites
  const fetchMembers = async () => {
    const res = await fetch('/api/members')
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users || [])
      setInvitations(data.invitations || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isAdminOrOwner) return

    const res = await fetch('/api/members/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role })
    })

    if (res.ok) {
      alert(`Success! Invitation sent to ${email}`)
      setEmail("")
      // Refresh the table to show the new pending invite
      fetchMembers()
    } else {
      const errorData = await res.json()
      alert(`Error: ${errorData.error}`)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-800">Organization Members</h1>
        <p className="text-slate-500 mt-1">Manage team access, roles, and pending invitations.</p>
      </div>

      {/* Invite Section */}
      {isAdminOrOwner && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center">
            <Mail size={16} className="mr-2 text-slate-400" />
            Invite new member
          </h2>
          <form onSubmit={handleInvite} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Email address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com" 
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="w-48">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Role</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button 
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Send Invite
          </button>
        </form>
        </div>
      )}

      {/* Members & Invites List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3 text-right">Actions</th>
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
              <tr key={invite.id} className="hover:bg-slate-50 transition-colors bg-slate-50/50">
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
                  {invite.role === 'ADMIN' && <Shield size={14} className="text-indigo-500" />}
                  {invite.role === 'ADMIN' ? 'Admin' : 'User'}
                </td>
                <td className="px-6 py-4 text-right text-slate-400">
                  {isAdminOrOwner && (
                    <button 
                      onClick={async () => {
                          if (window.confirm("Are you sure you want to revoke this invitation?")) {
                          const res = await fetch(`/api/members/invite/${invite.id}`, { method: 'DELETE' })
                          if (res.ok) fetchMembers() // Refresh table to remove the deleted invite
                          }
                      }} 
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
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">{user.name || 'Unnamed User'}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 flex items-center gap-1.5">
                  {user.role === 'ADMIN' && <Shield size={14} className="text-indigo-500" />}
                  {user.role === 'ADMIN' ? 'Admin' : 'User'}
                </td>
                <td className="px-6 py-4 text-right text-slate-400">
                  {isAdminOrOwner && (
                    <button className="hover:text-slate-600">
                      <MoreVertical size={16} />
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
    </div>
  )
}