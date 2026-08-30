import { useCallback, useRef, useState, useMemo, useEffect } from 'react'
import { GripVertical, Plus, Scissors, Trash2, ZoomIn, ZoomOut, Film, Music } from 'lucide-react'

import { readPayload } from '@/lib/dnd'
import { formatDuration } from '@/lib/media-store'
import type { Clip } from '@/App'
import type { ImportedMedia } from '@/lib/media-store'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LANE_H = 56
const HEADER_W = 100
const RULER_H = 28
const MIN_TRACKS = 8
const SNAP_THRESHOLD = 8

/** Total timeline duration in seconds for the ruler. */
const TIMELINE_MAX_SEC = 60

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Track {
  id: string
  label: string
  type: 'video' | 'audio'
  muted: boolean
  solo: boolean
  locked: boolean
}

interface DragState {
  clipId: string
  startX: number
  startTime: number
  startLane: number
  isTrimming: boolean
  trimFromStart: boolean
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface TimelineProps {
  clips: Clip[]
  importedFiles: ImportedMedia[]
  onDropAsset: (clip: Clip) => void
  onClipMove: (clipId: string, newStartTime: number, newLane: number) => void
  onClipTrim: (clipId: string, delta: number, fromStart: boolean) => void
  onClipSplit: () => void
  onClipDelete: () => void
  activeClipIndex: number | null
  onSelectClip: (index: number | null) => void
  currentTime: number
  totalDuration: number
  onSeek: (time: number) => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Timeline({
  clips,
  importedFiles,
  onDropAsset,
  onClipMove,
  onClipTrim,
  onClipSplit,
  onClipDelete,
  activeClipIndex,
  onSelectClip,
  currentTime,
  totalDuration,
  onSeek,
}: TimelineProps) {
  const [over, setOver] = useState(false)
  const tracksRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [dragState, setDragState] = useState<DragState | null>(null)

  // Dynamic tracks
  const [tracks, setTracks] = useState<Track[]>(() => [
    { id: 'v1', label: 'V1', type: 'video', muted: false, solo: false, locked: false },
    { id: 'v2', label: 'V2', type: 'video', muted: false, solo: false, locked: false },
    { id: 'v3', label: 'V3', type: 'video', muted: false, solo: false, locked: false },
    { id: 'v4', label: 'V4', type: 'video', muted: false, solo: false, locked: false },
    { id: 'a1', label: 'A1', type: 'audio', muted: false, solo: false, locked: false },
    { id: 'a2', label: 'A2', type: 'audio', muted: false, solo: false, locked: false },
    { id: 'a3', label: 'A3', type: 'audio', muted: false, solo: false, locked: false },
    { id: 'a4', label: 'A4', type: 'audio', muted: false, solo: false, locked: false },
  ])

  // Expand tracks if clips exceed current count
  const expandedTracks = useMemo(() => {
    const needed = Math.max(MIN_TRACKS, clips.length + 2)
    if (needed <= tracks.length) return tracks

    const newTracks = [...tracks]
    for (let i = tracks.length; i < needed; i++) {
      const isVideo = newTracks.filter(t => t.type === 'video').length <=
                      newTracks.filter(t => t.type === 'audio').length
      newTracks.push({
        id: `track_${i + 1}`,
        label: isVideo ? `V${newTracks.filter(t => t.type === 'video').length + 1}`
                       : `A${newTracks.filter(t => t.type === 'audio').length + 1}`,
        type: isVideo ? 'video' : 'audio',
        muted: false,
        solo: false,
        locked: false,
      })
    }
    return newTracks
  }, [tracks, clips.length])

  // Calculate timeline width based on zoom and duration
  const maxSec = Math.max(totalDuration, TIMELINE_MAX_SEC) / zoom
  const rulerMarks = generateRulerMarks(maxSec)

  // Convert time to percentage
  const timeToPercent = useCallback((time: number) => {
    return (time / maxSec) * 100
  }, [maxSec])

  // Convert pixel delta to time delta
  const pixelToTime = useCallback((pixels: number) => {
    if (!tracksRef.current) return 0
    const rect = tracksRef.current.getBoundingClientRect()
    return (pixels / rect.width) * maxSec
  }, [maxSec])

  // Snap logic
  const snapToNearest = useCallback((time: number, clipId: string): number => {
    const snapPoints = [currentTime, 0]
    clips.forEach(c => {
      if (c.id !== clipId) {
        snapPoints.push(c.startTime, c.startTime + c.durationSec)
      }
    })

    let closest = time
    let minDist = Infinity
    snapPoints.forEach(point => {
      const dist = Math.abs(time - point)
      if (dist < minDist && dist < pixelToTime(SNAP_THRESHOLD)) {
        minDist = dist
        closest = point
      }
    })
    return closest
  }, [clips, currentTime, pixelToTime])

  // Playhead drag state
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false)
  const playheadRef = useRef<HTMLDivElement>(null)

  // Playhead position
  const playheadPct = timeToPercent(currentTime)

  /* ---- Playhead drag to scrub ---- */
  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDraggingPlayhead(true)
  }, [])

  useEffect(() => {
    if (!isDraggingPlayhead) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!tracksRef.current) return
      const rect = tracksRef.current.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      onSeek(pct * maxSec)
    }

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingPlayhead, maxSec, onSeek])

  // Resolve media for a clip
  const resolveMedia = useCallback((clip: Clip): ImportedMedia | null => {
    if (!clip.fileId) return null
    return importedFiles.find(f => f.id === clip.fileId) ?? null
  }, [importedFiles])

  /* ---- Click on ruler to seek ---- */
  const handleRulerClick = useCallback((e: React.MouseEvent) => {
    if (!tracksRef.current) return
    const rect = tracksRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onSeek(pct * maxSec)
  }, [onSeek, maxSec])

  /* ---- Drop handler ---- */
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setOver(false)

    const payload = readPayload(e.dataTransfer)
    if (!payload) return

    const isAudio = payload.kind === 'audio'
    const durationSec = payload.duration ? parseDuration(payload.duration) : 5

    // Calculate drop position
    const rect = tracksRef.current?.getBoundingClientRect()
    const x = rect ? e.clientX - rect.left : 0
    const startTime = pixelToTime(x)

    // Find first available track of matching type
    const trackType = isAudio ? 'audio' : 'video'
    let targetLane = expandedTracks.findIndex(t => t.type === trackType && !t.locked)
    if (targetLane === -1) targetLane = 0

    const newClip: Clip = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: payload.name,
      lane: targetLane,
      startTime: snapToNearest(startTime, ''),
      durationSec,
      tone: payload.kind as Clip['tone'],
      fileId: payload.fileId,
    }

    onDropAsset(newClip)
  }, [expandedTracks, onDropAsset, pixelToTime, snapToNearest])

  /* ---- Drag handlers for clips ---- */
  const handleClipMouseDown = useCallback((e: React.MouseEvent, clipId: string, isTrim: boolean, fromStart: boolean) => {
    e.stopPropagation()
    const clip = clips.find(c => c.id === clipId)
    if (!clip) return

    setDragState({
      clipId,
      startX: e.clientX,
      startTime: clip.startTime,
      startLane: clip.lane,
      isTrimming: isTrim,
      trimFromStart: fromStart,
    })
  }, [clips])

  // Mouse move handler for dragging
  useEffect(() => {
    if (!dragState) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startX
      const deltaTime = pixelToTime(deltaX)

      if (dragState.isTrimming) {
        onClipTrim(dragState.clipId, deltaTime, dragState.trimFromStart)
      } else {
        const newStartTime = snapToNearest(dragState.startTime + deltaTime, dragState.clipId)
        onClipMove(dragState.clipId, newStartTime, dragState.startLane)
      }
    }

    const handleMouseUp = () => {
      setDragState(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, pixelToTime, onClipTrim, onClipMove, snapToNearest])

  /* ---- Track controls ---- */
  const toggleMute = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, muted: !t.muted } : t
    ))
  }, [])

  const toggleSolo = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, solo: !t.solo } : t
    ))
  }, [])

  const toggleLock = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, locked: !t.locked } : t
    ))
  }, [])

  const addTrack = useCallback((type: 'video' | 'audio') => {
    setTracks(prev => {
      const count = prev.filter(t => t.type === type).length + 1
      return [...prev, {
        id: `track_${Date.now()}`,
        label: type === 'video' ? `V${count}` : `A${count}`,
        type,
        muted: false,
        solo: false,
        locked: false,
      }]
    })
  }, [])

  /* ---- Render ---- */
  return (
    <section
      className={`flex shrink-0 flex-col border-t border-line bg-[#1a1a1f] transition-shadow ${over ? 'timeline-drop-active' : ''}`}
      style={{ height: '45%', minHeight: 200 }}
      onDragOver={(e) => { e.preventDefault(); if (!over) setOver(true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false) }}
      onDrop={onDrop}
    >
      {/* Toolbar */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-line px-3 text-[11px] text-muted">
        <span className="flex items-center gap-2">
          <span className="font-medium text-fg text-[11px]">Timeline</span>
          <span className="font-mono text-[9.5px] text-faint">SCENE 01</span>
          {totalDuration > 0 && (
            <span className="font-mono text-[9.5px] text-faint">
              · {formatDuration(totalDuration)} total
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => addTrack('video')}
            className="grid size-6 place-items-center rounded text-faint hover:bg-hovered hover:text-fg"
            title="Add video track"
          >
            <Plus size={12} strokeWidth={1.8} />
          </button>
          <button
            onClick={onClipSplit}
            className="grid size-6 place-items-center rounded text-faint hover:bg-hovered hover:text-fg"
            title="Split at playhead (Ctrl+S)"
          >
            <Scissors size={12} strokeWidth={1.8} />
          </button>
          <button
            onClick={onClipDelete}
            className="grid size-6 place-items-center rounded text-faint hover:bg-hovered hover:text-fg"
            title="Delete selected (Del)"
          >
            <Trash2 size={12} strokeWidth={1.8} />
          </button>
          <div className="ml-1 h-3 w-px bg-line-strong" />
          <button
            onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
            className="grid size-6 place-items-center rounded text-faint hover:bg-hovered hover:text-fg"
            title="Zoom out"
          >
            <ZoomOut size={12} strokeWidth={1.8} />
          </button>
          <span className="font-mono text-[10px] text-faint w-8 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(4, z + 0.25))}
            className="grid size-6 place-items-center rounded text-faint hover:bg-hovered hover:text-fg"
            title="Zoom in"
          >
            <ZoomIn size={12} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Tracks area */}
      <div className="flex min-h-0 flex-1">
        {/* Lane headers */}
        <div className="shrink-0 border-r border-line bg-[#141418]" style={{ width: HEADER_W }}>
          <div className="flex items-center justify-center border-b border-line" style={{ height: RULER_H }}>
            <span className="text-[8px] uppercase tracking-wider text-faint/50">Tracks</span>
          </div>
          {expandedTracks.map((track) => (
            <div
              key={track.id}
              className="flex items-center justify-between border-b border-line px-2"
              style={{ height: LANE_H }}
            >
              <div className="flex items-center gap-1.5">
                {track.type === 'video' ? (
                  <Film size={10} className="text-[#4a9eff]" />
                ) : (
                  <Music size={10} className="text-[#4cd964]" />
                )}
                <span className="font-mono text-[10px] text-muted">{track.label}</span>
              </div>
              <div className="flex gap-0.5">
                <button
                  onClick={() => toggleMute(track.id)}
                  className={`text-[8px] px-1 py-0.5 rounded font-mono ${track.muted ? 'bg-[#ff453a]/20 text-[#ff453a]' : 'text-faint hover:text-muted'}`}
                  title="Mute"
                >
                  M
                </button>
                <button
                  onClick={() => toggleSolo(track.id)}
                  className={`text-[8px] px-1 py-0.5 rounded font-mono ${track.solo ? 'bg-[#ffd60a]/20 text-[#ffd60a]' : 'text-faint hover:text-muted'}`}
                  title="Solo"
                >
                  S
                </button>
                <button
                  onClick={() => toggleLock(track.id)}
                  className={`text-[8px] px-1 py-0.5 rounded font-mono ${track.locked ? 'bg-[#ff9f0a]/20 text-[#ff9f0a]' : 'text-faint hover:text-muted'}`}
                  title="Lock"
                >
                  L
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Tracks + Ruler */}
        <div ref={tracksRef} className="relative min-w-0 flex-1 overflow-x-auto overflow-y-auto">
          {/* Ruler */}
          <div
            className="sticky top-0 z-20 shrink-0 cursor-pointer border-b border-line bg-[#1a1a1f] select-none"
            style={{ height: RULER_H }}
            onClick={handleRulerClick}
          >
            {rulerMarks.map((mark) => (
              <div
                key={mark.label}
                className="absolute top-0 h-full border-r border-line/20"
                style={{ left: `${mark.pct}%` }}
              >
                <span className="absolute bottom-0.5 left-0.5 font-mono text-[7.5px] text-faint/60">
                  {mark.label}
                </span>
                <div className="absolute bottom-0 left-0 h-1 w-px bg-faint/25" />
              </div>
            ))}
          </div>

          {/* Grid + clips */}
          <div
            className="relative"
            style={{ height: expandedTracks.length * LANE_H }}
          >
            {/* Playhead */}
            <div
              className="absolute bottom-0 top-0 z-30"
              style={{ left: `${playheadPct}%` }}
              ref={playheadRef}
            >
              <div
                className="absolute -top-[3px] -left-[5px] h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#ff453a] cursor-col-resize"
                onMouseDown={handlePlayheadMouseDown}
              />
              <div className={`h-full w-px bg-[#ff453a]/80 ${isDraggingPlayhead ? 'bg-[#ff453a]' : ''}`} />
            </div>

            {/* Lane separators */}
            {expandedTracks.map((track, i) => (
              <div
                key={track.id}
                className="absolute left-0 right-0 border-b border-line/30"
                style={{ top: i * LANE_H }}
              />
            ))}

            {/* Clips */}
            {clips.map((clip, i) => {
              const isActive = i === activeClipIndex
              const leftPct = timeToPercent(clip.startTime)
              const widthPct = timeToPercent(clip.durationSec)
              const media = resolveMedia(clip)
              const isVideo = clip.tone === 'video' && media != null
              const isAudio = clip.tone === 'audio' && media != null

              return (
                <div
                  key={clip.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectClip(isActive ? null : i)
                  }}
                  onMouseDown={(e) => handleClipMouseDown(e, clip.id, false, false)}
                  className={`absolute flex items-center overflow-hidden rounded-[3px] border font-mono text-[10px] cursor-grab active:cursor-grabbing transition-shadow ${isActive ? 'ring-1 ring-[#0a84ff]/60 z-20' : ''}`}
                  style={{
                    top: 4 + clip.lane * LANE_H + 4,
                    left: `${leftPct}%`,
                    width: `${Math.max(widthPct, 4)}%`,
                    height: LANE_H - 12,
                    ...clipStyle(clip.tone, isVideo),
                  }}
                >
                  {/* Thumbnail strip for video clips */}
                  {isVideo && media.thumbnail && (
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage: `url(${media.thumbnail})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  )}

                  {/* Waveform visualization for audio clips */}
                  {isAudio && (
                    <div className="absolute inset-0 flex items-center px-1">
                      {Array.from({ length: Math.max(20, Math.floor(widthPct * 2)) }).map((_, wi) => (
                        <div
                          key={wi}
                          className="mx-px rounded-full bg-white/20"
                          style={{
                            width: 2,
                            height: `${8 + Math.sin(wi * 0.4) * 12 + Math.cos(wi * 0.8) * 8}px`,
                            flexShrink: 0,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Left trim handle */}
                  <div
                    onMouseDown={(e) => handleClipMouseDown(e, clip.id, true, true)}
                    className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/20 transition-colors z-10"
                  />

                  {/* Clip label */}
                  <div className="relative z-10 flex items-center gap-1 px-1.5 min-w-0">
                    {isVideo ? (
                      <Film size={9} className="shrink-0 opacity-60" />
                    ) : isAudio ? (
                      <Music size={9} className="shrink-0 opacity-60" />
                    ) : (
                      <GripVertical size={9} className="shrink-0 opacity-40" />
                    )}
                    <span className="truncate opacity-80">{clip.label}</span>
                  </div>

                  {/* Right trim handle */}
                  <div
                    onMouseDown={(e) => handleClipMouseDown(e, clip.id, true, false)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/20 transition-colors z-10"
                  />
                </div>
              )
            })}

            {/* Empty state */}
            {clips.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-[11px] text-faint/40">
                Drop media from the library to start building
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseDuration(dur: string): number {
  const parts = dur.split(':').map(Number)
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0)
  return 5
}

function generateRulerMarks(maxSec: number) {
  const interval = maxSec <= 30 ? 5 : maxSec <= 60 ? 10 : 15
  const marks: { pct: number; label: string }[] = []
  for (let s = 0; s <= maxSec; s += interval) {
    marks.push({
      pct: (s / maxSec) * 100,
      label: `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`,
    })
  }
  return marks
}

/** DaVinci Resolve-inspired clip colors */
function clipStyle(tone: Clip['tone'], hasMedia: boolean) {
  if (tone === 'video') {
    return {
      background: hasMedia
        ? 'linear-gradient(180deg, rgba(30, 64, 110, 0.95) 0%, rgba(20, 45, 80, 0.95) 100%)'
        : 'linear-gradient(180deg, #1e406e 0%, #142d50 100%)',
      borderColor: hasMedia ? '#2a5a8a' : '#1e406e',
      color: '#ffffff',
    }
  }
  if (tone === 'audio') {
    return {
      background: hasMedia
        ? 'linear-gradient(180deg, rgba(30, 90, 50, 0.95) 0%, rgba(20, 70, 35, 0.95) 100%)'
        : 'linear-gradient(180deg, #1e5a32 0%, #144623 100%)',
      borderColor: hasMedia ? '#2a8a4a' : '#1e5a32',
      color: '#ffffff',
    }
  }
  if (tone === 'effect') {
    return {
      background: 'linear-gradient(180deg, #6b21a8 0%, #581c87 100%)',
      borderColor: '#7c3aed',
      color: '#ffffff',
    }
  }
  if (tone === 'image') {
    return {
      background: 'linear-gradient(180deg, #0e7490 0%, #155e75 100%)',
      borderColor: '#06b6d4',
      color: '#ffffff',
    }
  }
  return {
    background: 'linear-gradient(180deg, #9a3412 0%, #7c2d12 100%)',
    borderColor: '#ea580c',
    color: '#ffffff',
  }
}
