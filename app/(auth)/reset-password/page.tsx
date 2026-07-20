'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { KeyRound, Eye, EyeOff, ArrowLeft } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) { setError('Invalid or missing reset token.'); return }

    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reset password')
      }
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl mx-auto flex items-center justify-center">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-[#1E293B]">Password Reset Successful</h2>
        <p className="text-slate-500 text-sm">Your password has been updated. Redirecting to login...</p>
        <Link
          href="/login"
          className="arctic-primary inline-flex h-10 items-center justify-center rounded-lg px-6 text-sm font-semibold"
        >
          Go to Login
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-[#256D85] to-[#78C6C9] rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg">
          <KeyRound className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-[#1E293B]">Set New Password</h1>
        <p className="text-slate-500 text-sm mt-1">Please enter your new password below.</p>
      </div>

      {!token && (
        <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Missing token in URL. Please use the link sent to your email.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            New Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="premium-control h-10 w-full rounded-lg px-3 pr-10 text-sm"
              placeholder="••••••••"
              required
              minLength={8}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">Must be at least 8 characters.</p>
        </div>

        <button
          type="submit"
          disabled={loading || !token}
          className="arctic-primary h-10 w-full rounded-lg text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to login
          </Link>
        </div>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-[#F5F7F6] to-[#FAFAF9]">
      <div className="w-full max-w-md px-4">
        <div className="premium-card rounded-2xl p-8 animate-doc-fade-up">
          <Suspense fallback={<div className="text-center text-slate-400 text-sm py-8">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
