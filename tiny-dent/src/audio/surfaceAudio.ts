import { tuning } from '../config/tuning'
import type { SurfaceKind } from '../content/surfaces'

// SUR-13: every material has a voice, synthesized at runtime so the game ships no sound files.
// A browser only lets audio start from a gesture, so the context waits for the first press anywhere.
const storageKey = 'tiny-dent:sound'
let context: AudioContext | null = null
let output: GainNode | null = null
let noise: AudioBuffer | null = null
let lastPlayed = 0

export const isSoundOn = () => localStorage.getItem(storageKey) !== 'off'
export function setSoundOn(on: boolean) {
  localStorage.setItem(storageKey, on ? 'on' : 'off')
}

function ensureContext() {
  if (context) return context
  context = new AudioContext()
  output = context.createGain()
  output.gain.value = tuning.surface.sound.volume
  output.connect(context.destination)
  noise = context.createBuffer(1, context.sampleRate * 0.5, context.sampleRate)
  const samples = noise.getChannelData(0)
  for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1
  return context
}

export function unlockSound() {
  if (isSoundOn()) void ensureContext().resume()
}

// One enveloped tone. `bend` is the frequency at the end of the note.
function tone(audio: AudioContext, wave: OscillatorType, frequency: number, bend: number, at: number, length: number, level: number) {
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.type = wave
  oscillator.frequency.setValueAtTime(frequency, at)
  oscillator.frequency.exponentialRampToValueAtTime(bend, at + length)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(level, at + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  oscillator.connect(gain).connect(output!)
  oscillator.start(at)
  oscillator.stop(at + length + 0.02)
}

// One enveloped burst of filtered noise.
function hiss(audio: AudioContext, type: BiquadFilterType, frequency: number, q: number, at: number, length: number, level: number) {
  const source = audio.createBufferSource()
  const filter = audio.createBiquadFilter()
  const gain = audio.createGain()
  source.buffer = noise
  source.loop = true
  filter.type = type
  filter.frequency.value = frequency
  filter.Q.value = q
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(level, at + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  source.connect(filter).connect(gain).connect(output!)
  source.start(at, Math.random() * 0.4)
  source.stop(at + length + 0.02)
}

const voices: Record<SurfaceKind, (audio: AudioContext, at: number, level: number) => void> = {
  rock: (audio, at, level) => {
    hiss(audio, 'lowpass', 420, 1, at, 0.14, level * 0.9)
    tone(audio, 'sine', 120, 62, at, 0.12, level * 0.5)
  },
  // Clang: partials that do not fit a harmonic series, as a struck plate's do.
  metal: (audio, at, level) => {
    for (const [ratio, share, length] of [[1, 1, 0.5], [2.76, 0.6, 0.34], [5.4, 0.35, 0.2], [8.93, 0.2, 0.12]]) {
      tone(audio, 'sine', 620 * ratio, 612 * ratio, at, length, level * 0.3 * share)
    }
    hiss(audio, 'highpass', 3200, 1, at, 0.03, level * 0.3)
  },
  // Squeak: a thin, narrow pitch rising fast, twice.
  plastic: (audio, at, level) => {
    tone(audio, 'triangle', 980, 1900, at, 0.07, level * 0.3)
    tone(audio, 'triangle', 1100, 2300, at + 0.08, 0.06, level * 0.2)
  },
  // Rustle: a few soft brushes of high noise.
  fur: (audio, at, level) => {
    for (let i = 0; i < 3; i += 1) hiss(audio, 'bandpass', 4600 + i * 900, 1.2, at + i * 0.045, 0.1, level * 0.2)
  },
  // Boing: a low sine that sags and comes back, with a soft wet start.
  jelly: (audio, at, level) => {
    tone(audio, 'sine', 300, 150, at, 0.13, level * 0.55)
    tone(audio, 'sine', 170, 340, at + 0.11, 0.16, level * 0.4)
    hiss(audio, 'lowpass', 900, 3, at, 0.05, level * 0.2)
  },
  // Crack: a sharp click and a thin high ring.
  ice: (audio, at, level) => {
    hiss(audio, 'highpass', 2400, 0.7, at, 0.05, level * 0.6)
    tone(audio, 'sine', 3100, 2500, at, 0.1, level * 0.14)
    tone(audio, 'sine', 4700, 4100, at + 0.02, 0.07, level * 0.1)
  },
}

// `level` is 0 to 1. Quiet edits, such as a robot's steady digging, are spaced out so they do not turn into a buzz.
export function playDig(kind: SurfaceKind, level: number) {
  if (!context || context.state !== 'running' || !isSoundOn()) return
  const { gapLoud, gapQuiet, loudAbove } = tuning.surface.sound
  const now = context.currentTime
  if (now - lastPlayed < (level >= loudAbove ? gapLoud : gapQuiet)) return
  lastPlayed = now
  voices[kind](context, now, level)
}
