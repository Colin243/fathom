import { memo, type CSSProperties, type ReactElement } from 'react'
import type { TierId } from '../lib/match'

type Grid = string[]
type Palette = Record<string, string>

interface SpriteProps {
  grid: Grid
  palette: Palette
  px?: number
  className?: string
  style?: CSSProperties
  title?: string
}

// Renders a character grid as crisp SVG rects, merging horizontal runs.
export const Sprite = memo(function Sprite({ grid, palette, px = 4, className, style, title }: SpriteProps) {
  const w = Math.max(...grid.map((r) => r.length))
  const h = grid.length
  const rects: ReactElement[] = []
  grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      const fill = palette[ch]
      if (!fill) {
        x++
        continue
      }
      let end = x + 1
      while (end < row.length && row[end] === ch) end++
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={end - x} height={1} fill={fill} />)
      x = end
    }
  })
  return (
    <svg
      className={className}
      style={style}
      width={w * px}
      height={h * px}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rects}
    </svg>
  )
})

export const JELLY: Grid = [
  '....aaaaa....',
  '..aabbbbbaa..',
  '.abbbbbbbbba.',
  '.abbebbbebba.',
  'abbbbbbbbbbba',
  'abbbbbbbbbbba',
  'aaaaaaaaaaaaa',
  '.c.c.c.c.c.c.',
  '.c..c.c.c..c.',
  '..c.c...c.c..',
  '..c..c.c..c..',
  '.c...c.c...c.',
  '.c..c...c..c.',
  '..c.......c..',
]
export const JELLY_PALETTE: Palette = { a: '#ff7aa8', b: '#ffc2d6', c: '#ff9fbf', e: '#3a1030' }

export const FISH: Grid = ['..aaaa..a', '.aaaaaaaa', 'aa.aaaaa.', '.aaaaaaaa', '..aaaa..a']

export const BOAT: Grid = [
  '.........m............',
  '.........mff..........',
  '.........mfff.........',
  '.........m............',
  '......hhhhhhh.........',
  '......hwhwhwh.........',
  '.hhhhhhhhhhhhhhhhhhhh.',
  '..hhhhhhhhhhhhhhhhhh..',
  '...hhhhhhhhhhhhhhhh...',
]
export const BOAT_PALETTE: Palette = { m: '#2a1f3d', f: '#ff7a6b', h: '#1d1630', w: '#ffd58a' }

const TIER_GRIDS: Record<TierId, Grid> = {
  seafoam: [
    '....aaa.....',
    '...a...a....',
    '...a.b.a....',
    '...a...a....',
    '....aaa..aa.',
    '........a..a',
    '..aa....a..a',
    '.a..a....aa.',
    '.a..a.......',
    '..aa...aaa..',
    '......a...a.',
    '.......aaa..',
  ],
  bait: [
    '.....aa.....',
    '.....aa.....',
    '......a.....',
    '......a.....',
    '......a.....',
    '......a.....',
    '......a.....',
    '.a....a.....',
    '.aa...a.....',
    '..a..aa.....',
    '..aaaa......',
    '...aa.......',
  ],
  shoal: [
    '............',
    '....aaaa...a',
    '..aaaaaaa.aa',
    '.aa.aaaaaaaa',
    'aaaaaaaaaaaa',
    '.aaaaaaaa.aa',
    '..aaaaaa...a',
    '............',
  ],
  rare: [
    '....aa......',
    '...aaab.....',
    '..abaaba..a.',
    '.a.baabaaaa.',
    '.aabaabaaaa.',
    '..abaaba..a.',
    '...aaab.....',
    '....aa......',
  ],
  deep: [
    '.....aa.....',
    '....aaaa....',
    '...aaaaaa...',
    '...aaaaaa...',
    '...abaaba...',
    '...aaaaaa...',
    '...aaaaaa...',
    '..a.a..a.a..',
    '.a..a..a..a.',
    '.a.a....a.a.',
    'a..a....a..a',
    '...a....a...',
  ],
  leviathan: [
    '...........aa...',
    '..........aaaa..',
    '..........a.aab.',
    '...aa.....aaaa..',
    '..aaaa...aaa....',
    '.aa..aa.aaa.....',
    'aa....aaaa......',
    'a.......a.......',
  ],
}

export function TierIcon({ tier, px = 5, className }: { tier: TierId; px?: number; className?: string }) {
  const colors: Record<TierId, Palette> = {
    seafoam: { a: '#e6f4f8', b: '#ffffff' },
    bait: { a: '#f6c86b' },
    shoal: { a: '#6fe0d2' },
    rare: { a: '#ff8a7a', b: '#ffe0d6' },
    deep: { a: '#b892ff', b: '#1a0f33' },
    leviathan: { a: '#ffe27a', b: '#ffffff' },
  }
  return <Sprite grid={TIER_GRIDS[tier]} palette={colors[tier]} px={px} className={className} />
}
