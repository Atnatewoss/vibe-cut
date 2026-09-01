export function StatusBar({
  composition,
  clipCount,
  durationLabel,
  playing,
}: {
  composition: string
  clipCount: number
  durationLabel: string
  playing: boolean
}) {
  return (
    <footer className="flex h-[22px] shrink-0 items-center justify-between border-t border-[#1e1e28] bg-[#111116] px-2 font-mono text-[10px] text-[#555]">
      <div className="flex items-center gap-2">
        <span className={playing ? 'text-[#6c9eeb]' : 'text-[#555]'}>{playing ? 'Playing' : 'Ready'}</span>
        <span className="text-[#2a2a35]">|</span>
        <span>{composition}</span>
      </div>
      <div className="flex items-center gap-2">
        <span>{clipCount} clips</span>
        <span className="text-[#2a2a35]">|</span>
        <span>{durationLabel}</span>
      </div>
    </footer>
  )
}
