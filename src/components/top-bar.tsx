import { PanelRight, Zap } from 'lucide-react'

export function TopBar({
  projectName,
  playing,
  zoom,
  onZoom,
  agentOpen,
  onToggleAgent,
  clipCount,
  durationLabel,
}: {
  projectName: string
  playing: boolean
  zoom: number
  onZoom: (next: number) => void
  agentOpen: boolean
  onToggleAgent: () => void
  clipCount: number
  durationLabel: string
}) {
  return (
    <header className="flex h-9 shrink-0 items-center justify-between border-b border-[#1e1e28] bg-[#0c0c10] px-3 text-[12px] text-[#888]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex items-center gap-1.5 font-semibold text-[#ddd]">
          <Zap size={13} className="text-[#6c9eeb]" strokeWidth={1.8} fill="currentColor" />
          Vibecut
        </span>
        <span className="h-3 w-px bg-[#2a2a35]" />
        <span className="truncate text-[#ccc]">{projectName}</span>
        <span className="rounded bg-[#16161e] px-1.5 py-0.5 font-mono text-[10px] text-[#666]">
          {playing ? 'playing' : 'idle'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="font-mono text-[10.5px] text-[#555]">
          {clipCount} clips · {durationLabel}
        </span>
        <div className="flex items-center rounded-md border border-[#2a2a35] bg-[#16161e]">
          <button
            type="button"
            className="px-2 py-0.5 text-[#666] hover:text-[#ccc]"
            onClick={() => onZoom(Math.max(0.25, zoom - 0.25))}
          >
            -
          </button>
          <span className="w-10 text-center font-mono text-[10px] text-[#888]">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="px-2 py-0.5 text-[#666] hover:text-[#ccc]"
            onClick={() => onZoom(Math.min(4, zoom + 0.25))}
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={onToggleAgent}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${
            agentOpen ? 'bg-[#16161e] text-[#ccc]' : 'text-[#666] hover:bg-[#16161e] hover:text-[#ccc]'
          }`}
          title="Toggle agent"
        >
          <PanelRight size={13} />
          Agent
        </button>
      </div>
    </header>
  )
}
