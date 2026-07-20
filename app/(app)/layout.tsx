import { Sidebar } from "@/components/layout/Sidebar"
import { TopNavbar } from "@/components/layout/TopNavbar"
import { OmniSearch } from "@/components/navigation/OmniSearch"
import { AICopilotPanel } from "@/components/ai/AICopilotPanel"
import { DocAIPanel } from "@/components/ai/DocAIPanel"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAFAF9] text-[#1E293B]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopNavbar />
        <main className="flex-1 min-h-0 overflow-hidden bg-[radial-gradient(circle_at_85%_0%,rgba(120,198,201,0.12),transparent_26rem),linear-gradient(180deg,#FFFFFF_0%,#FAFAF9_58%,#F5F7F6_100%)]">
          {children}
        </main>
      </div>
      <OmniSearch />
      <AICopilotPanel />
      <DocAIPanel />
    </div>
  )
}
