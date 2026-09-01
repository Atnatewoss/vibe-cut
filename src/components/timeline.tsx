import { useCallback, useRef, useState, useMemo, useEffect } from 'react'
import { GripVertical, Plus, Scissors, Trash2, ZoomIn, ZoomOut, Film, Music } from 'lucide-react'

import { readPayload } from '@/lib/dnd'
import { formatDuration } from '@/lib/media-store'
import type { Clip } from '@/lib/types'
import type { ImportedMedia } from '@/lib/media-store'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LANE_H = 36
const HEADER_W = 84
const RULER_H = 22
const MIN_TRACKS = 7
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
  zoom: number
  onZoom: (zoom: number) => void
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
  zoom,
  onZoom,
}: TimelineProps) {
  const [over, setOver] = useState(false)
  const tracksRef = useRef<HTMLDivElement>(null)
  const headersRef = useRef<HTMLDivElement>(null)
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
      templateId: payload.templateId,
      effectId: payload.effectId,
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

  /* ---- Scroll Sync ---- */
  const handleTracksScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (headersRef.current) {
      headersRef.current.scrollTop = e.currentTarget.scrollTop
    }
  }, [])
  
  const handleHeadersScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (tracksRef.current) {
      tracksRef.current.scrollTop = e.currentTarget.scrollTop
    }
  }, [])

  /* ---- Render ---- */
  return (
    <section
      className={`flex shrink-0 flex-col border-t border-[#1e1e28] bg-[#111116] transition-shadow ${over ? 'timeline-drop-active' : ''}`}
      style={{ height: '38%', minHeight: 180 }}
      onDragOver={(e) => { e.preventDefault(); if (!over) setOver(true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false) }}
      onDrop={onDrop}
    >
      {/* Toolbar */}
      <div className="flex h-[35px] shrink-0 items-center justify-between border-b border-[#1e1e28] px-2 text-[11px] text-[#888]">
        <span className="flex items-center gap-2">
          <span className="text-[11px] text-[#ccc]">Timeline</span>
          {totalDuration > 0 && (
            <span className="font-mono text-[10px] text-[#555]">
              {formatDuration(totalDuration)}
            </span>
          )}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => addTrack('video')}
            className="vc-icon"
            title="Add track"
          >
            <Plus size={13} strokeWidth={1.8} />
          </button>
          <button
            onClick={onClipSplit}
            className="vc-icon"
            title="Split at playhead"
          >
            <Scissors size={13} strokeWidth={1.8} />
          </button>
          <button
            onClick={onClipDelete}
            className="vc-icon"
            title="Delete selected"
          >
            <Trash2 size={13} strokeWidth={1.8} />
          </button>
          <span className="mx-1 h-3 w-px bg-[#2a2a35]" />
          <button
            onClick={() => onZoom(Math.max(0.25, zoom - 0.25))}
            className="vc-icon"
            title="Zoom out"
          >
            <ZoomOut size={13} strokeWidth={1.8} />
          </button>
          <span className="w-8 text-center font-mono text-[10px] text-[#666]">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => onZoom(Math.min(4, zoom + 0.25))}
            className="vc-icon"
            title="Zoom in"
          >
            <ZoomIn size={13} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Tracks area */}
      <div className="flex min-h-0 flex-1">
        {/* Lane headers */}
        <div 
          ref={headersRef}
          className="shrink-0 border-r border-[#1e1e28] bg-[#0c0c10] overflow-y-auto scrollbar-hide" 
          style={{ width: HEADER_W, scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onScroll={handleHeadersScroll}
        >
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="sticky top-0 z-40 flex items-center justify-center border-b border-[#1e1e28] bg-[#0c0c10]" style={{ height: RULER_H }}>
            <span className="text-[10px] text-[#444]">Tracks</span>
          </div>
          {expandedTracks.map((track) => (
            <div
              key={track.id}
              className="flex items-center justify-between border-b border-[#1e1e28] px-1.5"
              style={{ height: LANE_H }}
            >
              <div className="flex items-center gap-1">
                {track.type === 'video' ? (
                  <Film size={10} className="text-[#6c9eeb]" />
                ) : (
                  <Music size={10} className="text-[#888]" />
                )}
                <span className="font-mono text-[10px] text-[#888]">{track.label}</span>
              </div>
              <div className="flex">
                <button
                  onClick={() => toggleMute(track.id)}
                  className={`px-1 font-mono text-[9px] ${track.muted ? 'text-[#ccc]' : 'text-[#444] hover:text-[#888]'}`}
                  title="Mute"
                >
                  M
                </button>
                <button
                  onClick={() => toggleSolo(track.id)}
                  className={`px-1 font-mono text-[9px] ${track.solo ? 'text-[#ccc]' : 'text-[#444] hover:text-[#888]'}`}
                  title="Solo"
                >
                  S
                </button>
                <button
                  onClick={() => toggleLock(track.id)}
                  className={`px-1 font-mono text-[9px] ${track.locked ? 'text-[#ccc]' : 'text-[#444] hover:text-[#888]'}`}
                  title="Lock"
                >
                  L
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Tracks + Ruler */}
        <div 
          ref={tracksRef} 
          className="relative min-w-0 flex-1 overflow-x-auto overflow-y-auto"
          onScroll={handleTracksScroll}
        >
          {/* Ruler */}
          <div
            className="sticky top-0 z-20 shrink-0 cursor-pointer border-b border-[#1e1e28] bg-[#111116] select-none"
            style={{ height: RULER_H }}
            onClick={handleRulerClick}
          >
            {rulerMarks.map((mark) => (
              <div
                key={mark.label}
                className="absolute top-0 h-full border-r border-line/20"
                style={{ left: `${mark.pct}%` }}
              >
                <span className="absolute bottom-0.5 left-0.5 font-mono text-[9px] text-[#555]">
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
                className="absolute -top-[3px] -left-[4px] h-0 w-0 cursor-col-resize border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-[#6c9eeb]"
                onMouseDown={handlePlayheadMouseDown}
              />
              <div className={`h-full w-px ${isDraggingPlayhead ? 'bg-[#6c9eeb]' : 'bg-[#6c9eeb]/80'}`} />
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
                  className={`absolute flex cursor-grab items-center overflow-hidden rounded-sm border font-mono text-[10px] active:cursor-grabbing ${isActive ? 'z-20 border-[#6c9eeb]' : 'border-[#2a2a35]'}`}
                  style={{
                    top: 3 + clip.lane * LANE_H,
                    left: `${leftPct}%`,
                    width: `${Math.max(widthPct, 4)}%`,
                    height: LANE_H - 6,
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
                      {waveformBars(media?.waveform, Math.max(20, Math.floor(widthPct * 2))).map((h, wi) => (
                        <div
                          key={wi}
                          className="mx-px rounded-full bg-white/20"
                          style={{
                            width: 2,
                            height: `${h}px`,
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
              <div className="absolute inset-0 flex items-center justify-center text-[12px] text-[#444]">
                Drop media from the sidebar
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
  if (/^\d+(\.\d+)?$/.test(dur)) return parseFloat(dur)
  const parts = dur.split(':').map(Number)
  if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0)
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0)
  return 5
}

/**
 * Bar heights for the audio waveform. Uses real amplitude buckets when
 * available, falling back to a synthetic sine curve otherwise.
 */
function waveformBars(waveform: number[] | undefined, count: number): number[] {
  if (waveform && waveform.length > 0) {
    const bars: number[] = []
    for (let i = 0; i < count; i++) {
      const amp = Math.max(0, Math.min(1, (waveform[Math.floor((i / count) * waveform.length)] ?? 0) * 1.5))
      bars.push(4 + Math.round(amp * 22))
    }
    return bars
  }
  return Array.from({ length: count }, (_, wi) => 8 + Math.sin(wi * 0.4) * 12 + Math.cos(wi * 0.8) * 8)
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

/** Muted IDE clip colors — same family as the agent accent */
function clipStyle(tone: Clip['tone'], hasMedia: boolean) {
  if (tone === 'video') {
    return {
      background: hasMedia ? '#1a2740' : '#161d2c',
      color: '#c8d4e8',
    }
  }
  if (tone === 'audio') {
    return {
      background: hasMedia ? '#1a2430' : '#151c24',
      color: '#b7c4d4',
    }
  }
  if (tone === 'effect') {
    return {
      background: '#1e1a2c',
      color: '#c8c0d8',
    }
  }
  if (tone === 'image') {
    return {
      background: '#18242c',
      color: '#c0d0d8',
    }
  }
  return {
    background: '#241c18',
    color: '#d4c8c0',
  }
}
