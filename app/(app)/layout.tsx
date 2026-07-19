import { Sidebar } from "@/components/layout/Sidebar"
import { TopNavbar } from "@/components/layout/TopNavbar"
import { OmniSearch } from "@/components/navigation/OmniSearch"
import { AICopilotPanel } from "@/components/ai/AICopilotPanel"
import { DocAIPanel } from "@/components/ai/DocAIPanel"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-slate-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopNavbar />
        <main className="flex-1 min-h-0 overflow-hidden bg-slate-50">
          {children}
        </main>
      </div>
      <OmniSearch />
      <AICopilotPanel />
      <DocAIPanel />
    </div>
  )
}