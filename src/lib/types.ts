export type ClipTone = 'video' | 'audio' | 'image' | 'effect' | 'template'

export type Clip = {
  id: string
  label: string
  lane: number
  /** Start time in seconds on the timeline */
  startTime: number
  /** Duration in seconds */
  durationSec: number
  tone: ClipTone
  /** Links to an ImportedMedia if this clip came from a real file */
  fileId?: string
  originalDuration?: number
  /** Built-in Remotion graphic id */
  templateId?: string
  /** Built-in effect overlay id */
  effectId?: string
}

export const FPS = 30
export const COMP_WIDTH = 1920
export const COMP_HEIGHT = 1080

export function timeToFrame(seconds: number): number {
  return Math.max(0, Math.round(seconds * FPS))
}

export function frameToTime(frame: number): number {
  return frame / FPS
}

export function compositionDurationSec(clips: Clip[], minSec = 8): number {
  const end = clips.reduce((max, c) => Math.max(max, c.startTime + c.durationSec), 0)
  return Math.max(minSec, end)
}
