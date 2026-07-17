import { Sidebar } from "@/components/layout/Sidebar"
import { TopNavbar } from "@/components/layout/TopNavbar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-white overflow-hidden text-slate-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopNavbar />
        <main className="flex-1 overflow-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  )
}