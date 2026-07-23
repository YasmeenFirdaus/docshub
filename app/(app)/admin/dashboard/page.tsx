'use client'

import { useEffect, useState, useMemo } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { FileText, Folder, CheckCircle, Search, Activity, Users, FileSignature, Calendar, ShieldAlert, Share2 } from "lucide-react"
import Link from 'next/link'

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null)
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [recentDocs, setRecentDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [analyticsRes, activityRes, docsRes, membersRes, recentRes] = await Promise.all([
          fetch('/api/admin/analytics'),
          fetch('/api/admin/activity?limit=10'),
          fetch('/api/documents'),
          fetch('/api/members'),
          fetch('/api/documents?recent=true')
        ])
        
        const analytics = await analyticsRes.json()
        const activity = await activityRes.json()
        const docsData = await docsRes.json()
        const membersData = await membersRes.json()
        const recentData = await recentRes.json()

        setData(analytics)
        setActivityLogs(activity.logs || [])
        setDocs(Array.isArray(docsData) ? docsData : docsData.documents || [])
        setMembers(Array.isArray(membersData) ? membersData : membersData.members || membersData.users || [])
        setRecentDocs(Array.isArray(recentData) ? recentData : recentData.documents || [])
      } catch (err) {
        console.error("Failed to load admin dashboard data", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Derived state
  const { workspacePendingReviews, approvedCount, draftCount, memberHealth } = useMemo(() => {
    const pending: any[] = []
    let approved = 0
    let draft = 0
    
    docs.forEach(doc => {
      const status = (doc.status || '').toUpperCase()
      if (status === 'PUBLISHED') approved++
      else if (status === 'DRAFT' || status === 'PRIVATE') draft++

      // Workspace pending reviews
      if (doc.review_requests?.some((r: any) => r.status === 'PENDING')) {
        pending.push(doc)
      }
    })

    const health = { active: 0, invited: 0, inactive: 0 }
    members.forEach(m => {
      const status = (m.status || '').toUpperCase()
      if (status === 'ACTIVE') health.active++
      else if (status === 'INVITED' || status === 'PENDING') health.invited++
      else health.inactive++
    })

    return {
      workspacePendingReviews: pending.slice(0, 5),
      approvedCount: approved,
      draftCount: draft,
      memberHealth: health
    }
  }, [docs, members])

  if (loading || !data) return (
    <div className="mx-auto max-w-[1500px] p-5 lg:p-8 space-y-6">
      <div className="h-10 w-80 max-w-full rounded-xl skeleton-shimmer" />
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl skeleton-shimmer" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_450px]">
        <div className="h-96 rounded-2xl skeleton-shimmer" />
        <div className="h-96 rounded-2xl skeleton-shimmer" />
      </div>
    </div>
  )

  // Use real data from backend
  const chartData = data.activity_data || []

  // Calculate dynamic ticks for Y axis (always multiples of 10, minimum max of 30)
  const maxVal = Math.max(
    30,
    ...chartData.flatMap((d: any) => [d.Created || 0, d.Reviewed || 0, d.Shared || 0])
  );
  const roundedMax = Math.ceil(maxVal / 10) * 10;
  const tickStep = roundedMax > 50 ? Math.ceil(roundedMax / 4 / 10) * 10 : 10;
  const yAxisTicks = [];
  for (let i = 0; i <= roundedMax; i += tickStep) {
    yAxisTicks.push(i);
  }

  // Create date range string
  const today = new Date()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(today.getDate() - 6)
  const dateRangeStr = `${sevenDaysAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-5 lg:p-8 overflow-y-auto h-full">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1E293B]">
            Welcome back, Admin 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">Here's an overview of your workspace today.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 font-medium shadow-sm">
            {dateRangeStr}
            <Calendar size={14} className="ml-2 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Top Metrics Strip */}
      <div className="mb-8 premium-card rounded-2xl bg-white border border-slate-200 p-2 shadow-sm grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <MetricItem
          icon={<FileText size={20} className="text-[#256D85]" />}
          bg="bg-[#78C6C9]/12"
          value={data.total_documents}
          label="Total Documents"
        />
        <MetricItem
          icon={<Users size={20} className="text-amber-600" />}
          bg="bg-amber-50"
          value={members.length}
          label="Total Members"
        />
        <MetricItem
          icon={<FileSignature size={20} className="text-emerald-600" />}
          bg="bg-emerald-50"
          value={data.pending_reviews}
          label="Pending Reviews"
        />
        <MetricItem
          icon={<Share2 size={20} className="text-purple-600" />}
          bg="bg-purple-50"
          value={data.shared_documents || 0}
          label="Shared"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_450px]">
        {/* Left Column */}
        <div className="space-y-6 flex flex-col h-full">
          {/* Chart */}
          <div className="premium-card rounded-2xl p-6 bg-white border border-slate-200 shadow-sm flex flex-col h-[400px]">
            <div className="mb-6 flex flex-col shrink-0 gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Workspace Activity (All Members)</h3>
                <span className="text-xs font-semibold text-slate-500">Last 7 days</span>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#256D85]"></div><span className="text-xs font-semibold text-slate-600">Created</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div><span className="text-xs font-semibold text-slate-600">Reviewed</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]"></div><span className="text-xs font-semibold text-slate-600">Shared</span></div>
              </div>
            </div>
            
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#256D85" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#256D85" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorReviewed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorShared" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} minTickGap={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} ticks={yAxisTicks} domain={[0, roundedMax]} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', fontSize: '12px', background: 'rgba(255, 255, 255, 0.95)' }}
                  />
                  <Area type="monotone" dataKey="Created" stroke="#256D85" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCreated)" dot={{ r: 0 }} activeDot={{ r: 5, fill: "#256D85", stroke: "#fff", strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="Reviewed" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorReviewed)" dot={{ r: 0 }} activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="Shared" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorShared)" dot={{ r: 0 }} activeDot={{ r: 5, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Review Queue */}
          <div className="premium-card rounded-2xl p-6 bg-white border border-slate-100 flex flex-col h-80">
            <div className="mb-4 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-slate-900">Review Queue (Workspace)</h3>
              <Link href="/all-docs" className="text-xs font-semibold text-[#256D85] hover:underline">View all</Link>
            </div>
            
            <div className="overflow-y-auto pr-2">
              <table className="w-full text-sm text-left">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-2 font-semibold">Document</th>
                    <th className="pb-2 font-semibold text-center">Status</th>
                    <th className="pb-2 font-semibold text-right">Reviewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {workspacePendingReviews.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-500">No pending reviews.</td>
                    </tr>
                  ) : (
                    workspacePendingReviews.map((doc: any) => (
                      <tr key={doc.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5">
                          <span className="font-medium text-slate-800">{doc.title || 'Untitled'}</span>
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide border bg-amber-50 text-amber-600 border-amber-100`}>
                            Pending
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-slate-700 text-xs font-medium">
                          {doc.review_requests?.[0]?.reviewer?.name || doc.owner?.name || 'Unassigned'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 flex flex-col h-full">
          {/* Recent Workspace Activity */}
          <div className="premium-card rounded-2xl p-6 bg-white border border-slate-100 flex flex-col h-[400px]">
            <div className="mb-5 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-slate-900">Recent Workspace Activity</h3>
              <Link href="/settings/analytics" className="text-xs font-semibold text-[#256D85] hover:underline">View all</Link>
            </div>
            <div className="overflow-y-auto pr-2 space-y-5">
              {activityLogs.length === 0 ? (
                <div className="text-sm text-slate-500 italic py-4">No recent activity.</div>
              ) : (
                activityLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      {log.user?.avatar_url ? (
                        <img src={log.user.avatar_url} alt="" className="h-7 w-7 rounded-full shrink-0 object-cover" />
                      ) : (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                          {log.user?.name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <p className="text-sm text-slate-700 leading-snug">
                        <span className="font-semibold text-slate-900">{log.user?.name || 'System'}</span> {log.story.toLowerCase()} <span className="font-medium text-slate-900">"{(log.meta as any)?.resource_label || 'Document'}"</span>
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400 whitespace-nowrap ml-4">
                       {new Date(log.created_at).toLocaleDateString() === new Date().toLocaleDateString() ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(log.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Workspace Members Compact Table */}
          <div className="premium-card rounded-2xl p-6 bg-white border border-slate-100 flex flex-col h-80 overflow-y-auto">
            <div className="mb-5 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-slate-900">Workspace Members</h3>
              <Link href="/settings/members" className="text-xs font-semibold text-[#256D85] hover:underline">Manage all</Link>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Users size={16} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Active</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-slate-900">{memberHealth.active}</span>
                  <Link href="/settings/members" className="text-[11px] font-bold text-[#256D85] bg-[#78C6C9]/10 px-2 py-1 rounded-md hover:bg-[#78C6C9]/20 transition-colors">Manage</Link>
                </div>
              </div>
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Folder size={16} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Invited / Pending</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-slate-900">{memberHealth.invited}</span>
                  <Link href="/settings/members" className="text-[11px] font-bold text-[#256D85] bg-[#78C6C9]/10 px-2 py-1 rounded-md hover:bg-[#78C6C9]/20 transition-colors">Manage</Link>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <ShieldAlert size={16} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Inactive</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-slate-900">{memberHealth.inactive}</span>
                  <Link href="/settings/members" className="text-[11px] font-bold text-[#256D85] bg-[#78C6C9]/10 px-2 py-1 rounded-md hover:bg-[#78C6C9]/20 transition-colors">Manage</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricItem({ icon, label, value, bg }: any) {
  return (
    <div className="flex items-start gap-4 p-4 transition-colors hover:bg-slate-50/50">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bg}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <h4 className="text-2xl font-bold tracking-tight text-slate-900 leading-none mb-1">{value}</h4>
        <p className="text-[13px] font-semibold text-slate-600">{label}</p>
      </div>
    </div>
  )
}
