import { PanelLeft, PanelRight } from 'lucide-react'

export function TopBar({
  projectName,
  sidebarOpen,
  onToggleSidebar,
  agentOpen,
  onToggleAgent,
}: {
  projectName: string
  sidebarOpen: boolean
  onToggleSidebar: () => void
  agentOpen: boolean
  onToggleAgent: () => void
}) {
  return (
    <header className="flex h-9 shrink-0 items-center justify-between border-b border-[#1e1e28] bg-[#0c0c10] px-2 text-[12px]">
      <div className="flex w-[220px] items-center gap-0.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-pressed={sidebarOpen}
          className="vc-icon"
          title="Toggle sidebar"
        >
          <PanelLeft size={14} />
        </button>
        <span className="ml-1 truncate text-[12px] font-medium text-[#ccc]">Vibecut</span>
      </div>

      <div className="flex min-w-0 items-center justify-center">
        <span className="max-w-[280px] truncate rounded-md px-2 py-0.5 text-[12px] text-[#888]">
          {projectName}
        </span>
      </div>

      <div className="flex w-[220px] items-center justify-end">
        <button
          type="button"
          onClick={onToggleAgent}
          aria-pressed={agentOpen}
          className="vc-icon"
          title="Toggle agent"
        >
          <PanelRight size={14} />
        </button>
      </div>
    </header>
  )
}
