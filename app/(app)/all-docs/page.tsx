'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ImportButton } from "@/components/document/ImportButton"
import { 
  Search, Filter, ArrowUpDown, Plus, Upload, 
  MoreHorizontal, Users, Link as LinkIcon 
} from "lucide-react"

export default function AllDocsPage() {
  const router = useRouter()
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  // Safely fetch documents
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await fetch('/api/documents')
        if (res.ok) {
          const data = await res.json()
          setDocs(data)
        } else {
          console.error("Failed to fetch documents")
        }
      } catch (error) {
        console.error("Fetch error:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchDocs()
  }, [])

  // Create document and redirect to editor
  const handleNewDocument = async () => {
    setIsCreating(true)
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: "Untitled Document" })
      })

      if (res.ok) {
        const newDoc = await res.json()
        router.push(`/document/${newDoc.id}`) // Sends user to the editor page
      } else {
        alert("Failed to create document")
        setIsCreating(false)
      }
    } catch (error) {
      console.error(error)
      setIsCreating(false)
    }
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto w-full">
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Knowledge Hub</h1>
        <div className="flex items-center gap-2">
          <ImportButton />
          
          {/* NEW BUTTON WIRED UP */}
          <button 
            onClick={handleNewDocument}
            disabled={isCreating}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Plus size={16} className="mr-2" /> {isCreating ? "Creating..." : "New"}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input 
            placeholder="Search documents..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
          />
        </div>
        <button className="flex items-center px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
          <Filter size={16} className="mr-2" /> Filter
        </button>
        <button className="flex items-center px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
          <ArrowUpDown size={16} className="mr-2" /> Sort
        </button>
      </div>

      {/* Documents Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-semibold tracking-wider">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Sharing</th>
              <th className="px-6 py-4">Owner</th>
              <th className="px-6 py-4">Updated</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">Loading documents...</td>
              </tr>
            ) : docs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  No documents found. Click "New" to create one.
                </td>
              </tr>
            ) : (
              docs.map((doc) => (
                <tr 
                  key={doc.id} 
                  className="hover:bg-slate-50 group cursor-pointer"
                  onClick={() => router.push(`/document/${doc.id}`)}
                >
                  <td className="px-6 py-4 font-medium text-slate-800">{doc.title}</td>
                  <td className="px-6 py-4 text-slate-500">
                    {doc.workspace?.name ? `${doc.workspace.name} > ${doc.folder?.name || 'Root'}` : 'Private'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-1 bg-slate-100 rounded border border-slate-200">
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex items-center gap-2 text-slate-400">
                    <Users size={16} /> <LinkIcon size={16} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                        {doc.owner?.name?.charAt(0) || 'U'}
                      </div>
                      <span className="text-slate-600">{doc.owner?.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(doc.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation() // Prevents row click from firing
                        alert("Row actions coming next!")
                      }} 
                      className="text-slate-400 hover:text-slate-700 p-1"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}