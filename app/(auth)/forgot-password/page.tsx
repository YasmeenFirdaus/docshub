'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-[#F5F7F6] to-[#FAFAF9]">
      <div className="w-full max-w-md px-4">
        <div className="premium-card rounded-2xl p-8 animate-doc-fade-up">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-[#256D85] to-[#78C6C9] rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-[#1E293B]">Reset your password</h1>
            <p className="text-slate-500 text-sm mt-1">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          {sent ? (
            <div className="space-y-4 text-center">
              <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                If an account exists for <strong>{email}</strong>, a reset link has been sent. Check your inbox.
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-[#256D85] hover:underline mt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="premium-control h-10 w-full rounded-lg px-3 text-sm"
                  placeholder="you@company.com"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="arctic-primary h-10 w-full rounded-lg text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send reset link'}
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
          )}
        </div>
      </div>
    </div>
  )
}
