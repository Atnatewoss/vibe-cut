import { GitBranch, Zap } from 'lucide-react'

const MENUS = ['File', 'Edit', 'View', 'Timeline', 'Help'] as const

export function TopBar() {
  return (
    <header className="flex h-8 shrink-0 items-center justify-between border-b border-line bg-surface px-3 text-[12px] text-muted">
      <nav className="flex items-center gap-0.5">
        <span className="mr-2 flex items-center gap-1.5 pr-2 text-[12px] font-semibold text-fg">
          <Zap size={13} className="text-accent" strokeWidth={1.8} fill="currentColor" />
          Vibecut
        </span>
        {MENUS.map((label) => (
          <button
            key={label}
            className="rounded px-2 py-0.5 text-[12px] text-muted transition-colors hover:bg-hovered hover:text-fg"
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-3 text-faint">
        <span className="font-mono text-[11px] text-muted">launch-film</span>
        <span className="flex items-center gap-1 text-[11px]">
          <GitBranch size={12} strokeWidth={1.6} />
          main
        </span>
        <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] text-faint">
          ─ ☐ ⤢
        </span>
      </div>
    </header>
  )
}
