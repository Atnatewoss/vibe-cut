import {
  AudioLines,
  Clapperboard,
  FileText,
  LayoutGrid,
  Search,
  Settings,
  Wand2,
} from 'lucide-react'

import type { LibraryTab } from '@/lib/files'
import { cn } from '@/lib/utils'

type ActivityId = LibraryTab | 'search' | 'files' | 'settings'

const TOP_ITEMS: { id: ActivityId; Icon: typeof Clapperboard; tip: string; badge?: string }[] = [
  { id: 'media', Icon: Clapperboard, tip: 'Media', badge: '6' },
  { id: 'effects', Icon: Wand2, tip: 'Effects', badge: '8' },
  { id: 'audio', Icon: AudioLines, tip: 'Audio', badge: '4' },
  { id: 'templates', Icon: LayoutGrid, tip: 'Templates', badge: '4' },
]

const BOTTOM_ITEMS: { id: ActivityId; Icon: typeof Search; tip: string }[] = [
  { id: 'search', Icon: Search, tip: 'Search' },
  { id: 'files', Icon: FileText, tip: 'Project Files' },
  { id: 'settings', Icon: Settings, tip: 'Settings' },
]

interface ActivityBarProps {
  active: ActivityId
  onSelect: (id: ActivityId) => void
}

export function ActivityBar({ active, onSelect }: ActivityBarProps) {
  return (
    <nav
      className="flex w-11 shrink-0 flex-col items-center border-r border-line bg-surface pt-1"
      aria-label="Activity bar"
    >
      <div className="flex flex-col items-center gap-0.5 pt-1">
        {TOP_ITEMS.map(({ id, Icon, tip, badge }) => (
          <ActivityIcon
            key={id}
            Icon={Icon}
            tip={tip}
            badge={badge}
            active={active === id}
            onClick={() => onSelect(id)}
          />
        ))}
      </div>

      <div className="my-1 h-px w-5 bg-line" />

      <div className="flex flex-col items-center gap-0.5">
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
  badge?: string
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
        'group relative flex size-9 items-center justify-center rounded-md transition-colors',
        active
          ? 'bg-hovered text-fg'
          : 'text-faint hover:bg-hovered/60 hover:text-muted',
      )}
    >
      {/* Active indicator — left bar */}
      {active && (
        <span className="absolute -left-[5px] top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
      )}

      <span className="relative">
        <Icon size={18} strokeWidth={1.45} />
        {badge && (
          <span
            className={cn(
              'absolute -right-2.5 -top-1.5 rounded-full px-[5px] font-mono text-[8px] leading-[13px]',
              active ? 'bg-accent text-bg' : 'bg-active text-faint',
            )}
          >
            {badge}
          </span>
        )}
      </span>
    </button>
  )
}
