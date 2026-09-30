import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// DBG-02: count rendered frames, updating React only once per second.
export function FrameMeter({ onSample }: { onSample: (fps: number) => void }) {
  const sample = useRef({ frames: 0, elapsed: 0 })
  useFrame((_, delta) => {
    sample.current.frames += 1
    sample.current.elapsed += delta
    if (sample.current.elapsed >= 1) {
      onSample(Math.round(sample.current.frames / sample.current.elapsed))
      sample.current = { frames: 0, elapsed: 0 }
    }
  })
  return null
}

export function DebugOverlay({ fps, seed, chunkCount, dirtyChunks, remeshMs }: {
  fps: number | null; seed: string; chunkCount: number; dirtyChunks: number; remeshMs: number
}) {
  return (
    <aside className="debug" aria-label="Debug overlay">
      <strong>M0 · DEBUG</strong>
      <dl>
        <dt>FPS</dt><dd>{fps ?? '—'}</dd>
        <dt>Seed</dt><dd>{seed}</dd>
        <dt>Chunks</dt><dd>{chunkCount}</dd>
        <dt>Dirty</dt><dd>{dirtyChunks}</dd>
        <dt>Remesh</dt><dd>{remeshMs.toFixed(1)} ms</dd>
      </dl>
    </aside>
  )
}
