export type GraphicKind = 'template' | 'effect'

export type GraphicDef = {
  id: string
  name: string
  kind: GraphicKind
  duration: number
  description: string
}

export const TEMPLATES: GraphicDef[] = [
  { id: 'launch-reveal', name: 'Launch Reveal', kind: 'template', duration: 5, description: 'Kinetic product title + subtitle' },
  { id: 'feature-tease', name: 'Feature Tease', kind: 'template', duration: 4, description: 'Numbered feature card' },
  { id: 'founder-story', name: 'Founder Story', kind: 'template', duration: 6, description: 'Lower-third quote card' },
  { id: 'end-card', name: 'End Card', kind: 'template', duration: 4, description: 'Logo sting + CTA' },
  { id: 'lower-third', name: 'Lower Third', kind: 'template', duration: 4, description: 'Name and role bar' },
]

export const EFFECTS: GraphicDef[] = [
  { id: 'fade-in', name: 'Fade In', kind: 'effect', duration: 1, description: 'Opacity ramp from 0' },
  { id: 'fade-out', name: 'Fade Out', kind: 'effect', duration: 1, description: 'Opacity ramp to 0' },
  { id: 'cross-dissolve', name: 'Cross Dissolve', kind: 'effect', duration: 0.8, description: 'Soft dissolve overlay' },
  { id: 'vignette', name: 'Vignette', kind: 'effect', duration: 8, description: 'Edge darkening overlay' },
  { id: 'glow', name: 'Glow', kind: 'effect', duration: 3, description: 'Soft light bloom' },
  { id: 'ken-burns', name: 'Ken Burns', kind: 'effect', duration: 6, description: 'Slow zoom and pan' },
]

export const AUDIO_BEDS: GraphicDef[] = [
  { id: 'bgm-upbeat', name: 'Upbeat Bed', kind: 'template', duration: 30, description: 'Placeholder music bed' },
  { id: 'bgm-cinematic', name: 'Cinematic Score', kind: 'template', duration: 30, description: 'Placeholder score' },
  { id: 'sfx-whoosh', name: 'Whoosh', kind: 'template', duration: 2, description: 'Transition sting' },
  { id: 'sfx-reveal', name: 'Logo Reveal', kind: 'template', duration: 3, description: 'Hit for logo' },
]

export function findGraphic(id: string): GraphicDef | undefined {
  return [...TEMPLATES, ...EFFECTS, ...AUDIO_BEDS].find((g) => g.id === id)
}
