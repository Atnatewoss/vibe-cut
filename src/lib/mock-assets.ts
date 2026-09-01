import type { GraphicDef } from './graphics'

const TEMPLATE_NAMES = [
  'Typography Component', 'Layout Component', 'UI Primitive', 'Transition Component',
  'Filter Component', 'Remocn Scene', 'App Screen Sim', 'Kinetic Typography',
  // Remocn Icons
  'Icon - Check', 'Icon - X', 'Icon - Heart', 'Icon - Star', 'Icon - Search',
  'Icon - Bell', 'Icon - Download', 'Icon - Copy', 'Icon - Trash', 'Icon - Plus',
  'Icon - Send', 'Icon - Loader', 'Icon - Play', 'Icon - Settings',
  'Icon - Thumbs Up', 'Icon - Party Popper', 'Icon - Arrow Right', 'Icon - Refresh Cw'
]

const EFFECT_NAMES = [
  'Remocn Effect', 'Fade In', 'Fade Out', 'Cross Dissolve', 'Zoom Blur',
  // Remocn Shaders
  'Mesh Gradient Shader', 'Grain Gradient Shader', 'Warp Shader', 'Swirl Shader',
  'Water Shader', 'Spiral Shader', 'Liquid Metal Shader', 'Color Panels Shader',
  'Neuro Noise Shader', 'Perlin Noise Shader', 'Simplex Noise Shader',
  'Voronoi Shader', 'Dot Orbit Shader', 'Dithering Shader', 'God Rays Shader',
  'Smoke Ring Shader', 'Metaballs Shader', 'Pulsing Border Shader',
  'Caustics Shader', 'Gem Smoke Shader', 'Strata Shader', 'Weave Shader'
]

const AUDIO_CATEGORIES = [
  'Cinematic', 'Upbeat', 'Corporate', 'Ambient', 'Lo-Fi', 'Electronic', 'Acoustic'
]

const SFX_CATEGORIES = [
  'Whoosh', 'Hit', 'Riser', 'Glitch', 'UI Click', 'Pop', 'Swoosh', 'Impact'
]

function generateTemplates(count: number): GraphicDef[] {
  return Array.from({ length: count }).map((_, i) => {
    const name = TEMPLATE_NAMES[i % TEMPLATE_NAMES.length]
    return {
      id: `template-${i}`,
      name: `${name} ${Math.floor(i / TEMPLATE_NAMES.length) + 1}`,
      kind: 'template',
      duration: 3 + Math.floor(Math.random() * 7), // 3-9s
      description: `A highly customizable ${name.toLowerCase()} component.`,
    }
  })
}

function generateEffects(count: number): GraphicDef[] {
  return Array.from({ length: count }).map((_, i) => {
    const name = EFFECT_NAMES[i % EFFECT_NAMES.length]
    return {
      id: `effect-${i}`,
      name: `${name} ${Math.floor(i / EFFECT_NAMES.length) + 1}`,
      kind: 'effect',
      duration: 0.5 + Math.random() * 4, // 0.5-4.5s
      description: `Adds a ${name.toLowerCase()} filter.`,
    }
  })
}

function generateAudioBeds(count: number): GraphicDef[] {
  return Array.from({ length: count }).map((_, i) => {
    const category = AUDIO_CATEGORIES[i % AUDIO_CATEGORIES.length]
    return {
      id: `bgm-${i}`,
      name: `${category} Background ${Math.floor(i / AUDIO_CATEGORIES.length) + 1}`,
      kind: 'template',
      duration: 15 + Math.floor(Math.random() * 105), // 15-120s
      description: `High quality ${category.toLowerCase()} audio track.`,
    }
  })
}

function generateSFX(count: number): GraphicDef[] {
  return Array.from({ length: count }).map((_, i) => {
    const category = SFX_CATEGORIES[i % SFX_CATEGORIES.length]
    return {
      id: `sfx-${i}`,
      name: `${category} ${Math.floor(i / SFX_CATEGORIES.length) + 1}`,
      kind: 'template', // Using template for audio beds/sfx per current data structure
      duration: 0.2 + Math.random() * 3, // 0.2-3.2s
      description: `Short ${category.toLowerCase()} sound effect.`,
    }
  })
}

export const MOCK_TEMPLATES = generateTemplates(500)
export const MOCK_EFFECTS = generateEffects(500)
export const MOCK_AUDIO_BEDS = [...generateAudioBeds(500), ...generateSFX(500)]
