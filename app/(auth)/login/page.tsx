'use client'

// 1. Added getSession to the import here
import { signIn, getSession } from "next-auth/react" 
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 1. Sign in but PREVENT automatic redirection
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false, 
    })

    if (res?.error) {
      setError("Invalid email or password")
      return
    } 
    
    if (res?.ok) {
      // 2. Fetch the session to see who just logged in
      const session = await getSession() as any
      
      // 3. Route based on their database role
      if (session?.user?.role === 'ADMIN') {
        router.push("/admin/dashboard")
      } else {
        router.push("/home")
      }
    }
  } // <--- 2. Added this missing closing bracket for handleSubmit!

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#256D85] rounded-lg mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl">
            DH
          </div>
          <h2 className="text-2xl font-semibold">DocHub</h2>
          <p className="text-slate-500 mt-2 text-sm">Sign in to your workspace</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#256D85] focus:ring-1 focus:ring-[#78C6C9]"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#256D85] focus:ring-1 focus:ring-[#78C6C9] pr-10"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-[#256D85] hover:underline">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            className="w-full bg-[#256D85] text-white p-3 rounded-lg font-medium hover:bg-[#1f5c70] transition-colors"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}