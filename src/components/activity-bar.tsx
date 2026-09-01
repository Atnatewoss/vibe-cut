import {
  AudioLines,
  Clapperboard,
  Files,
  LayoutGrid,
  Search,
  Settings,
  Wand2,
} from 'lucide-react'

import type { SidebarView } from '@/components/library-panel'
import { cn } from '@/lib/utils'

const TOP_ITEMS: { id: SidebarView; Icon: typeof Clapperboard; tip: string }[] = [
  { id: 'media', Icon: Clapperboard, tip: 'Media' },
  { id: 'effects', Icon: Wand2, tip: 'Effects' },
  { id: 'audio', Icon: AudioLines, tip: 'Audio' },
  { id: 'templates', Icon: LayoutGrid, tip: 'Templates' },
]

const BOTTOM_ITEMS: { id: SidebarView; Icon: typeof Search; tip: string }[] = [
  { id: 'search', Icon: Search, tip: 'Search' },
  { id: 'files', Icon: Files, tip: 'Explorer' },
  { id: 'settings', Icon: Settings, tip: 'Settings' },
]

interface ActivityBarProps {
  active: SidebarView
  counts?: Partial<Record<SidebarView, number>>
  onSelect: (id: SidebarView) => void
}

export function ActivityBar({ active, counts, onSelect }: ActivityBarProps) {
  return (
    <nav
      className="flex w-12 shrink-0 flex-col items-center border-r border-[#1e1e28] bg-[#0c0c10] py-1.5"
      aria-label="Activity bar"
    >
      <div className="flex flex-col items-center gap-0.5">
        {TOP_ITEMS.map(({ id, Icon, tip }) => (
          <ActivityIcon
            key={id}
            Icon={Icon}
            tip={tip}
            badge={counts?.[id]}
            active={active === id}
            onClick={() => onSelect(id)}
          />
        ))}
      </div>
      <div className="mt-auto flex flex-col items-center gap-0.5 pb-1">
        {BOTTOM_ITEMS.map(({ id, Icon, tip }) => (
          <ActivityIcon
            key={id}
            Icon={Icon}
            tip={tip}
            active={active === id}
            onClick={() => onSelect(id)}
          />
        ))}
      </div>
    </nav>
  )
}

function ActivityIcon({
  Icon,
  tip,
  badge,
  active,
  onClick,
}: {
  Icon: typeof Clapperboard
  tip: string
  badge?: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={tip}
      title={tip}
      onClick={onClick}
      className={cn(
        'group relative flex size-10 items-center justify-center rounded-md transition-colors',
        active ? 'text-[#e8e8ee]' : 'text-[#555] hover:bg-[#16161e] hover:text-[#aaa]',
      )}
    >
      {active && <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[#6c9eeb]" />}
      <span className="relative">
        <Icon size={20} strokeWidth={active ? 1.7 : 1.45} />
        {badge != null && badge > 0 && (
          <span className="absolute -right-2.5 -top-1.5 min-w-[14px] rounded-full bg-[#1e1e28] px-[4px] text-center font-mono text-[8px] leading-[13px] text-[#888]">
            {badge}
          </span>
        )}
      </span>
    </button>
  )
}
