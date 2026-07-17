'use client'

import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

export function StatusPicker({ currentStatus, documentId, onUpdate }: any) {
  const [open, setOpen] = useState(false)

  const handleUpdate = async (newStatus: string) => {
    await fetch(`/api/documents/${documentId}/actions`, {
      method: 'POST',
      body: JSON.stringify({ action: 'STATUS_CHANGE', payload: { status: newStatus } })
    })
    onUpdate()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="cursor-pointer px-2 py-1 rounded hover:bg-slate-100">{currentStatus}</div>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2">
        {['DRAFT', 'PUBLISHED', 'PRIVATE'].map((s) => (
          <button key={s} onClick={() => handleUpdate(s)} className="block w-full text-left p-2 hover:bg-slate-50">{s}</button>
        ))}
      </PopoverContent>
    </Popover>
  )
}