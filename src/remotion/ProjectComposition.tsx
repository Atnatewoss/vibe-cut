import { AbsoluteFill, Audio, Sequence, Video } from 'remotion'

import type { Clip } from '@/lib/types'
import { timeToFrame } from '@/lib/types'
import {
  AudioBed,
  EndCard,
  FadeOverlay,
  FeatureTease,
  FounderStory,
  GlowOverlay,
  KenBurnsStill,
  LaunchReveal,
  LowerThird,
  MediaPlaceholder,
  VignetteOverlay,
} from '@/remotion/graphics'
import { RemocnShader, RemocnIcon, RemocnPrimitive } from '@/remotion/remocn-engine'

export type MediaInput = {
  id: string
  name: string
  kind: 'video' | 'image' | 'audio'
  url: string
  mime?: string
}

export type CompositionProps = {
  clips: Clip[]
  media: MediaInput[]
}

function resolveMedia(clip: Clip, media: MediaInput[]): MediaInput | null {
  if (!clip.fileId) return null
  return media.find((m) => m.id === clip.fileId) ?? null
}

function isPlayableVideo(item: MediaInput | null): boolean {
  if (!item || item.kind !== 'video') return false
  return Boolean(item.mime?.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(item.name))
}

function isPlayableAudio(item: MediaInput | null): boolean {
  if (!item || item.kind !== 'audio') return false
  return Boolean(item.mime?.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg)$/i.test(item.name))
}

function GraphicForClip({ clip, media }: { clip: Clip; media: MediaInput[] }) {
  const file = resolveMedia(clip, media)
  const graphicId = clip.templateId || clip.effectId || clip.fileId || clip.label

  if (clip.tone === 'effect' || clip.effectId) {
    const id = clip.effectId || graphicId
    
    if (clip.label.toLowerCase().includes('shader')) {
      return <RemocnShader type={clip.label} />
    }

    if (id === 'fade-in') return <FadeOverlay mode="in" />
    if (id === 'fade-out') return <FadeOverlay mode="out" />
    if (id === 'cross-dissolve') return <FadeOverlay mode="dissolve" />
    if (id === 'vignette') return <VignetteOverlay />
    if (id === 'glow') return <GlowOverlay />
    if (id === 'ken-burns') return <KenBurnsStill src={file?.url} label={clip.label} />
    
    if (clip.label.toLowerCase().includes('effect')) {
        return <RemocnShader type="Generic Effect" /> 
    }

    return <FadeOverlay mode="in" />
  }

  if (clip.tone === 'template' || clip.templateId) {
    const id = clip.templateId || graphicId
    
    if (clip.label.startsWith('Icon - ')) {
      return <RemocnIcon name={clip.label} />
    }
    
    const labelLower = clip.label.toLowerCase()
    if (labelLower.includes('component') || labelLower.includes('primitive') || labelLower.includes('sim') || labelLower.includes('typography')) {
      return <RemocnPrimitive type={clip.label} />
    }

    if (id === 'launch-reveal' || id === 'tpl-intro') return <LaunchReveal />
    if (id === 'feature-tease' || id === 'tpl-feature') return <FeatureTease />
    if (id === 'founder-story' || id === 'tpl-testimonial') return <FounderStory />
    if (id === 'end-card' || id === 'tpl-launch') return <EndCard />
    if (id === 'lower-third') return <LowerThird />
    return <LaunchReveal title={clip.label} />
  }

  if (file && isPlayableVideo(file)) {
    return (
      <AbsoluteFill style={{ background: '#000' }}>
        <Video src={file.url} muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </AbsoluteFill>
    )
  }

  if (file && !isPlayableAudio(file) && file.kind !== 'audio') {
    return <KenBurnsStill src={file.url} label={clip.label} />
  }

  if (file && isPlayableAudio(file)) {
    return (
      <>
        <Audio src={file.url} />
        <AudioBed label={clip.label} />
      </>
    )
  }

  if (clip.tone === 'audio') {
    return <AudioBed label={clip.label} />
  }

  return <MediaPlaceholder label={clip.label} kind={clip.tone} />
}

export function ProjectComposition({ clips, media }: CompositionProps) {
  const ordered = [...clips].sort((a, b) => a.lane - b.lane || a.startTime - b.startTime)

  return (
    <AbsoluteFill style={{ background: '#0b0b10' }}>
      {ordered.length === 0 && <LaunchReveal title="Vibecut" subtitle="Drop media or ask the agent" />}
      {ordered.map((clip) => (
        <Sequence
          key={clip.id}
          from={timeToFrame(clip.startTime)}
          durationInFrames={Math.max(1, timeToFrame(clip.durationSec))}
          name={clip.label}
        >
          <GraphicForClip clip={clip} media={media} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
