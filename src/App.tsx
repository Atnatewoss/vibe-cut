import { useCallback, useEffect, useRef, useState } from 'react'

import LibraryPanel from '@/components/library-panel'
import { Preview } from '@/components/preview'
import { Timeline } from '@/components/timeline'
import { AgentPanel } from '@/components/agent-panel'
import type { ImportedMedia } from '@/lib/media-store'
import { revokeMedia } from '@/lib/media-store'
import { generateDemoMedia } from '@/lib/demo-media'


export type Clip = {
  id: string
  label: string
  lane: number
  /** Start time in seconds on the timeline */
  startTime: number
  /** Duration in seconds — used to calculate width on the timeline */
  durationSec: number
  tone: 'video' | 'audio' | 'image' | 'effect' | 'template'
  /** Links to an ImportedMedia if this clip came from a real file */
  fileId?: string
  /** Original duration before trimming */
  originalDuration?: number
}

export default function App() {
  const libraryOpen = true // Library always visible
  const [playing, setPlaying] = useState(false)
  const [clips, setClips] = useState<Clip[]>([])
  const [importedFiles, setImportedFiles] = useState<ImportedMedia[]>(() => generateDemoMedia())

  /** Current time in seconds — drives the playhead on the timeline */
  const [currentTime, setCurrentTime] = useState(0)

  const [activeClipIndex, setActiveClipIndex] = useState<number | null>(null)
  const activeClip = activeClipIndex != null ? clips[activeClipIndex] ?? null : null

  /** Shared ref so timeline/playhead and preview both talk to the same <video> */
  const videoRef = useRef<HTMLVideoElement>(null)

  /** Total duration of all clips combined */
  const totalDuration = clips.reduce((sum, c) => sum + c.durationSec, 0)

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => { importedFiles.forEach(revokeMedia) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync video time → currentTime state via requestAnimationFrame
  // Using high-performance RAF loop for smooth playback at native fps
  useEffect(() => {
    if (!playing) return
    let raf: number
    let lastTime = 0
    const tick = (timestamp: number) => {
      // Throttle updates to ~60fps max to avoid unnecessary re-renders
      if (timestamp - lastTime >= 16) {
        const v = videoRef.current
        if (v && !v.paused) {
          setCurrentTime(v.currentTime)
          // Auto-pause when video ends
          if (v.ended) {
            setPlaying(false)
            return
          }
        }
        lastTime = timestamp
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  const handleImportFiles = useCallback((files: ImportedMedia[]) => {
    setImportedFiles((prev) => [...prev, ...files])
  }, [])

  const handleClipAdded = useCallback((clip: Clip) => {
    setClips((prev) => {
      const next = [...prev, clip]
      setActiveClipIndex(next.length - 1)
      return next
    })
  }, [])

  /** Move a clip to a new position on the timeline */
  const handleClipMove = useCallback((clipId: string, newStartTime: number, newLane: number) => {
    setClips(prev => prev.map(c =>
      c.id === clipId ? { ...c, startTime: Math.max(0, newStartTime), lane: newLane } : c
    ))
  }, [])

  /** Trim a clip (adjust duration from start or end) */
  const handleClipTrim = useCallback((clipId: string, delta: number, fromStart: boolean) => {
    setClips(prev => prev.map(c => {
      if (c.id !== clipId) return c
      if (fromStart) {
        const newStart = Math.max(0, c.startTime + delta)
        const newDuration = c.durationSec - (newStart - c.startTime)
        if (newDuration < 0.5) return c // Minimum 0.5s
        return { ...c, startTime: newStart, durationSec: newDuration }
      } else {
        const newDuration = Math.max(0.5, c.durationSec + delta)
        return { ...c, durationSec: newDuration }
      }
    }))
  }, [])

  /** Split clip at playhead */
  const handleClipSplit = useCallback(() => {
    if (activeClipIndex == null) return
    const clip = clips[activeClipIndex]
    if (!clip || !clip.fileId) return // Only split real clips
    
    const splitPoint = currentTime - clip.startTime
    if (splitPoint <= 0.5 || splitPoint >= clip.durationSec - 0.5) return
    
    const newClip: Clip = {
      ...clip,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      startTime: clip.startTime + splitPoint,
      durationSec: clip.durationSec - splitPoint,
    }
    
    setClips(prev => {
      const updated = prev.map(c =>
        c.id === clip.id ? { ...c, durationSec: splitPoint } : c
      )
      return [...updated, newClip]
    })
  }, [activeClipIndex, clips, currentTime])

  /** Delete selected clip */
  const handleClipDelete = useCallback(() => {
    if (activeClipIndex == null) return
    setClips(prev => prev.filter((_, i) => i !== activeClipIndex))
    setActiveClipIndex(null)
  }, [activeClipIndex])



  const handleTogglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (playing) {
      v.pause()
      setPlaying(false)
    } else {
      v.play().catch(() => {})
      setPlaying(true)
    }
  }, [playing])

  /** Keyboard shortcuts */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleClipDelete()
      } else if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleClipSplit()
      } else if (e.key === ' ' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        handleTogglePlay()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClipDelete, handleClipSplit, handleTogglePlay])

  /** Seek video to a specific time (when clicking the timeline ruler) */
  const handleSeek = useCallback((time: number) => {
    const v = videoRef.current
    if (v) {
      v.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  return (
    <main className="flex h-screen min-h-[620px] flex-col overflow-hidden bg-bg text-muted">
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col bg-bg">
          {/* Top row: Library + Preview */}
          <div className="flex min-h-0 flex-1">
            {libraryOpen && (
              <LibraryPanel
                width={380}
                importedFiles={importedFiles}
                onFilesImported={handleImportFiles}
                onAddClip={handleClipAdded}
                onProxyReady={(fileName, proxyUrl) => {
                  setImportedFiles(prev => prev.map(f =>
                    f.name === fileName ? { ...f, proxyReady: true, playbackUrl: proxyUrl } : f
                  ))
                }}
              />
            )}
            <Preview
              playing={playing}
              setPlaying={handleTogglePlay}
              activeClip={activeClip}
              importedFiles={importedFiles}
              videoRef={videoRef}
              currentTime={currentTime}
              totalDuration={totalDuration}
              onSelectClip={setActiveClipIndex}
            />
          </div>

          {/* Bottom row: Timeline */}
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
            totalDuration={totalDuration}
            onSeek={handleSeek}
          />
        </div>

        <AgentPanel />
      </div>
    </main>
  )
}
