'use client'

import { useState, useEffect } from 'react'
import { Link2, Download, Users } from 'lucide-react'
import type { DocumentRowData } from './types'

interface Props { 
  doc: DocumentRowData;
  onRefresh?: () => void;
}

interface Member {
  user: { id: string; name: string | null; email: string }
}

interface Share {
  id: string
  permission: 'VIEW' | 'EDIT'
  user: { id: string; name: string | null; email: string }
}

export function DocSharePanel({ doc, onRefresh }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [permission, setPermission] = useState<'VIEW' | 'EDIT'>('VIEW')
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState('')
  const [shares, setShares] = useState<Share[]>([])

  const loadShares = async () => {
    const res = await fetch(`/api/documents/${doc.id}/share`)
    if (!res.ok) return
    setShares(await res.json())
  }

  useEffect(() => {
    fetch(`/api/workspaces/${doc.workspace_id}/members`)
      .then((r) => r.json())
      .then(setMembers)
    void loadShares()
  }, [doc.id, doc.workspace_id])

  const shareWithUser = async () => {
    if (!selectedUser || selectedUser === doc.owner_id) return
    setSharing(true)
    const res = await fetch(`/api/documents/${doc.id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: selectedUser, permission }),
    })
    setSharing(false)
    setMessage(res.ok ? 'Document shared!' : 'Failed to share')
    setSelectedUser('')
    if (res.ok) {
      await loadShares()
      onRefresh?.()
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const updatePermission = async (userId: string, nextPermission: 'VIEW' | 'EDIT') => {
    const res = await fetch(`/api/documents/${doc.id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, permission: nextPermission }),
    })
    if (res.ok) {
      await loadShares()
      onRefresh?.()
    }
  }

  const removeShare = async (userId: string) => {
    const res = await fetch(`/api/documents/${doc.id}/share`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    if (res.ok) {
      await loadShares()
      onRefresh?.()
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/document/${doc.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportDoc = async (format: 'docx' | 'pdf') => {
    const res = await fetch(`/api/documents/${doc.id}/export?format=${format}`)
    if (!res.ok) { alert('Export failed'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.title}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-5 space-y-5 w-80">
      <p className="text-sm font-semibold text-slate-700">Share & Export</p>

      {/* Copy link */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Share Link</p>
        <button
          onClick={copyLink}
          className="w-full flex items-center gap-2.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition"
        >
          <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="flex-1 text-left truncate text-xs text-slate-500">
            {`${typeof window !== 'undefined' ? window.location.origin : ''}/document/${doc.id}`}
          </span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full transition ${copied ? 'bg-green-100 text-green-600' : 'bg-white border border-slate-200 text-slate-600'}`}>
            {copied ? 'Copied!' : 'Copy'}
          </span>
        </button>
      </div>

      {/* Share with member (all docs) */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Share explicitly with Member
        </p>
        <div className="space-y-2">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-indigo-400"
          >
            <option value="">Select member...</option>
            {members.map((m) => {
              const isOwner = m.user.id === doc.owner_id
              const alreadyShared = shares.some((share) => share.user.id === m.user.id)
              return (
              <option key={m.user.id} value={m.user.id} disabled={isOwner || alreadyShared}>
                {m.user.name ?? m.user.email}{isOwner ? ' (Owner)' : alreadyShared ? ' (Shared)' : ''}
              </option>
              )
            })}
          </select>
          <div className="flex gap-2">
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as 'VIEW' | 'EDIT')}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-indigo-400"
            >
              <option value="VIEW">View</option>
              <option value="EDIT">Edit</option>
            </select>
            <button
              onClick={shareWithUser}
              disabled={sharing || !selectedUser}
              className="flex-1 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium"
            >
              {sharing ? 'Sharing...' : 'Share'}
            </button>
          </div>
          {message && (
            <p className={`text-xs ${message.includes('shared') ? 'text-green-600' : 'text-red-500'}`}>
              {message}
            </p>
          )}
          {shares.length > 0 && (
            <div className="space-y-2 pt-2">
              {shares.map((share) => (
                <div key={share.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{share.user.name ?? share.user.email}</p>
                    <p className="truncate text-xs text-slate-400">{share.user.email}</p>
                  </div>
                  <select
                    value={share.permission}
                    onChange={(e) => updatePermission(share.user.id, e.target.value as 'VIEW' | 'EDIT')}
                    className="px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                  >
                    <option value="VIEW">View</option>
                    <option value="EDIT">Edit</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeShare(share.user.id)}
                    className="text-xs font-medium text-red-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Export */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Export & Download
        </p>
        <div className="space-y-2">
          <button
            onClick={() => exportDoc('docx')}
            className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 hover:bg-slate-100 transition"
          >
            <Download className="w-4 h-4 text-slate-400" />
            Download as .docx
          </button>
          <button
            onClick={() => exportDoc('pdf')}
            className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 hover:bg-slate-100 transition"
          >
            <Download className="w-4 h-4 text-slate-400" />
            Download as PDF
          </button>
        </div>
      </div>
    </div>
  )
}
