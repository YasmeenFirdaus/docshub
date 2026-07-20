'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Share2, FileText, X } from 'lucide-react'
import Link from 'next/link'

type Notification = {
  id: string
  type: 'share' | 'review'
  documentId: string
  documentTitle: string
  senderName: string
  createdAt: string
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        if (data.notifications) setNotifications(data.notifications)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-[#F5F7F6] hover:text-[#256D85]"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span className="absolute right-2 top-2 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D96B6B] opacity-70"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#D96B6B]"></span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="premium-card absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl animate-doc-fade-up">
          <div className="flex items-center justify-between border-b border-[#E7ECEA] bg-[#F5F7F6]/60 px-4 py-3">
            <h3 className="font-semibold text-[#1E293B]">Notifications</h3>
            {notifications.length > 0 && (
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-[#E7ECEA]">
                {notifications.length}
              </span>
            )}
          </div>
          
          <div className="max-h-[300px] overflow-y-auto p-2">
            {loading ? (
              <div className="py-8 text-center text-sm text-slate-400">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                <Bell className="mx-auto h-8 w-8 text-slate-200 mb-2" />
                No new notifications
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={`/document/${n.documentId}`}
                    onClick={() => setIsOpen(false)}
                    className="group flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-[#F5F7F6]"
                  >
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${n.type === 'share' ? 'bg-emerald-100 text-emerald-600' : 'bg-[#78C6C9]/18 text-[#256D85]'}`}>
                      {n.type === 'share' ? <Share2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-600 leading-tight">
                        <span className="font-semibold text-slate-900">{n.senderName}</span>
                        {n.type === 'share' ? ' shared a document with you' : ' requested your review'}
                      </p>
                      <p className="truncate text-xs font-medium text-slate-900 mt-1">
                        "{n.documentTitle}"
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                        {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
