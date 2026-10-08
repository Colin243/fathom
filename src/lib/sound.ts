// Tiny synthesized sound effects. No audio files.
import { storage } from './storage'
import type { TierId } from './match'
import { TIERS } from './tiers'

let ctx: AudioContext | null = null
let muted = storage.muted()

function audio(): AudioContext | null {
  if (muted) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.08, slideTo?: number) {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime + start
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(ac.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

export const sound = {
  isMuted: () => muted,
  setMuted(v: boolean) {
    muted = v
    storage.setMuted(v)
  },
  unlock() {
    audio()
  },
  bubble() {
    tone(320, 0, 0.12, 'sine', 0.07, 900)
    tone(520, 0.07, 0.1, 'sine', 0.05, 1300)
  },
  reject() {
    tone(180, 0, 0.18, 'triangle', 0.08, 110)
  },
  tick() {
    tone(1200, 0, 0.04, 'square', 0.025)
  },
  reveal(tier: TierId | null) {
    if (!tier) {
      tone(220, 0, 0.35, 'triangle', 0.07, 140)
      return
    }
    const steps = Math.max(1, Math.round(TIERS[tier].points / 20))
    const scale = [392, 494, 587, 659, 784, 988]
    for (let i = 0; i < steps; i++) tone(scale[i], i * 0.09, 0.32, 'sine', 0.06)
    if (tier === 'leviathan') tone(98, 0, 1.2, 'sawtooth', 0.035, 65)
  },
  surface() {
    tone(260, 0, 0.5, 'sine', 0.05, 780)
  },
}
