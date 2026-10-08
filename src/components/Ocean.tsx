import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, type CSSProperties } from 'react'
import type { TierId } from '../lib/match'
import { TIER_ORDER } from '../lib/match'
import { MAX_DEPTH, METRES_PER_POINT, TIERS } from '../lib/tiers'
import { BOAT, BOAT_PALETTE, FISH, JELLY, JELLY_PALETTE, Sprite } from './Sprite'

export const PPM = 1.6 // pixels per metre
const SKY_PX = 560
const FLOOR_EXTRA_M = 700
const COLUMN_PX = SKY_PX + (MAX_DEPTH + FLOOR_EXTRA_M) * PPM
const ANCHOR = 0.42 // player sits at this fraction of the viewport height

const yOf = (m: number) => SKY_PX + m * PPM

interface Marker {
  m: number
  text: string
  zone?: boolean
}

const MARKERS: Marker[] = [
  { m: 40, text: 'recreational divers turn back around here' },
  { m: 120, text: 'reds and oranges have vanished from the light' },
  { m: 200, text: 'THE TWILIGHT ZONE', zone: true },
  { m: 300, text: 'lanternfish rise from here every night' },
  { m: 450, text: 'leatherback turtles have dived this deep' },
  { m: 600, text: 'the water outside is pressing at 60 atmospheres' },
  { m: 800, text: 'the last trace of sunlight gives out' },
  { m: 1000, text: 'THE MIDNIGHT ZONE', zone: true },
  { m: 1300, text: 'vampire squid drift, cloaked in webbing' },
  { m: 1600, text: 'anglerfish hang their lanterns' },
  { m: 2000, text: 'sperm whales hunt squid in total darkness' },
  { m: 2500, text: 'it is 3°C and has been for millennia' },
  { m: 2990, text: "Cuvier's beaked whales hold their breath to here" },
  { m: 3500, text: 'tripod fish stand on stilts in the current' },
  { m: 3800, text: 'the Titanic lies broken in two' },
  { m: 4000, text: 'THE ABYSSAL ZONE', zone: true },
  { m: 4500, text: 'dumbo octopuses flap their ear-fins' },
  { m: 5000, text: 'manganese nodules pave the plain' },
  { m: 5500, text: 'sea pigs trundle across the ooze' },
  { m: 6000, text: 'THE HADAL ZONE', zone: true },
  { m: 6400, text: 'amphipods the size of your hand scavenge here' },
  { m: 6800, text: 'snailfish glide, pale and unbothered' },
  { m: 7000, text: 'THE TRENCH FLOOR · a perfect dive', zone: true },
]

// Water color by depth, as gradient stops.
const WATER_STOPS: [number, string][] = [
  [0, '#2d97a8'],
  [150, '#1f6f8c'],
  [500, '#164a70'],
  [1000, '#0f2a4c'],
  [2500, '#0a1934'],
  [4000, '#070f24'],
  [6000, '#050a18'],
  [MAX_DEPTH, '#03050c'],
]

const COLUMN_BG = `linear-gradient(to bottom,
  #22123d 0px, #4a2160 ${SKY_PX * 0.35}px, #a1466d ${SKY_PX * 0.68}px, #f08a6c ${SKY_PX * 0.9}px, #ffc08a ${SKY_PX}px,
  ${WATER_STOPS.map(([m, c]) => `${c} ${yOf(m)}px`).join(', ')},
  #020308 ${COLUMN_PX}px)`

interface FishSpec {
  m: number
  size: number
  dur: number
  delay: number
  dir: 1 | -1
  color: string
  glow: boolean
}

function makeFish(): FishSpec[] {
  let s = 7
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const glowColors = ['#6fe0d2', '#b892ff', '#ff7aa8', '#8fd3ff']
  const out: FishSpec[] = []
  for (let i = 0; i < 70; i++) {
    const m = 15 + Math.pow(rand(), 1.6) * (MAX_DEPTH - 100)
    const glow = m > 900
    out.push({
      m,
      size: 2 + Math.floor(rand() * 3),
      dur: 22 + rand() * 40,
      delay: -rand() * 60,
      dir: rand() > 0.5 ? 1 : -1,
      color: glow ? glowColors[Math.floor(rand() * glowColors.length)] : m < 250 ? '#0d3a52' : '#0a2238',
      glow,
    })
  }
  return out
}

const Scenery = memo(function Scenery() {
  const fish = useMemo(makeFish, [])
  const ticks = useMemo(() => {
    const t: number[] = []
    for (let m = 0; m <= MAX_DEPTH; m += 50) t.push(m)
    return t
  }, [])
  return (
    <>
      <div className="sky">
        <div className="sun" />
        <div className="cloud c1" />
        <div className="cloud c2" />
        <div className="cloud c3" />
        <div className="stars" />
      </div>
      <div className="surface" style={{ top: SKY_PX - 10 }}>
        <div className="waves" />
      </div>
      <div className="boat" style={{ top: SKY_PX - 34 }}>
        <Sprite grid={BOAT} palette={BOAT_PALETTE} px={4} />
      </div>
      <div className="rays" style={{ top: SKY_PX, height: 520 * PPM }} />
      <div className="snow" style={{ top: yOf(150), height: (MAX_DEPTH - 150 + FLOOR_EXTRA_M) * PPM }} />
      {fish.map((f, i) => (
        <div
          key={i}
          className={`fish ${f.dir < 0 ? 'rev' : ''} ${f.glow ? 'glow' : ''}`}
          style={{ top: yOf(f.m), '--dur': `${f.dur}s`, '--delay': `${f.delay}s`, color: f.color } as CSSProperties}
        >
          <Sprite grid={FISH} palette={{ a: 'currentColor' }} px={f.size} />
        </div>
      ))}
      {MARKERS.map((mk, i) => (
        <div
          key={mk.m}
          className={`marker ${i % 2 ? 'right' : 'left'} ${mk.zone ? 'zone' : ''}`}
          style={{ top: yOf(mk.m) }}
        >
          {i % 2 ? `${mk.text} ──` : `── ${mk.text}`}
        </div>
      ))}
      <div className="ruler" style={{ top: SKY_PX, height: MAX_DEPTH * PPM }}>
        {ticks.map((m) => (
          <div key={m} className={`tick ${m % 100 ? 'minor' : ''}`} style={{ top: m * PPM }}>
            {m % 100 === 0 && <span>{m === 0 ? '0m' : `-${m.toLocaleString()}m`}</span>}
          </div>
        ))}
      </div>
      <div className="floor" style={{ top: yOf(MAX_DEPTH) - 40 }} />
    </>
  )
})

export interface OceanHandle {
  glide: (toMetres: number, ms: number) => Promise<void>
  jump: (toMetres: number) => void
}

interface OceanProps {
  initial: number
  onDepth?: (m: number) => void
  tierBase?: number | null
  landed?: TierId | null
  showPlayer: boolean
  sinking: boolean
  chip?: string | null
  dim?: boolean
}

export const Ocean = forwardRef<OceanHandle, OceanProps>(function Ocean(
  { initial, onDepth, tierBase, landed, showPlayer, sinking, chip, dim },
  ref,
) {
  const columnRef = useRef<HTMLDivElement>(null)
  const camera = useRef(initial)
  const raf = useRef(0)
  const onDepthRef = useRef(onDepth)
  onDepthRef.current = onDepth

  const apply = () => {
    const el = columnRef.current
    if (!el) return
    const anchor = window.innerHeight * ANCHOR
    el.style.transform = `translate3d(0, ${Math.round(anchor - yOf(camera.current))}px, 0)`
    onDepthRef.current?.(Math.max(0, camera.current))
  }

  useEffect(() => {
    apply()
    const onResize = () => apply()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf.current)
    }
  }, [])

  useImperativeHandle(ref, () => ({
    jump(to) {
      cancelAnimationFrame(raf.current)
      camera.current = to
      apply()
    },
    glide(to, ms) {
      cancelAnimationFrame(raf.current)
      const from = camera.current
      const start = performance.now()
      return new Promise<void>((resolve) => {
        if (ms <= 0 || from === to) {
          camera.current = to
          apply()
          resolve()
          return
        }
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / ms)
          const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
          camera.current = from + (to - from) * e
          apply()
          if (t < 1) raf.current = requestAnimationFrame(step)
          else resolve()
        }
        raf.current = requestAnimationFrame(step)
      })
    },
  }))

  return (
    <div className={`ocean ${dim ? 'dim' : ''}`} aria-hidden>
      <div className="column" ref={columnRef} style={{ height: COLUMN_PX, background: COLUMN_BG }}>
        <Scenery />
        {tierBase != null &&
          TIER_ORDER.map((t) => (
            <div
              key={t}
              className={`tierline ${landed === t ? 'hit' : ''}`}
              style={{ top: yOf(tierBase + TIERS[t].points * METRES_PER_POINT), '--c': TIERS[t].color } as CSSProperties}
            >
              <span>
                {TIERS[t].name} · {TIERS[t].points}
              </span>
            </div>
          ))}
      </div>
      {showPlayer && (
        <div className={`player ${sinking ? 'sinking' : ''}`} style={{ top: `${ANCHOR * 100}%` }}>
          {sinking && (
            <div className="bubbles">
              <i />
              <i />
              <i />
              <i />
            </div>
          )}
          <Sprite grid={JELLY} palette={JELLY_PALETTE} px={3} className="jelly" />
          {chip && <div className="chip">“{chip}”</div>}
        </div>
      )}
    </div>
  )
})
