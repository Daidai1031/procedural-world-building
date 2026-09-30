import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import type { createRunStore } from './state/runState'
import { PlanetWorld } from './world/planet'
import { tuning } from './config/tuning'
import { resourceColors } from './config/resourceColors'
import { terrainModes, modeForClick } from './config/controls'
import { cycleTerrainMode, selectFlattenOrientation, selectTerrainMode, useTerrainTool } from './tools/terrainTool'
import { detectedClusters, scanWithDetector } from './tools/detector'
import { collectExposedResources } from './tools/collector'
import type { ResourceCategory } from './world/resourceClusters'
import { CollectChip, resourceGlyphs, type CollectFlight } from './ui/CollectChip'
import { ScreenProjector, type ProjectToScreen } from './views/ScreenProjector'
import { PlanetView } from './views/PlanetView'
import { DetectorView } from './views/DetectorView'
import { OrbitCamera } from './views/OrbitCamera'
import { RemeshScheduler } from './views/RemeshScheduler'
import { DebugOverlay, FrameMeter } from './debug/DebugOverlay'
import { VOXEL_WORLD_SIZE } from './world/voxels/voxelMath.js'

export function App({ useRunStore, debug }: { useRunStore: ReturnType<typeof createRunStore>; debug: boolean }) {
  const seed = useRunStore((state) => state.seed)
  const terrainMode = useRunStore((state) => state.loadout.terrainMode)
  const flattenOrientation = useRunStore((state) => state.loadout.flattenOrientation)
  const activeTool = useRunStore((state) => state.loadout.activeTool)
  const clusters = useRunStore((state) => state.resourceClusters)
  const collectedIds = useRunStore((state) => state.collectedIds)
  const detector = useRunStore((state) => state.detector)
  const planetRemaining = useRunStore((state) => state.planetRemaining)
  const world = useMemo(() => new PlanetWorld(seed), [seed])
  const [radius, setRadius] = useState<number>(tuning.brush.radius.default)
  const [meshRevision, setMeshRevision] = useState(0)
  const [message, setMessage] = useState('Left click to shape the surface')
  const [stored, setStored] = useState<Record<ResourceCategory, number>>({ mineral: 0, life: 0, memory: 0 })
  const [flights, setFlights] = useState<CollectFlight[]>([])
  const projectRef = useRef<ProjectToScreen | null>(null)
  const slotRefs = useRef<Partial<Record<ResourceCategory, HTMLElement | null>>>({})
  const [fps, setFps] = useState<number | null>(null)
  const scanResults = useMemo(() => detector.center
    ? detectedClusters(clusters, detector.center, detector.radius).filter(({ id }) => !collectedIds.includes(id)) : [],
  [clusters, detector.center, detector.radius, collectedIds])
  const arrive = useCallback((flight: CollectFlight) => {
    setFlights((current) => current.filter(({ key }) => key !== flight.key))
    setStored((current) => ({ ...current, [flight.category]: current[flight.category] + 1 }))
  }, [])

  const selectTool = useCallback((tool: 'terrain' | 'detector') => {
    useRunStore.setState((state) => ({ loadout: { ...state.loadout, activeTool: tool } }))
    setMessage(tool === 'detector' ? 'Left click the surface to inspect a local volume' : 'Left click to shape the surface')
  }, [useRunStore])

  const adjustRadius = useCallback((direction: number) => {
    setRadius((current) => Math.max(tuning.brush.radius.min,
      Math.min(tuning.brush.radius.max, Math.round((current - direction * tuning.brush.radius.step) * 100) / 100)))
  }, [])

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!['f', 'd', 't'].includes(key) || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, select, [contenteditable]')) return
      if (key === 'd' || key === 't') {
        event.preventDefault()
        selectTool(key === 'd' ? 'detector' : 'terrain')
        return
      }
      if (useRunStore.getState().loadout.activeTool !== 'terrain') return
      event.preventDefault()
      cycleTerrainMode(useRunStore)
    }
    window.addEventListener('keydown', keyDown)
    return () => window.removeEventListener('keydown', keyDown)
  }, [useRunStore, selectTool])

  const target = useCallback((point: { x: number; y: number; z: number }, alt: boolean, ctrl: boolean) => {
    if (useRunStore.getState().loadout.activeTool === 'detector') {
      const center: [number, number, number] = [point.x, point.y - VOXEL_WORLD_SIZE / 2, point.z]
      scanWithDetector(useRunStore, center)
      const found = detectedClusters(useRunStore.getState().resourceClusters, center, detector.radius)
      setMessage(`Local scan: ${found.length} signal${found.length === 1 ? '' : 's'}`)
      return
    }
    const mode = modeForClick(useRunStore.getState().loadout.terrainMode, alt, ctrl)
    if (!mode) return
    const orientation = useRunStore.getState().loadout.flattenOrientation
    const result = useTerrainTool(world, useRunStore, mode, point, radius, orientation)
    const collected = result.changed ? collectExposedResources(world, useRunStore) : []
    if (collected.length > 0) {
      setFlights((current) => [...current, ...collected.map((cluster) => ({
        key: cluster.id, category: cluster.category,
        from: projectRef.current?.(cluster.position) ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      }))])
    }
    setMessage(collected.length > 0
      ? `Collected ${collected.map(({ category }) => category).join(', ')}`
      : result.changed
      ? `${mode === 'dig' ? 'Dug' : mode === 'add' ? 'Added' : `Flattened (${orientation})`} / ${result.removedSamples} removed, ${result.addedSamples} added samples`
      : 'No terrain changed at this point')
  }, [world, useRunStore, radius, detector.radius])

  return (
    <main>
      <header><p>TERRAFORMING CONTRACTOR</p><h1>#1380</h1></header>
      <nav className="project-nav" aria-label="Project navigation"><a href="/">Home</a><a href="/guidebook/">Guidebook ↗</a></nav>
      <Canvas camera={{ position: [0, 0, 8], fov: 42 }} dpr={[1, 1.5]}
        fallback={<p className="fallback">This game needs a browser with WebGL2 enabled.</p>}>
        {/* VIS-01: warm gray palette. */}
        <color attach="background" args={['#F3F1EB']} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 6, 5]} intensity={2.5} />
        <directionalLight position={[-4, 1, -2]} intensity={0.6} />
        <OrbitCamera onWheel={adjustRadius} />
        <PlanetView world={world} clusters={clusters} collectedIds={collectedIds} radius={radius} detectorRadius={detector.radius}
          activeTool={activeTool === 'detector' ? 'detector' : 'terrain'} selectedMode={terrainMode}
          flattenOrientation={flattenOrientation} onTarget={target} />
        <DetectorView world={world} clusters={clusters} collectedIds={collectedIds} center={detector.center} radius={detector.radius}
          active={activeTool === 'detector'} meshRevision={meshRevision} />
        <ScreenProjector projectRef={projectRef} />
        <RemeshScheduler world={world} onRemesh={() => setMeshRevision((revision) => revision + 1)} />
        {debug && <FrameMeter onSample={setFps} />}
      </Canvas>
      <section className="terrain-panel" aria-label="Tool controls">
        <div className="tool-tabs" role="group" aria-label="Active tool">
          <button type="button" aria-pressed={activeTool === 'terrain'} onClick={(event) => { selectTool('terrain'); event.currentTarget.blur() }}>Terrain</button>
          <button type="button" aria-pressed={activeTool === 'detector'} onClick={(event) => { selectTool('detector'); event.currentTarget.blur() }}>Detector</button>
        </div>
        {activeTool === 'detector' ? <>
          <p className="eyebrow">LOCAL DETECTOR</p>
          <p className="tool-description">Click the planet to reveal wireframe and buried signals within a small area.</p>
          <div className="signal-legend">
            <span style={{ color: resourceColors.mineral }}>◇ Mineral</span>
            <span style={{ color: resourceColors.life }}>○ Life</span>
            <span style={{ color: resourceColors.memory }}>□ Memory</span>
          </div>
          <div className="remaining"><span>Signals in scan</span><strong>{detector.center ? scanResults.length : '—'}</strong></div>
        </> : <>
          <p className="eyebrow">TERRAIN TOOL</p>
          <div className="terrain-modes" role="group" aria-label="Terrain mode">
            {terrainModes.map((mode) => <button key={mode} type="button" aria-pressed={terrainMode === mode}
              onClick={(event) => { selectTerrainMode(useRunStore, mode); event.currentTarget.blur() }}>
              {mode === 'dig' ? 'Dig' : mode === 'add' ? 'Add Terrain' : 'Flatten'}
            </button>)}
          </div>
          {terrainMode === 'flatten' && <div className="flatten-orientation" role="group" aria-label="Flatten orientation">
            <span>Plane direction</span>
            <div className="orientation-buttons">
              <button type="button" aria-pressed={flattenOrientation === 'radial'}
                onClick={(event) => { selectFlattenOrientation(useRunStore, 'radial'); event.currentTarget.blur() }}>Planet surface</button>
              <button type="button" aria-pressed={flattenOrientation === 'horizontal'}
                onClick={(event) => { selectFlattenOrientation(useRunStore, 'horizontal'); event.currentTarget.blur() }}>Horizontal</button>
            </div>
          </div>}
          <label className="brush-control">Brush <span>{radius.toFixed(2)}</span>
            <input type="range" min={tuning.brush.radius.min} max={tuning.brush.radius.max}
              step="0.04" value={radius} onChange={(event) => setRadius(Number(event.currentTarget.value))} />
          </label>
          <div className="remaining"><span>Planet Remaining</span><strong>{(planetRemaining * 100).toFixed(1)}%</strong></div>
          <div className="warehouse" aria-label="Warehouse">
            <span className="eyebrow">WAREHOUSE</span>
            {(Object.keys(resourceColors) as ResourceCategory[]).map((category) => (
              <div key={category} className="warehouse-slot">
                <span ref={(element) => { slotRefs.current[category] = element }} className="slot-glyph"
                  style={{ color: resourceColors[category] }}>{resourceGlyphs[category]}</span>
                <span className="slot-name">{category === 'mineral' ? 'Mineral' : category === 'life' ? 'Life' : 'Memory'}</span>
                <strong key={stored[category]} className="slot-count">{stored[category]}</strong>
              </div>
            ))}
          </div>
        </>}
        <p className="action-message" aria-live="polite">{message}</p>
      </section>
      {flights.map((flight) => <CollectChip key={flight.key} flight={flight}
        target={slotRefs.current[flight.category] ?? null} onDone={() => arrive(flight)} />)}
      {debug && <DebugOverlay fps={fps} seed={seed} chunkCount={world.chunks.length}
        dirtyChunks={world.dirtyChunkCount} remeshMs={world.lastRemeshMs} />}
      <footer><span>Right drag / orbit</span><span>Left click / {activeTool === 'detector' ? 'scan' : terrainMode === 'dig' ? 'dig' : terrainMode === 'add' ? 'add' : 'flatten'}</span><span>D / detector</span><span>T / terrain</span><span>F / cycle mode</span><span>Wheel / brush</span></footer>
    </main>
  )
}
