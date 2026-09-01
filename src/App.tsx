import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlayerRef } from '@remotion/player'

import { ActivityBar } from '@/components/activity-bar'
import { LibraryPanel, type SidebarView } from '@/components/library-panel'
import { Preview } from '@/components/preview'
import { Timeline } from '@/components/timeline'
import { AgentPanel } from '@/components/agent-panel'
import { TopBar } from '@/components/top-bar'
import { StatusBar } from '@/components/status-bar'
import type { Clip } from '@/lib/types'
import { compositionDurationSec, FPS } from '@/lib/types'
import type { ImportedMedia } from '@/lib/media-store'
import { formatDuration, revokeMedia } from '@/lib/media-store'
import { generateDemoMedia } from '@/lib/demo-media'

export type { Clip }

export default function App() {
  const [sidebarView, setSidebarView] = useState<SidebarView>('media')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [agentOpen, setAgentOpen] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [clips, setClips] = useState<Clip[]>([])
  const [importedFiles, setImportedFiles] = useState<ImportedMedia[]>(() => generateDemoMedia())
  const [currentTime, setCurrentTime] = useState(0)
  const [activeClipIndex, setActiveClipIndex] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)

  const playerRef = useRef<PlayerRef>(null)
  const durationSec = compositionDurationSec(clips)

  useEffect(() => {
    return () => {
      importedFiles.forEach(revokeMedia)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleImportFiles = useCallback((files: ImportedMedia[]) => {
    setImportedFiles((prev) => [...prev, ...files])
  }, [])

  const handleClipAdded = useCallback((clip: Clip) => {
    setClips((prev) => {
      const lastEnd = prev.reduce((max, c) => Math.max(max, c.startTime + c.durationSec), 0)
      const nextClip = clip.startTime === 0 && prev.length > 0 && clip.fileId
        ? { ...clip, startTime: lastEnd }
        : clip
      const next = [...prev, nextClip]
      setActiveClipIndex(next.length - 1)
      return next
    })
  }, [])

  const handleClipMove = useCallback((clipId: string, newStartTime: number, newLane: number) => {
    setClips((prev) =>
      prev.map((c) => (c.id === clipId ? { ...c, startTime: Math.max(0, newStartTime), lane: newLane } : c)),
    )
  }, [])

  const handleClipTrim = useCallback((clipId: string, delta: number, fromStart: boolean) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id !== clipId) return c
        if (fromStart) {
          const newStart = Math.max(0, c.startTime + delta)
          const newDuration = c.durationSec - (newStart - c.startTime)
          if (newDuration < 0.5) return c
          return { ...c, startTime: newStart, durationSec: newDuration }
        }
        return { ...c, durationSec: Math.max(0.5, c.durationSec + delta) }
      }),
    )
  }, [])

  const handleClipSplit = useCallback(() => {
    if (activeClipIndex == null) return
    const clip = clips[activeClipIndex]
    if (!clip) return
    const splitPoint = currentTime - clip.startTime
    if (splitPoint <= 0.5 || splitPoint >= clip.durationSec - 0.5) return

    const newClip: Clip = {
      ...clip,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      startTime: clip.startTime + splitPoint,
      durationSec: clip.durationSec - splitPoint,
    }

    setClips((prev) => {
      const updated = prev.map((c) => (c.id === clip.id ? { ...c, durationSec: splitPoint } : c))
      return [...updated, newClip]
    })
  }, [activeClipIndex, clips, currentTime])

  const handleClipDelete = useCallback(() => {
    if (activeClipIndex == null) return
    setClips((prev) => prev.filter((_, i) => i !== activeClipIndex))
    setActiveClipIndex(null)
  }, [activeClipIndex])

  const handleTogglePlay = useCallback(() => {
    const player = playerRef.current
    if (!player) return
    if (player.isPlaying()) player.pause()
    else player.play()
  }, [])

  const handleSeek = useCallback((time: number) => {
    const player = playerRef.current
    const frame = Math.round(Math.max(0, time) * FPS)
    player?.seekTo(frame)
    setCurrentTime(time)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleClipDelete()
      } else if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleClipSplit()
      } else if (e.key === ' ') {
        e.preventDefault()
        handleTogglePlay()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClipDelete, handleClipSplit, handleTogglePlay])

  return (
    <main className="flex h-screen min-h-[620px] flex-col overflow-hidden bg-[#0c0c10] text-[#999]">
      <TopBar
        projectName="launch-film"
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        agentOpen={agentOpen}
        onToggleAgent={() => setAgentOpen((v) => !v)}
      />

      <div className="flex min-h-0 flex-1">
        <ActivityBar
          active={sidebarView}
          open={sidebarOpen}
          onSelect={(id) => {
            if (sidebarOpen && sidebarView === id) setSidebarOpen(false)
            else {
              setSidebarView(id)
              setSidebarOpen(true)
            }
          }}
        />
        {sidebarOpen && (
          <LibraryPanel
            view={sidebarView}
            importedFiles={importedFiles}
            onFilesImported={handleImportFiles}
            onAddClip={handleClipAdded}
            onProxyReady={(fileName, proxyUrl) => {
              setImportedFiles((prev) =>
                prev.map((f) => (f.name === fileName ? { ...f, proxyReady: true, playbackUrl: proxyUrl } : f)),
              )
            }}
            onWaveformReady={(fileName, waveform) => {
              setImportedFiles((prev) =>
                prev.map((f) => (f.name === fileName && waveform ? { ...f, waveform } : f)),
              )
            }}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col bg-[#0c0c10]">
          <Preview
            playing={playing}
            onTogglePlay={handleTogglePlay}
            clips={clips}
            importedFiles={importedFiles}
            playerRef={playerRef}
            currentTime={currentTime}
            onTimeUpdate={setCurrentTime}
            onPlayingChange={setPlaying}
          />
          <Timeline
            clips={clips}
            importedFiles={importedFiles}
            onDropAsset={handleClipAdded}
            onClipMove={handleClipMove}
            onClipTrim={handleClipTrim}
            onClipSplit={handleClipSplit}
            onClipDelete={handleClipDelete}
            activeClipIndex={activeClipIndex}
            onSelectClip={setActiveClipIndex}
            currentTime={currentTime}
            totalDuration={durationSec}
            onSeek={handleSeek}
            zoom={zoom}
            onZoom={setZoom}
          />
        </div>

        {agentOpen && (
          <AgentPanel
            clips={clips}
            importedFiles={importedFiles}
            onAddClip={handleClipAdded}
            onRemoveClip={(clipId) => {
              setClips((prev) => prev.filter((c) => c.id !== clipId))
              setActiveClipIndex(null)
            }}
            onMoveClip={handleClipMove}
            onTrimClip={(clipId, duration) => {
              setClips((prev) =>
                prev.map((c) => (c.id === clipId ? { ...c, durationSec: Math.max(0.5, duration) } : c)),
              )
            }}
          />
        )}
      </div>

      <StatusBar
        composition="1920×1080 · 30fps"
        clipCount={clips.length}
        durationLabel={formatDuration(durationSec)}
        playing={playing}
      />
    </main>
  )
}
