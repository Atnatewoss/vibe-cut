import { useCallback, useEffect, useMemo, useState } from 'react'
import { Player, type PlayerRef } from '@remotion/player'
import { Download, Pause, Play, SkipBack } from 'lucide-react'

import { exportMediaToBlob, saveBlob } from '@/lib/export'
import { formatDuration } from '@/lib/media-store'
import type { ImportedMedia } from '@/lib/media-store'
import { COMP_HEIGHT, COMP_WIDTH, FPS, compositionDurationSec, timeToFrame, type Clip } from '@/lib/types'
import { ProjectComposition, type MediaInput } from '@/remotion/ProjectComposition'

interface PreviewProps {
  playing: boolean
  onTogglePlay: () => void
  clips: Clip[]
  importedFiles: ImportedMedia[]
  playerRef: React.RefObject<PlayerRef | null>
  currentTime: number
  onTimeUpdate: (time: number) => void
  onPlayingChange: (playing: boolean) => void
}

export function Preview({
  playing,
  onTogglePlay,
  clips,
  importedFiles,
  playerRef,
  currentTime,
  onTimeUpdate,
  onPlayingChange,
}: PreviewProps) {
  const media: MediaInput[] = useMemo(
    () =>
      importedFiles.map((f) => ({
        id: f.id,
        name: f.name,
        kind: f.kind,
        url: f.playbackUrl || f.objectUrl,
        mime: f.file.type,
      })),
    [importedFiles],
  )

  const durationSec = compositionDurationSec(clips)
  const durationInFrames = Math.max(1, timeToFrame(durationSec))

  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const handleExport = useCallback(async () => {
    if (exporting) return
    setExporting(true)
    setExportProgress(0)
    try {
      const blob = await exportMediaToBlob({
        clips,
        media,
        onProgress: (p) => setExportProgress(p.progress ?? 0),
      })
      await saveBlob(blob)
    } catch (err) {
      console.warn('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }, [clips, media, exporting])

  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    const onFrame = () => {
      onTimeUpdate(player.getCurrentFrame() / FPS)
    }
    const onPlay = () => onPlayingChange(true)
    const onPause = () => onPlayingChange(false)
    const onEnded = () => onPlayingChange(false)

    player.addEventListener('frameupdate', onFrame)
    player.addEventListener('play', onPlay)
    player.addEventListener('pause', onPause)
    player.addEventListener('ended', onEnded)
    return () => {
      player.removeEventListener('frameupdate', onFrame)
      player.removeEventListener('play', onPlay)
      player.removeEventListener('pause', onPause)
      player.removeEventListener('ended', onEnded)
    }
  }, [onPlayingChange, onTimeUpdate, playerRef, durationInFrames])

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#0c0c10]">
      <div className="relative min-h-0 flex-1 p-3">
        <div className="absolute inset-3 overflow-hidden rounded-md border border-[#1e1e28] bg-[#07070a]">
          <Player
            ref={playerRef}
            component={ProjectComposition}
            inputProps={{ clips, media }}
            durationInFrames={durationInFrames}
            compositionWidth={COMP_WIDTH}
            compositionHeight={COMP_HEIGHT}
            fps={FPS}
            acknowledgeRemotionLicense
            style={{ width: '100%', height: '100%' }}
            controls={false}
            autoPlay={false}
            loop={false}
            clickToPlay={false}
            numberOfSharedAudioTags={4}
          />
        </div>
      </div>

      <div className="flex h-10 shrink-0 items-center justify-center gap-3 border-t border-[#1e1e28] bg-[#111116] text-[#666]">
        <button
          type="button"
          aria-label="Go to start"
          onClick={() => {
            playerRef.current?.seekTo(0)
            onTimeUpdate(0)
          }}
          className="grid size-7 place-items-center rounded-md hover:bg-[#1e1e28] hover:text-[#ccc]"
        >
          <SkipBack size={13} />
        </button>
        <button
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={onTogglePlay}
          className={`transport-play grid size-8 place-items-center rounded-md ${playing ? 'active' : ''}`}
        >
          {playing ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
        </button>
        <span className="w-28 text-center font-mono text-[11px] text-[#888]">
          {exporting ? `export ${Math.round(exportProgress * 100)}%` : `${formatDuration(currentTime)} / ${formatDuration(durationSec)}`}
        </span>
        <button
          type="button"
          aria-label="Export video"
          disabled={exporting}
          onClick={handleExport}
          className="transport-export grid size-7 place-items-center rounded-md hover:bg-[#1e1e28] hover:text-[#ccc] disabled:opacity-40"
          title="Export to file"
        >
          <Download size={13} />
        </button>
      </div>
    </section>
  )
}
