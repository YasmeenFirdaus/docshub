'use client'

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { FileText, Folder, CheckCircle, Database, Search } from "lucide-react"

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(res => res.json())
      .then(setData)
  }, [])

  if (!data) return <div className="p-8 text-slate-500">Loading dashboard...</div>

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Top Navbar Placeholder Area (Matches Screenshot) */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Your workspace at a glance.</h1>
        </div>
        <div className="relative w-96">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search documents, folders..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="absolute right-3 top-2.5 flex gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-500 font-mono border border-slate-200">⌘</kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-500 font-mono border border-slate-200">K</kbd>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard 
          icon={<FileText size={20} className="text-indigo-600" />} 
          bg="bg-indigo-50"
          value={data.total_documents} 
          label="Documents" 
          sub="Accessible documents" 
          badge="active"
        />
        <StatCard 
          icon={<Folder size={20} className="text-sky-600" />} 
          bg="bg-sky-50"
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

      {/* Charts & Health Row */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-slate-800">Document activity</h3>
            <span className="text-sm text-indigo-600 font-medium cursor-pointer">Analytics</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.activity_data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="docs" stroke="#5B50E8" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-1 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-slate-800">Review health</h3>
            <span className="text-sm text-indigo-600 font-medium cursor-pointer">Open queue</span>
          </div>
          <div className="flex-1 bg-slate-50 rounded-lg p-6 flex items-center justify-between border border-slate-100">
            <div>
              <p className="text-sm text-slate-500 font-medium mb-1">Pending approvals</p>
              <p className="text-4xl font-bold text-slate-800">{data.pending_reviews}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
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
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
          {icon}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded flex items-center">
          <span className="mr-1">↗</span> {badge}
        </span>
      </div>
      <div>
        <h4 className="text-2xl font-bold text-slate-800 mb-1">{value}</h4>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-500 mt-1">{sub}</p>
      </div>
    </div>
  )
}