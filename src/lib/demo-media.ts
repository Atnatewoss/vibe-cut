/**
 * Demo media generator — creates sample assets so the editor isn't empty on first load.
 * Uses Canvas API for thumbnails and synthetic data for audio visualization.
 */

import type { ImportedMedia } from './media-store'

/**
 * Create a sample video thumbnail using Canvas API.
 * Generates a gradient frame with text overlay (simulating a real video frame).
 */
function createSampleVideoThumbnail(
  title: string,
  colors: [string, string],
  duration: number,
): { thumbnail: string; file: File } {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 180
  const ctx = canvas.getContext('2d')!

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  grad.addColorStop(0, colors[0])
  grad.addColorStop(1, colors[1])
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Film grain effect
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`
    ctx.fillRect(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      1, 1,
    )
  }

  // Title text
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 16px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 10)

  // Duration badge
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  const durText = formatDur(duration)
  const textW = ctx.measureText(durText).width + 12
  ctx.fillRect(canvas.width - textW - 8, canvas.height - 28, textW, 20)
  ctx.fillStyle = '#ffffff'
  ctx.font = '11px monospace'
  ctx.fillText(durText, canvas.width - textW / 2 - 8, canvas.height - 18)

  // Convert to data URL
  const thumbnail = canvas.toDataURL('image/jpeg', 0.7)

  // Create a minimal placeholder file (the thumbnail acts as the visual)
  const blob = canvasToBlob(canvas)
  const file = new File([blob], `${title.replace(/\s+/g, '_').toLowerCase()}.jpg`, { type: 'image/jpeg' })

  return { thumbnail, file }
}

/**
 * Create a sample audio waveform thumbnail.
 */
function createSampleAudioThumbnail(
  title: string,
  duration: number,
): { thumbnail: string; file: File } {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 180
  const ctx = canvas.getContext('2d')!

  // Dark background
  ctx.fillStyle = '#0d1117'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw waveform bars
  const barCount = 60
  const barWidth = (canvas.width - 40) / barCount
  for (let i = 0; i < barCount; i++) {
    const h = 10 + Math.sin(i * 0.3) * 30 + Math.cos(i * 0.7) * 20 + Math.random() * 10
    const x = 20 + i * barWidth
    const grad = ctx.createLinearGradient(x, canvas.height / 2 - h, x, canvas.height / 2 + h)
    grad.addColorStop(0, '#7c3aed')
    grad.addColorStop(0.5, '#a78bfa')
    grad.addColorStop(1, '#7c3aed')
    ctx.fillStyle = grad
    ctx.fillRect(x, canvas.height / 2 - h, barWidth - 1, h * 2)
  }

  // Title
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 14px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(title, canvas.width / 2, 24)

  // Duration
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = '11px monospace'
  ctx.fillText(formatDur(duration), canvas.width / 2, 44)

  const thumbnail = canvas.toDataURL('image/jpeg', 0.7)
  const blob = canvasToBlob(canvas)
  const file = new File([blob], `${title.replace(/\s+/g, '_').toLowerCase()}.jpg`, { type: 'image/jpeg' })

  return { thumbnail, file }
}

function canvasToBlob(canvas: HTMLCanvasElement): Blob {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
  const byteString = atob(dataUrl.split(',')[1])
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
  return new Blob([ab], { type: 'image/jpeg' })
}

function formatDur(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Demo video clips */
const DEMO_VIDEOS = [
  { title: 'Product Hero Shot', colors: ['#1e3a5f', '#0a1628'] as [string, string], duration: 12 },
  { title: 'Feature Demo', colors: ['#2d1b4e', '#1a0f2e'] as [string, string], duration: 8 },
  { title: 'Customer Testimonial', colors: ['#1b3d2f', '#0a1f15'] as [string, string], duration: 15 },
  { title: 'Logo Animation', colors: ['#3d2b1b', '#1f150a'] as [string, string], duration: 5 },
  { title: 'Call to Action', colors: ['#4a1a3a', '#2a0f22'] as [string, string], duration: 6 },
]

/** Demo audio tracks */
const DEMO_AUDIO = [
  { title: 'Background Music', duration: 30 },
  { title: 'Voiceover', duration: 20 },
  { title: 'SFX Transition', duration: 3 },
]

/**
 * Generate all demo media and return as ImportedMedia objects.
 * Call this once on app init.
 */
export function generateDemoMedia(): ImportedMedia[] {
  const now = Date.now()
  const media: ImportedMedia[] = []

  // Generate demo videos
  DEMO_VIDEOS.forEach((v, i) => {
    const { thumbnail, file } = createSampleVideoThumbnail(v.title, v.colors, v.duration)
    const id = `demo_video_${i}_${now}`
    media.push({
      id,
      name: `${v.title}.mp4`,
      kind: 'video',
      file,
      objectUrl: URL.createObjectURL(file),
      playbackUrl: URL.createObjectURL(file),
      thumbnail,
      duration: v.duration,
      proxyReady: true, // Demo assets don't need proxy
    })
  })

  // Generate demo audio
  DEMO_AUDIO.forEach((a, i) => {
    const { thumbnail, file } = createSampleAudioThumbnail(a.title, a.duration)
    const id = `demo_audio_${i}_${now}`
    media.push({
      id,
      name: `${a.title.replace(/\s+/g, '_').toLowerCase()}.mp3`,
      kind: 'audio',
      file,
      objectUrl: URL.createObjectURL(file),
      playbackUrl: URL.createObjectURL(file),
      thumbnail,
      duration: a.duration,
      proxyReady: true,
    })
  })

  return media
}
