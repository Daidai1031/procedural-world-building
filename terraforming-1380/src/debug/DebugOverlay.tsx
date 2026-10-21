import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

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

// Debug only: lets a browser session aim the camera (for screenshots and playtest notes).
export function DebugHandles() {
  const camera = useThree(state => state.camera)
  Object.assign(window, { __camera: camera })
  return null
}

export function DebugOverlay({ fps, seed, chunkCount, dirtyChunks, remeshMs, lodCounts, residents, habitat }: {
  fps: number | null; seed: string; chunkCount: number; dirtyChunks: number; remeshMs: number; lodCounts: number[]
  residents: string; habitat: string
}) {
  return (
    <aside className="debug" aria-label="Debug overlay">
      <strong>M0 · DEBUG</strong>
      <dl>
        <dt>FPS</dt><dd>{fps ?? '—'}</dd>
        <dt>Seed</dt><dd>{seed}</dd>
        <dt>Chunks</dt><dd>{chunkCount}</dd>
        <dt>LOD 0/1/2</dt><dd>{lodCounts.join(' / ')}</dd>
        <dt>Dirty</dt><dd>{dirtyChunks}</dd>
        <dt>Remesh</dt><dd>{remeshMs.toFixed(1)} ms</dd>
        {/* HAB-04: resident states, home validity and disturbance, for inspection only. */}
        <dt>Residents</dt><dd>{residents}</dd>
        <dt>Habitat</dt><dd>{habitat}</dd>
      </dl>
    </aside>
  )
}
