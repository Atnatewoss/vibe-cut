export type GraphicKind = 'template' | 'effect'

export type GraphicDef = {
  id: string
  name: string
  kind: GraphicKind
  duration: number
  description: string
}

import { MOCK_TEMPLATES, MOCK_EFFECTS, MOCK_AUDIO_BEDS } from './mock-assets'

export const TEMPLATES: GraphicDef[] = MOCK_TEMPLATES
export const EFFECTS: GraphicDef[] = MOCK_EFFECTS
export const AUDIO_BEDS: GraphicDef[] = MOCK_AUDIO_BEDS

export function findGraphic(id: string): GraphicDef | undefined {
  return [...TEMPLATES, ...EFFECTS, ...AUDIO_BEDS].find((g) => g.id === id)
}
