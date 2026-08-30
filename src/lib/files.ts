export type MediaKind = 'video' | 'audio' | 'image'

export type LibraryTab = 'media' | 'effects' | 'audio' | 'templates'

export type AssetKind = 'video' | 'image' | 'audio' | 'effect' | 'template'

type BaseAsset = {
  id: string
  name: string
  kind: AssetKind
  icon: string
  tag?: string
}

export type MediaAsset = BaseAsset & {
  kind: 'video' | 'image'
  duration?: string
  type: MediaKind
  thumb: number
}

export type EffectAsset = BaseAsset & {
  kind: 'effect'
  category: 'Transition' | 'Text' | 'Filter'
}

export type AudioAsset = BaseAsset & {
  kind: 'audio'
  duration: string
  bpm?: number
  type: 'audio'
}

export type TemplateAsset = BaseAsset & {
  kind: 'template'
  duration: string
}

export type LibraryAsset = MediaAsset | EffectAsset | AudioAsset | TemplateAsset

export const mediaAssets: MediaAsset[] = [
  { id: 'm1', name: 'product-demo.mp4', kind: 'video', type: 'video', duration: '00:12', icon: 'video', thumb: 0 },
  { id: 'm2', name: 'b-roll-office.mp4', kind: 'video', type: 'video', duration: '00:08', icon: 'video', thumb: 1 },
  { id: 'm3', name: 'founder-talking.mp4', kind: 'video', type: 'video', duration: '00:15', icon: 'video', thumb: 2 },
  { id: 'm4', name: 'logo-white.svg', kind: 'image', type: 'image', icon: 'image', thumb: 3 },
  { id: 'm5', name: 'app-screenshot.png', kind: 'image', type: 'image', icon: 'image', thumb: 4 },
  { id: 'm6', name: 'gradient-bg.mp4', kind: 'video', type: 'video', duration: '00:06', icon: 'video', thumb: 5 },
]

export const effectAssets: EffectAsset[] = [
  { id: 'e1', name: 'Fade', kind: 'effect', icon: 'fade', category: 'Transition' },
  { id: 'e2', name: 'Wipe Up', kind: 'effect', icon: 'fade', category: 'Transition' },
  { id: 'e3', name: 'Slide In', kind: 'effect', icon: 'fade', category: 'Transition' },
  { id: 'e4', name: 'Ken Burns', kind: 'effect', icon: 'filter', category: 'Filter' },
  { id: 'e5', name: 'Blur Bokeh', kind: 'effect', icon: 'filter', category: 'Filter' },
  { id: 'e6', name: 'Title In', kind: 'effect', icon: 'text', category: 'Text' },
  { id: 'e7', name: 'Lower Third', kind: 'effect', icon: 'text', category: 'Text' },
  { id: 'e8', name: 'Captions', kind: 'effect', icon: 'text', category: 'Text' },
]

export const audioAssets: AudioAsset[] = [
  { id: 'a1', name: 'energy-upbeat.wav', kind: 'audio', type: 'audio', duration: '00:32', bpm: 128, icon: 'audio' },
  { id: 'a2', name: 'founder-interview.wav', kind: 'audio', type: 'audio', duration: '01:20', icon: 'audio' },
  { id: 'a3', name: 'whoosh-transition.mp3', kind: 'audio', type: 'audio', duration: '00:02', icon: 'audio' },
  { id: 'a4', name: 'soft-piano.mp3', kind: 'audio', type: 'audio', duration: '00:45', bpm: 72, icon: 'audio' },
]

export const templateAssets: TemplateAsset[] = [
  { id: 't1', name: 'Launch Reveal', kind: 'template', icon: 'rocket', duration: '00:30' },
  { id: 't2', name: 'Feature Tease', kind: 'template', icon: 'layout', duration: '00:45' },
  { id: 't3', name: 'Founder Story', kind: 'template', icon: 'user', duration: '01:00' },
  { id: 't4', name: 'B-Roll Montage', kind: 'template', icon: 'film', duration: '00:20' },
]

export const draggableLabel = (kind: LibraryAsset['kind']) =>
  kind === 'video' || kind === 'image'
    ? 'media'
    : kind === 'effect'
      ? 'effect'
      : kind === 'template'
        ? 'template'
        : 'audio'
