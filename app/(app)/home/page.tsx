'use client'

import { useEffect, useState, useMemo } from 'react'
import { FileText, Clock, Share2, Star, CheckCircle, Bell, Search, Layers, FileSignature, ArrowRight, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

export default function MemberDashboard() {
  const { data: session } = useSession()
  const [docs, setDocs] = useState<any[]>([])
  const [recentDocs, setRecentDocs] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [docsRes, recentRes, notifRes] = await Promise.all([
          fetch('/api/documents'),
          fetch('/api/documents?recent=true'),
          fetch('/api/notifications')
        ])
        
        const docsData = await docsRes.json()
        const recentData = await recentRes.json()
        const notifData = await notifRes.json()

        setDocs(Array.isArray(docsData) ? docsData : docsData.documents || [])
        setRecentDocs(Array.isArray(recentData) ? recentData : recentData.documents || [])
        setNotifications(notifData.notifications || [])
      } catch (err) {
        console.error("Dashboard data load failed", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Derived state
  const { myDocsCount, pendingReviewsCount, approvedCount, draftCount, pendingReviewList } = useMemo(() => {
    let myDocs = 0
    let pending = 0
    let approved = 0
    let draft = 0
    const pendingList: any[] = []

    docs.forEach(doc => {
      const isOwner = doc.owner_id === session?.user?.id
      if (isOwner) myDocs++

      const status = (doc.status || '').toUpperCase()
      if (status === 'PUBLISHED') approved++
      else if (status === 'DRAFT' || status === 'PRIVATE') draft++

      // Check if user is a reviewer and it's pending
      const isReviewer = doc.review_requests?.some((r: any) => r.reviewer?.id === session?.user?.id && r.status === 'PENDING')
      if (isReviewer) {
        pending++
        pendingList.push(doc)
      }
    })

    return {
      myDocsCount: myDocs,
      pendingReviewsCount: pending,
      approvedCount: approved,
      draftCount: draft,
      pendingReviewList: pendingList
    }
  }, [docs, session?.user?.id])

  if (loading) {
    return (
      <div className="mx-auto flex h-full max-w-[1500px] flex-col p-5 lg:p-8 space-y-6">
        <div className="h-8 w-64 rounded-lg skeleton-shimmer" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl skeleton-shimmer" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="h-80 rounded-2xl skeleton-shimmer" />
          <div className="h-80 rounded-2xl skeleton-shimmer" />
        </div>
      </div>
    )
  }

  const firstName = session?.user?.name?.split(' ')[0] || 'Member'
  
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  // Create date range string
  const today = new Date()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(today.getDate() - 6)
  const dateRangeStr = `${sevenDaysAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="mx-auto flex h-full max-w-[1500px] flex-col p-5 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1E293B]">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">Here's your personal overview.</p>
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
          icon={<FileText className="text-[#256D85]" size={20} />} 
          label="My Documents" 
          value={myDocsCount} 
          bg="bg-[#78C6C9]/12" 
        />
        <MetricItem 
          icon={<FileSignature className="text-amber-600" size={20} />} 
          label="Pending Reviews" 
          value={pendingReviewsCount} 
          bg="bg-amber-50" 
        />
        <MetricItem 
          icon={<CheckCircle className="text-emerald-600" size={20} />} 
          label="Approved" 
          value={approvedCount} 
          bg="bg-emerald-50" 
        />
        <MetricItem 
          icon={<FileText className="text-purple-600" size={20} />} 
          label="Drafts" 
          value={draftCount} 
          bg="bg-purple-50" 
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_450px]">
        {/* Left Column */}
        <div className="space-y-6 flex flex-col h-full">
          {/* Pending Reviews Table */}
          <div className="premium-card rounded-2xl p-6 flex flex-col h-[400px] bg-white border border-slate-100">
            <div className="mb-5 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-slate-900">Pending Reviews Assigned to Me</h3>
              <Link href="/all-docs" className="text-xs font-semibold text-[#256D85] hover:underline">View all</Link>
            </div>
            
            <div className="overflow-y-auto pr-2">
              <table className="w-full text-sm text-left">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-2 font-semibold">Document</th>
                    <th className="pb-2 font-semibold text-right">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {pendingReviewList.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-slate-500">You're all caught up!</td>
                    </tr>
                  ) : (
                    pendingReviewList.map((doc) => (
                      <tr key={doc.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5">
                          <Link href={`/document/${doc.id}`} className="flex items-center gap-2 group-hover:text-[#256D85] transition-colors">
                            <FileText size={14} className="text-[#256D85]" />
                            <span className="font-medium text-slate-800">{doc.title || 'Untitled'}</span>
                          </Link>
                        </td>
                        <td className="py-2.5 text-right text-slate-500 text-xs">
                          {new Date(doc.updated_at || doc.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Notifications */}
          <div className="premium-card rounded-2xl p-6 flex flex-col h-80 bg-white border border-slate-100">
            <div className="mb-5 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-slate-900">Recent Notifications</h3>
            </div>
            <div className="overflow-y-auto pr-2 space-y-5">
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-500 italic py-4">No recent activity.</p>
              ) : (
                notifications.map(notif => (
                  <div key={notif.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                        {notif.senderName?.charAt(0) || 'U'}
                      </div>
                      <p className="text-sm text-slate-700 leading-snug">
                        <span className="font-semibold text-slate-900">{notif.senderName}</span> {notif.type === 'share' ? 'shared' : 'requested your review on'} <span className="font-medium text-slate-900">"{notif.documentTitle}"</span>
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap ml-4">
                      {new Date(notif.createdAt).toLocaleDateString() === new Date().toLocaleDateString() ? 'Today' : new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 flex flex-col h-full">
          {/* Recently Opened */}
          <div className="premium-card rounded-2xl p-6 flex flex-col h-[400px] bg-white border border-slate-100">
            <div className="mb-5 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-slate-900">Recently Opened</h3>
              <Link href="/recent" className="text-xs font-semibold text-[#256D85] hover:underline">View all</Link>
            </div>
            
            <div className="overflow-y-auto pr-2">
              <table className="w-full text-sm text-left">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-2 font-semibold">Document</th>
                    <th className="pb-2 font-semibold text-right">Last Opened</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {recentDocs.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-slate-500">No recent documents</td>
                    </tr>
                  ) : (
                    recentDocs.slice(0, 5).map((doc) => (
                      <tr key={doc.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5">
                          <Link href={`/document/${doc.id}`} className="flex items-center gap-2 group-hover:text-[#256D85] transition-colors">
                            <FileText size={14} className="text-[#256D85]" />
                            <span className="font-medium text-slate-800">{doc.title || 'Untitled'}</span>
                          </Link>
                        </td>
                        <td className="py-2.5 text-right text-slate-500 text-xs">
                           {new Date(doc.updated_at || doc.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Links */}
          <div className="premium-card rounded-2xl p-6 flex flex-col h-80 bg-white border border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-5 shrink-0">Quick Links</h3>
            <div className="flex flex-col space-y-1 overflow-y-auto pr-2">
              <QuickLink href="/all-docs" icon={<Layers size={16} />} title="All Documents" desc="Browse all" />
              <QuickLink href="/shared-with-me" icon={<Share2 size={16} />} title="Shared with me" desc="Documents shared" />
              <QuickLink href="/all-docs" icon={<FileSignature size={16} />} title="My Reviews" desc="View review queue" />
              <QuickLink href="/favorites" icon={<Star size={16} />} title="Favorites" desc="View favorites" />
              <QuickLink href="/recent" icon={<Clock size={16} />} title="Recent Documents" desc="Recently opened" />
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

function QuickLink({ href, icon, title, desc }: { href: string, icon: any, title: string, desc: string }) {
  return (
    <Link href={href} className="group flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-slate-50">
      <div className="flex items-center gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#78C6C9]/10 text-[#256D85] group-hover:bg-[#256D85] group-hover:text-white transition-colors">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="text-xs text-slate-500">{desc}</p>
        </div>
      </div>
      <ArrowRight size={14} className="text-slate-300 group-hover:text-[#256D85] group-hover:translate-x-0.5 transition-all" />
    </Link>
  )
}
