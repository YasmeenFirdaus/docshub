'use client'

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { FileText, Folder, CheckCircle, Database, Search, Activity } from "lucide-react"

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(res => res.json())
      .then(setData)
  }, [])

  if (!data) return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-10 w-80 max-w-full rounded-xl skeleton-shimmer" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-36 rounded-2xl skeleton-shimmer" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-80 rounded-2xl skeleton-shimmer lg:col-span-2" />
          <div className="h-80 rounded-2xl skeleton-shimmer" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1E293B]">Workspace Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Live document activity, review health, and workspace usage.</p>
        </div>
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search documents, folders..."
            className="premium-control h-10 w-full rounded-lg pl-10 pr-4 text-sm"
          />
          <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 gap-1 sm:flex">
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">Ctrl</kbd>
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">K</kbd>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<FileText size={20} className="text-[#256D85]" />}
          bg="bg-[#78C6C9]/12"
          value={data.total_documents}
          label="Documents"
          sub="Accessible documents"
          badge="active"
        />
        <StatCard
          icon={<Folder size={20} className="text-[#256D85]" />}
          bg="bg-[#FAFAF9]"
          value={data.total_workspaces}
          label="Workspaces"
          sub={`${data.active_users} active users`}
          badge="team"
        />
        <StatCard
          icon={<CheckCircle size={20} className="text-amber-600" />}
          bg="bg-amber-50"
          value={data.pending_reviews}
          label="Pending reviews"
          sub="Review queue"
          badge="clear"
        />
        <StatCard
          icon={<Database size={20} className="text-emerald-600" />}
          bg="bg-emerald-50"
          value={`${(data.storage_bytes / (1024 * 1024)).toFixed(1)} MB`}
          label="Storage used"
          sub="Current usage"
          badge="tracked"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="premium-card rounded-2xl p-6 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Document activity</h3>
            <span className="text-sm font-medium text-[#256D85]">Analytics</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.activity_data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip
                  contentStyle={{ borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.12)' }}
                />
                <Line type="monotone" dataKey="docs" stroke="#4f46e5" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="premium-card flex flex-col rounded-2xl p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Review health</h3>
            <span className="text-sm font-medium text-[#256D85]">Open queue</span>
          </div>
          <div className="flex flex-1 items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-6">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-500">Pending approvals</p>
              <p className="text-4xl font-bold tracking-tight text-slate-900">{data.pending_reviews}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, bg, value, label, sub, badge }: any) {
  return (
    <div className="premium-card group relative rounded-2xl p-5 transition-transform hover:-translate-y-0.5">
      <div className="mb-4 flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
          {icon}
        </div>
        <span className="flex items-center rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
          <Activity className="mr-1 h-3 w-3" /> {badge}
        </span>
      </div>
      <h4 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">{value}</h4>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  )
}
