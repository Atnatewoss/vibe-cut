import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import * as Icons from 'lucide-react'

// Helper for smooth entry animations
function useSpring(frame: number, fps: number, delay = 0) {
  return spring({
    fps,
    frame: frame - delay,
    config: { damping: 18, stiffness: 120, mass: 0.8 },
  })
}

// -----------------------------------------------------------------
// 1. SHADERS (Generative Engine)
// -----------------------------------------------------------------
export function RemocnShader({ type }: { type: string }) {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()

  const fadeOut = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Dynamic values based on frame
  const shift = interpolate(frame, [0, durationInFrames], [0, 100])
  const pulse = interpolate(Math.sin(frame / 20), [-1, 1], [0.8, 1.2])

  let content = null
  let filterDef = null

  // Route by type (lowercased)
  const t = type.toLowerCase()

  if (t.includes('mesh gradient')) {
    const x1 = interpolate(Math.sin(frame / 30), [-1, 1], [0, 100])
    const y1 = interpolate(Math.cos(frame / 40), [-1, 1], [0, 100])
    content = (
      <>
        <div style={{ position: 'absolute', top: `${y1}%`, left: `${x1}%`, width: '80%', height: '80%', background: 'rgba(108,158,235,0.4)', borderRadius: '50%', filter: 'blur(100px)', transform: 'translate(-50%, -50%)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: '70%', height: '70%', background: 'rgba(167,139,250,0.4)', borderRadius: '50%', filter: 'blur(120px)', transform: 'translate(-50%, -50%)' }} />
      </>
    )
  } else if (t.includes('grain gradient')) {
    content = <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(45deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)', opacity: 0.8 }} />
    filterDef = `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch"/></filter>`
  } else if (t.includes('swirl') || t.includes('warp') || t.includes('water')) {
    content = <div style={{ position: 'absolute', inset: 0, background: '#09090b', backgroundImage: `radial-gradient(circle at ${50 + Math.sin(frame/20)*20}% ${50 + Math.cos(frame/20)*20}%, #3b82f6, transparent 40%)` }} />
    filterDef = `<filter id="swirl"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="${50 * pulse}" xChannelSelector="R" yChannelSelector="G" /></filter>`
  } else if (t.includes('noise') || t.includes('simplex') || t.includes('perlin')) {
    content = <div style={{ position: 'absolute', inset: 0, background: '#111' }} />
    filterDef = `<filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="${0.05 + Math.sin(frame/10)*0.01}" numOctaves="4" stitchTiles="stitch"/></filter>`
  } else if (t.includes('voronoi') || t.includes('caustics') || t.includes('metaball')) {
    content = <div style={{ position: 'absolute', inset: 0, background: '#0ea5e9' }} />
    filterDef = `<filter id="voronoi"><feTurbulence type="turbulence" baseFrequency="0.015" numOctaves="2" seed="${frame/10}" result="turbulence"/><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 100 -50" in="turbulence"/></filter>`
  } else if (t.includes('god rays')) {
    content = (
      <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'hidden' }}>
         <div style={{ position: 'absolute', top: '-50%', left: '50%', width: 400, height: 1000, background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)', transform: `translateX(-50%) rotate(${20 + Math.sin(frame/40)*10}deg)`, filter: 'blur(30px)' }} />
      </div>
    )
  } else if (t.includes('pulsing border')) {
    content = (
      <div style={{ position: 'absolute', inset: 20, border: `${10 * pulse}px solid rgba(108,158,235,${pulse*0.5})`, borderRadius: 40, boxShadow: `0 0 ${40*pulse}px rgba(108,158,235,0.4)` }} />
    )
  } else {
    // Generic fallback Shader
    content = <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(${shift}deg, #1e1b4b, #312e81, #1e1b4b)` }} />
  }

  return (
    <AbsoluteFill style={{ backgroundColor: '#09090b', opacity: fadeOut, overflow: 'hidden' }}>
      {content}
      {filterDef && (
        <div
          style={{ position: 'absolute', inset: 0, opacity: t.includes('grain') ? 0.3 : 1 }}
          dangerouslySetInnerHTML={{
            __html: `<svg width="100%" height="100%"><defs>${filterDef}</defs><rect width="100%" height="100%" filter="url(#${filterDef.match(/id="([^"]+)"/)?.[1]})"/></svg>`
          }}
        />
      )}
    </AbsoluteFill>
  )
}

// -----------------------------------------------------------------
// 2. ICONS (Dynamic Lucide loader)
// -----------------------------------------------------------------
export function RemocnIcon({ name }: { name: string }) {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const enter = useSpring(frame, fps, 3)
  
  // Parse "Icon - Check" -> "Check" -> "Check"
  const cleanName = name.replace('Icon - ', '').trim()
  
  // Simple mapping to Lucide component names
  const iconMap: Record<string, keyof typeof Icons> = {
    'Check': 'Check', 'X': 'X', 'Heart': 'Heart', 'Star': 'Star', 'Search': 'Search',
    'Bell': 'Bell', 'Download': 'Download', 'Copy': 'Copy', 'Trash': 'Trash',
    'Plus': 'Plus', 'Send': 'Send', 'Loader': 'Loader2', 'Play': 'Play',
    'Settings': 'Settings', 'Thumbs Up': 'ThumbsUp', 'Party Popper': 'PartyPopper',
    'Arrow Right': 'ArrowRight', 'Refresh Cw': 'RefreshCw'
  }
  
  // Use index signature correctly, fallback to Sparkles if not found
  const IconComponent = (Icons as any)[iconMap[cleanName]] || Icons.Sparkles

  const fadeOut = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const pulse = cleanName === 'Loader' ? frame * 6 : 0 // Spin loader

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: fadeOut, background: 'rgba(11, 11, 16, 0.4)' }}>
      <div
        style={{
          width: 140,
          height: 140,
          background: 'rgba(108,158,235,0.1)',
          border: '1px solid rgba(108,158,235,0.2)',
          borderRadius: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${enter}) rotate(${pulse}deg)`,
          boxShadow: '0 0 60px rgba(108,158,235,0.15)'
        }}
      >
        <IconComponent size={64} color="#6c9eeb" strokeWidth={1.5} />
      </div>
    </AbsoluteFill>
  )
}

// -----------------------------------------------------------------
// 3. PRIMITIVES (Components)
// -----------------------------------------------------------------
export function RemocnPrimitive({ type }: { type: string }) {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const enter = useSpring(frame, fps, 4)
  
  const fadeOut = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const t = type.toLowerCase()
  
  let layout = null
  
  if (t.includes('typography')) {
    layout = (
      <div style={{ textAlign: 'center', transform: `translateY(${(1 - enter) * 40}px)`, opacity: enter }}>
        <div style={{ fontSize: 92, fontWeight: 700, color: '#fff', letterSpacing: -2 }}>Typography</div>
        <div style={{ fontSize: 32, color: '#888', marginTop: 16 }}>Remocn Component Engine</div>
      </div>
    )
  } else if (t.includes('layout') || t.includes('ui')) {
    layout = (
      <div style={{ width: 800, height: 400, background: '#16161e', borderRadius: 24, border: '1px solid #2a2a35', padding: 40, transform: `scale(${enter})`, opacity: enter, display: 'flex', gap: 24 }}>
        <div style={{ width: 300, background: '#1e1e28', borderRadius: 12 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
           <div style={{ height: 40, background: '#2a2a35', borderRadius: 8 }} />
           <div style={{ height: 20, width: '70%', background: '#1e1e28', borderRadius: 4 }} />
           <div style={{ height: 20, width: '50%', background: '#1e1e28', borderRadius: 4 }} />
        </div>
      </div>
    )
  } else {
    // Transitions / Filters placeholder
    layout = (
       <div style={{ fontSize: 48, color: '#6c9eeb', opacity: enter, letterSpacing: 4, textTransform: 'uppercase' }}>
         {type}
       </div>
    )
  }

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: fadeOut, background: '#0b0b10' }}>
       {layout}
    </AbsoluteFill>
  )
}
