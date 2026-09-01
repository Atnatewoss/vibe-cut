import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

function useSpring(frame: number, fps: number, delay = 0) {
  return spring({
    fps,
    frame: frame - delay,
    config: { damping: 18, stiffness: 120, mass: 0.8 },
  })
}

export function LaunchReveal({ title = 'Vibecut', subtitle = 'Cursor for video' }: { title?: string; subtitle?: string }) {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const enter = useSpring(frame, fps, 4)
  const sub = useSpring(frame, fps, 12)
  const line = interpolate(frame, [8, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill style={{ background: '#0b0b10', opacity: fadeOut, justifyContent: 'center', padding: 120 }}>
      <div
        style={{
          width: interpolate(line, [0, 1], [0, 180]),
          height: 3,
          background: '#6c9eeb',
          marginBottom: 28,
          borderRadius: 2,
        }}
      />
      <div
        style={{
          fontSize: 92,
          fontWeight: 600,
          color: '#eff0f4',
          letterSpacing: -2.4,
          transform: `translateY(${(1 - enter) * 36}px)`,
          opacity: enter,
          fontFamily: 'Geist, Inter, system-ui, sans-serif',
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 18,
          fontSize: 32,
          color: '#959baa',
          transform: `translateY(${(1 - sub) * 20}px)`,
          opacity: sub,
          fontFamily: 'Geist, Inter, system-ui, sans-serif',
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  )
}

export function FeatureTease({
  kicker = '01',
  title = 'Live timeline',
  body = 'Edit motion as code. Preview it as film.',
}: {
  kicker?: string
  title?: string
  body?: string
}) {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const enter = useSpring(frame, fps, 2)
  const fadeOut = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(160deg, #12121a 0%, #0b0b10 70%)',
        opacity: fadeOut,
        justifyContent: 'center',
        padding: 140,
      }}
    >
      <div
        style={{
          transform: `translateX(${(1 - enter) * -40}px)`,
          opacity: enter,
        }}
      >
        <div style={{ fontSize: 22, color: '#6c9eeb', letterSpacing: 3, fontFamily: 'Geist Mono, ui-monospace, monospace' }}>
          {kicker}
        </div>
        <div style={{ marginTop: 16, fontSize: 72, fontWeight: 600, color: '#eff0f4', letterSpacing: -1.6 }}>
          {title}
        </div>
        <div style={{ marginTop: 18, fontSize: 28, color: '#959baa', maxWidth: 820 }}>{body}</div>
      </div>
    </AbsoluteFill>
  )
}

export function FounderStory({
  quote = 'We needed a launch film that looked like the product.',
  name = 'Founder',
  role = 'Indie hacker',
}: {
  quote?: string
  name?: string
  role?: string
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const enter = useSpring(frame, fps, 6)

  return (
    <AbsoluteFill style={{ background: '#0e0e12', justifyContent: 'flex-end', padding: 100 }}>
      <div
        style={{
          width: 1100,
          transform: `translateY(${(1 - enter) * 30}px)`,
          opacity: enter,
        }}
      >
        <div style={{ fontSize: 44, color: '#d4d7de', lineHeight: 1.35, fontWeight: 500 }}>{quote}</div>
        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 36, height: 2, background: '#6c9eeb' }} />
          <div style={{ fontSize: 22, color: '#eff0f4' }}>{name}</div>
          <div style={{ fontSize: 20, color: '#5c6274' }}>{role}</div>
        </div>
      </div>
    </AbsoluteFill>
  )
}

export function EndCard({ title = 'Start building', cta = 'vibecut.app' }: { title?: string; cta?: string }) {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const enter = useSpring(frame, fps, 3)
  const pulse = interpolate(Math.sin(frame / 8), [-1, 1], [0.86, 1])
  const fadeOut = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        background: '#0b0b10',
        opacity: fadeOut,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: 22,
          background: '#6c9eeb',
          opacity: pulse,
          marginBottom: 36,
          transform: `scale(${enter})`,
        }}
      />
      <div style={{ fontSize: 64, fontWeight: 600, color: '#eff0f4', opacity: enter }}>{title}</div>
      <div style={{ marginTop: 14, fontSize: 26, color: '#6c9eeb', fontFamily: 'Geist Mono, ui-monospace, monospace' }}>
        {cta}
      </div>
    </AbsoluteFill>
  )
}

export function LowerThird({ name = 'Alex Chen', role = 'Founder, Northline' }: { name?: string; role?: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const enter = useSpring(frame, fps, 0)

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', padding: 80 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          transform: `translateX(${(1 - enter) * -80}px)`,
          opacity: enter,
        }}
      >
        <div style={{ width: 6, background: '#6c9eeb' }} />
        <div style={{ background: 'rgba(17,17,22,0.92)', padding: '22px 32px 22px 28px' }}>
          <div style={{ fontSize: 36, fontWeight: 600, color: '#eff0f4' }}>{name}</div>
          <div style={{ marginTop: 6, fontSize: 22, color: '#959baa' }}>{role}</div>
        </div>
      </div>
    </AbsoluteFill>
  )
}

export function FadeOverlay({ mode }: { mode: 'in' | 'out' | 'dissolve' }) {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  const opacity =
    mode === 'in'
      ? interpolate(frame, [0, durationInFrames], [1, 0], { extrapolateRight: 'clamp' })
      : mode === 'out'
        ? interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: 'clamp' })
        : interpolate(frame, [0, durationInFrames / 2, durationInFrames], [0.7, 0.2, 0.7], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })

  return <AbsoluteFill style={{ background: '#0b0b10', opacity, pointerEvents: 'none' }} />
}

export function VignetteOverlay() {
  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.62) 100%)',
        pointerEvents: 'none',
      }}
    />
  )
}

export function GlowOverlay() {
  const frame = useCurrentFrame()
  const opacity = interpolate(Math.sin(frame / 10), [-1, 1], [0.12, 0.28])
  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(circle at 50% 40%, rgba(108,158,235,0.35), transparent 55%)',
        opacity,
        pointerEvents: 'none',
      }}
    />
  )
}

export function KenBurnsStill({ src, label }: { src?: string; label: string }) {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.12], { extrapolateRight: 'clamp' })
  const x = interpolate(frame, [0, durationInFrames], [0, -40], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ background: '#111118', overflow: 'hidden' }}>
      {src ? (
        <img
          src={src}
          alt={label}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `translateX(${x}px) scale(${scale})`,
          }}
        />
      ) : (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', color: '#5c6274', fontSize: 28 }}>
          {label}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  )
}

export function MediaPlaceholder({ label, kind }: { label: string; kind: string }) {
  const frame = useCurrentFrame()
  const shift = interpolate(frame, [0, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${140 + shift * 20}deg, #16161e 0%, #0e1424 55%, #111116 100%)`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, letterSpacing: 4, color: '#5c6274', marginBottom: 16, fontFamily: 'Geist Mono, ui-monospace, monospace' }}>
          {kind.toUpperCase()}
        </div>
        <div style={{ fontSize: 42, color: '#d4d7de', fontWeight: 500 }}>{label}</div>
      </div>
    </AbsoluteFill>
  )
}

export function AudioBed({ label }: { label: string }) {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: '#0d1118', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
        {Array.from({ length: 42 }).map((_, i) => {
          const h = 18 + Math.abs(Math.sin((frame + i * 4) / 6)) * 90
          return (
            <div
              key={i}
              style={{
                width: 8,
                height: h,
                borderRadius: 4,
                background: 'rgba(108,158,235,0.45)',
              }}
            />
          )
        })}
      </div>
      <div style={{ marginTop: 28, color: '#959baa', fontSize: 24 }}>{label}</div>
    </AbsoluteFill>
  )
}

export function MeshGradientShader() {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()

  const x1 = interpolate(Math.sin(frame / 30), [-1, 1], [0, 100])
  const y1 = interpolate(Math.cos(frame / 40), [-1, 1], [0, 100])
  
  const x2 = interpolate(Math.sin(frame / 20 + 2), [-1, 1], [10, 90])
  const y2 = interpolate(Math.cos(frame / 25 + 1), [-1, 1], [10, 90])

  const x3 = interpolate(Math.sin(frame / 35 + 4), [-1, 1], [20, 80])
  const y3 = interpolate(Math.cos(frame / 45 + 3), [-1, 1], [20, 80])

  const fadeOut = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill style={{ backgroundColor: '#09090b', overflow: 'hidden', opacity: fadeOut }}>
      <div
        style={{
          position: 'absolute',
          top: `${y1}%`,
          left: `${x1}%`,
          width: '80%',
          height: '80%',
          background: 'rgba(108, 158, 235, 0.4)', // Blue
          borderRadius: '50%',
          filter: 'blur(100px)',
          transform: 'translate(-50%, -50%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: `${y2}%`,
          left: `${x2}%`,
          width: '70%',
          height: '70%',
          background: 'rgba(167, 139, 250, 0.4)', // Purple
          borderRadius: '50%',
          filter: 'blur(120px)',
          transform: 'translate(-50%, -50%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: `${y3}%`,
          left: `${x3}%`,
          width: '90%',
          height: '90%',
          background: 'rgba(52, 211, 153, 0.3)', // Emerald
          borderRadius: '50%',
          filter: 'blur(140px)',
          transform: 'translate(-50%, -50%)',
        }}
      />
      
      {/* Noise overlay for texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.15,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
        }}
      />
    </AbsoluteFill>
  )
}
