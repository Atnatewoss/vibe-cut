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
  open: boolean
  onSelect: (id: SidebarView) => void
}

export function ActivityBar({ active, open, onSelect }: ActivityBarProps) {
  return (
    <nav
      className="flex w-12 shrink-0 flex-col items-center border-r border-[#1e1e28] bg-[#0c0c10] pt-1"
      aria-label="Activity bar"
    >
      <div className="flex flex-col items-center">
        {TOP_ITEMS.map(({ id, Icon, tip }) => (
          <ActivityIcon
            key={id}
            Icon={Icon}
            tip={tip}
            active={open && active === id}
            onClick={() => onSelect(id)}
          />
        ))}
      </div>
      <div className="mt-auto flex flex-col items-center pb-1">
        {BOTTOM_ITEMS.map(({ id, Icon, tip }) => (
          <ActivityIcon
            key={id}
            Icon={Icon}
            tip={tip}
            active={open && active === id}
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
  active,
  onClick,
}: {
  Icon: typeof Clapperboard
  tip: string
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
        'relative flex size-12 items-center justify-center transition-colors',
        active ? 'text-[#e8e8ee]' : 'text-[#555] hover:text-[#aaa]',
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-r-full bg-[#ccc]" />
      )}
      <Icon size={22} strokeWidth={active ? 1.7 : 1.5} />
    </button>
  )
}
