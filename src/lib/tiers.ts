import type { TierId } from './match'

export interface TierMeta {
  id: TierId
  name: string
  points: number
  color: string
  emoji: string
  blurb: string
}

export const TIERS: Record<TierId, TierMeta> = {
  seafoam: { id: 'seafoam', name: 'Seafoam', points: 10, color: '#cfe3ea', emoji: '🫧', blurb: 'Floats right on top. Everyone said that.' },
  bait: { id: 'bait', name: 'Took the bait', points: 15, color: '#f6c86b', emoji: '🎣', blurb: 'Felt clever. Half the ocean thought so too.' },
  shoal: { id: 'shoal', name: 'Shoal', points: 30, color: '#6fe0d2', emoji: '🐟', blurb: 'Solid. You swim with a healthy crowd.' },
  rare: { id: 'rare', name: 'Rare', points: 60, color: '#ff8a7a', emoji: '🐠', blurb: 'Past the thermocline. Few divers get here.' },
  deep: { id: 'deep', name: 'Deep cut', points: 85, color: '#b892ff', emoji: '🦑', blurb: 'The pressure suits you. Seriously obscure.' },
  leviathan: { id: 'leviathan', name: 'Leviathan', points: 100, color: '#ffe27a', emoji: '🐉', blurb: 'A legend of the trench. Nobody else saw that.' },
}

export const MISS = { name: 'Nothing surfaced', emoji: '⬛', blurb: 'The clock got there first.' }

export const METRES_PER_POINT = 10
export const ROUNDS = 7
export const ROUND_SECONDS = 25
export const MAX_DEPTH = ROUNDS * 100 * METRES_PER_POINT

export interface Band {
  min: number
  name: string
  line: string
  tier: TierId
}

// Overall result bands, by total points.
export const BANDS: Band[] = [
  { min: 0, name: 'Seafoam', line: 'Still splashing at the surface. Plenty of ocean below.', tier: 'seafoam' },
  { min: 151, name: 'Shoal', line: 'Swimming comfortably with the crowd.', tier: 'shoal' },
  { min: 251, name: 'Rare', line: 'Below the light. The water is getting interesting.', tier: 'rare' },
  { min: 351, name: 'Deep cut', line: 'Midnight-zone thinking. Genuinely odd brain.', tier: 'deep' },
  { min: 450, name: 'Leviathan', line: 'Trench dweller. Your friends should be worried.', tier: 'leviathan' },
]

export function bandFor(score: number): Band {
  let band = BANDS[0]
  for (const b of BANDS) if (score >= b.min) band = b
  return band
}
