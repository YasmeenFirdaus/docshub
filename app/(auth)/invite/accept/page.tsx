'use client'

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Layers } from "lucide-react"

function InviteAcceptForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token) setError("Invalid invitation link.")
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const res = await fetch('/api/auth/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name, password })
    })

    if (res.ok) {
      router.push('/login')
    } else {
      const data = await res.json()
      setError(data.error || "Failed to set up account")
      setLoading(false)
    }
  }

  if (error) {
    return <div className="text-center text-red-500 font-medium">{error}</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Full Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-[#78C6C9]"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Set Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-[#78C6C9]"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#256D85] text-white p-3 rounded-lg font-medium hover:bg-[#1f5c70] disabled:opacity-50"
      >
        {loading ? "Creating Account..." : "Accept Invitation"}
      </button>
    </form>
  )
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#256D85] rounded-lg mx-auto mb-4 flex items-center justify-center text-white">
            <Layers size={24} />
          </div>
          <h2 className="text-2xl font-semibold">Join Workspace</h2>
          <p className="text-slate-500 mt-2 text-sm">Set up your account to accept the invite.</p>
        </div>
        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <InviteAcceptForm />
        </Suspense>
      </div>
    </div>
  )
}