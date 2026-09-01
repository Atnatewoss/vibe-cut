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
      <div className="flex h-[35px] shrink-0 items-center justify-between border-b border-[#1e1e28] bg-[#111116] px-2">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Go to start"
            onClick={() => {
              playerRef.current?.seekTo(0)
              onTimeUpdate(0)
            }}
            className="vc-icon"
          >
            <SkipBack size={13} />
          </button>
          <button
            type="button"
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={onTogglePlay}
            className="vc-icon"
          >
            {playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
          </button>
          <span className="ml-1 w-[92px] font-mono text-[11px] tabular-nums text-[#888]">
            {formatDuration(currentTime)} / {formatDuration(durationSec)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {exporting && (
            <span className="font-mono text-[10px] text-[#666]">
              Export {Math.round(exportProgress * 100)}%
            </span>
          )}
          <button
            type="button"
            aria-label="Export video"
            disabled={exporting}
            onClick={handleExport}
            className="vc-icon"
            title="Export"
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-[#07070a]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-full max-h-full aspect-video overflow-hidden bg-[#050508]">
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
      </div>
    </section>
  )
}
