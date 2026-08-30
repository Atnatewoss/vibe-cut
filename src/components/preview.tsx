import { useEffect, useRef } from 'react'
import {
  FileVideo2,
  Image as ImageIcon,
  AudioLines,
  Play,
  Square,
} from 'lucide-react'

import { formatDuration } from '@/lib/media-store'
import type { Clip } from '@/App'
import type { ImportedMedia } from '@/lib/media-store'

interface PreviewProps {
  playing: boolean
  setPlaying: () => void
  activeClip: Clip | null
  importedFiles: ImportedMedia[]
  videoRef: React.RefObject<HTMLVideoElement | null>
  currentTime: number
  totalDuration: number
  onSelectClip: (index: number | null) => void
}

function resolveMedia(clip: Clip | null, files: ImportedMedia[]): ImportedMedia | null {
  if (!clip?.fileId) return null
  return files.find((f) => f.id === clip.fileId) ?? null
}

export function Preview({
  playing,
  setPlaying,
  activeClip,
  importedFiles,
  videoRef,
  currentTime,
  totalDuration,
}: PreviewProps) {
  const clip = activeClip
  const media = resolveMedia(clip, importedFiles)
  const hasRealVideo = media != null && media.kind === 'video'
  const hasRealImage = media != null && media.kind === 'image'
  const hasRealAudio = media != null && media.kind === 'audio'



  /** Internal ref for the hidden <video> element we control */
  const localVideoRef = useRef<HTMLVideoElement>(null)

  /** Sync local ref → shared ref so App can control playback */
  useEffect(() => {
    videoRef.current = localVideoRef.current
  })

  const ClipIcon =
    clip?.tone === 'audio'
      ? AudioLines
      : clip?.tone === 'image'
        ? ImageIcon
        : FileVideo2

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#0a0a0f]">
      {/* Canvas */}
      <div className="relative min-h-0 flex-1 p-3">
        <div className="absolute inset-3 flex items-center justify-center">
          <div className="relative aspect-video h-full max-h-full overflow-hidden bg-[#111118]">

            {/* ---- Real video (hidden <video> element for playback control) ---- */}
            {hasRealVideo && (
              <>
                <video
                  ref={localVideoRef}
                  key={media.id}
                  src={media.playbackUrl}
                  className="absolute inset-0 h-full w-full object-contain"
                  controls={false}
                  muted
                  playsInline
                />

              </>
            )}

            {/* ---- Real image ---- */}
            {hasRealImage && (
              <img
                key={media.id}
                src={media.objectUrl}
                alt={media.name}
                className="absolute inset-0 h-full w-full object-contain"
              />
            )}

            {/* ---- Audio waveform ---- */}
            {hasRealAudio && (
              <>
                <div className="absolute inset-0 bg-[linear-gradient(160deg,#1a2240,#0a0e20_70%)]" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <AudioLines size={40} className="text-accent/30" strokeWidth={1} />
                  <span className="text-[13px] text-muted">{media.name}</span>
                  <div className="flex items-end gap-[3px]">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-[2px] rounded-full bg-accent/40"
                        style={{ height: `${6 + Math.sin(i * 0.6) * 14 + Math.cos(i * 1.2) * 6}px` }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ---- Built-in asset placeholder (no real file) ---- */}
            {!media && clip && (
              <>
                <div className="absolute inset-0 bg-[#111116]" />
                <div className="absolute left-5 top-5 font-mono text-[9px] tracking-[0.2em] text-faint">
                  {clip.tone.toUpperCase()} PREVIEW
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <ClipIcon size={32} className="text-faint/30" strokeWidth={1} />
                  <span className="text-[13px] text-muted">{clip.label}</span>
                  <span className="font-mono text-[9px] text-faint/60">
                    {clip.durationSec ? Math.round(clip.durationSec) + 's' : '—'}
                  </span>
                </div>
              </>
            )}

            {/* ---- Default empty state ---- */}
            {!clip && (
              <>
                <div className="absolute inset-0 bg-[#111118]" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[11px] text-faint/40">
                    Drop a clip or talk to the agent
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      {/* Transport bar */}
      <div className="flex h-10 shrink-0 items-center justify-center gap-4 border-t border-line bg-surface text-faint">
        <button
          aria-label={playing ? 'Pause video' : 'Play video'}
          onClick={setPlaying}
          className={`transport-play grid size-8 place-items-center transition-all ${playing ? 'active' : ''}`}
        >
          {playing ? (
            <Square size={11} fill="currentColor" />
          ) : (
            <Play size={12} fill="currentColor" />
          )}
        </button>
        <span className="font-mono text-[11px] text-faint">
          {formatDuration(currentTime)} / {totalDuration > 0 ? formatDuration(totalDuration) : '00:00'}
        </span>
      </div>
    </section>
  )
}
