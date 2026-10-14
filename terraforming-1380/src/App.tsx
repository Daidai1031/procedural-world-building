import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import type { createRunStore } from './state/runState'
import { PlanetWorld } from './world/planet'
import { tuning } from './config/tuning'
import { palette } from './config/palette'
import { modeForClick } from './config/controls'
import { cycleTerrainMode, useTerrainTool } from './tools/terrainTool'
import { detectedClusters, scanWithDetector } from './tools/detector'
import { collectExposedResources } from './tools/collector'
import { placeRobot } from './systems/miner'
import { placeGardener } from './systems/gardener'
import { placeBuilder } from './systems/builder'
import { pruneStructures } from './systems/structures'
import type { ResourceCategory, ResourceCluster } from './world/resourceClusters'
import { CollectChip, type CollectFlight } from './ui/CollectChip'
import { ModeSwitch, type PlayMode } from './ui/ModeSwitch'
import { AutoPanel } from './ui/AutoPanel'
import { ManualPanel } from './ui/ManualPanel'
import { SitePanel } from './ui/SitePanel'
import { ScreenProjector, type ProjectToScreen } from './views/ScreenProjector'
import { PlanetView } from './views/PlanetView'
import { DetectorView } from './views/DetectorView'
import { MinerRunner } from './views/MinerRunner'
import { MinerView } from './views/MinerView'
import { GardenerView } from './views/GardenerView'
import { BuilderView } from './views/BuilderView'
import { StructuresView } from './views/StructuresView'
import { AtmosphereView } from './views/AtmosphereView'
import { OrbitCamera } from './views/OrbitCamera'
import { RemeshScheduler } from './views/RemeshScheduler'
import { DebugOverlay, FrameMeter } from './debug/DebugOverlay'
import { VOXEL_WORLD_SIZE } from './world/voxels/voxelMath.js'

type ManualTool = 'terrain' | 'detector'

const messages = {
  terrain: 'Left click to shape the surface',
  detector: 'Left click the surface to inspect a local volume',
  auto: 'Left click the surface to place the selected robot',
}

export function App({ useRunStore, debug }: { useRunStore: ReturnType<typeof createRunStore>; debug: boolean }) {
  const seed = useRunStore((state) => state.seed)
  const terrainMode = useRunStore((state) => state.loadout.terrainMode)
  const flattenOrientation = useRunStore((state) => state.loadout.flattenOrientation)
  const activeTool = useRunStore((state) => state.loadout.activeTool)
  const clusters = useRunStore((state) => state.resourceClusters)
  const collectedIds = useRunStore((state) => state.collectedIds)
  const detector = useRunStore((state) => state.detector)
  const autoRobot = useRunStore((state) => state.loadout.autoRobot)
  const areaRadius = useRunStore((state) => (state.loadout.autoRobot === 'gardener' ? state.gardeners[0].area?.radius
    : state.loadout.autoRobot === 'builder' ? state.builders[0].area?.radius : state.robots[0].area?.radius) ?? tuning.miner.area.default)
  const soil = useRunStore((state) => state.soil)
  const planetRemaining = useRunStore((state) => state.planetRemaining)
  const plantCount = useRunStore((state) => state.structures.filter(({ kind }) => kind === 'plant').length)
  const antennaCount = useRunStore((state) => state.structures.filter(({ kind }) => kind === 'antenna').length)
  const world = useMemo(() => new PlanetWorld(seed), [seed])
  const [radius, setRadius] = useState<number>(tuning.brush.radius.default)
  const [meshRevision, setMeshRevision] = useState(0)
  const [message, setMessage] = useState(messages.terrain)
  const [stored, setStored] = useState<Record<ResourceCategory, number>>({ mineral: 0, life: 0, memory: 0 })
  const [flights, setFlights] = useState<CollectFlight[]>([])
  const projectRef = useRef<ProjectToScreen | null>(null)
  const slotRefs = useRef<Partial<Record<ResourceCategory, HTMLElement | null>>>({})
  const lastManualTool = useRef<ManualTool>('terrain')
  const [fps, setFps] = useState<number | null>(null)
  const mode: PlayMode = activeTool === 'auto' ? 'auto' : 'manual'
  const manualTool: ManualTool = activeTool === 'detector' ? 'detector' : 'terrain'
  const scanResults = useMemo(() => detector.center
    ? detectedClusters(clusters, detector.center, detector.radius).filter(({ id }) => !collectedIds.includes(id)) : [],
  [clusters, detector.center, detector.radius, collectedIds])
  const arrive = useCallback((flight: CollectFlight) => {
    setFlights((current) => current.filter(({ key }) => key !== flight.key))
    setStored((current) => ({ ...current, [flight.category]: current[flight.category] + 1 }))
  }, [])

  const flyCollected = useCallback((collected: ResourceCluster[]) => {
    setFlights((current) => [...current, ...collected.map((cluster) => ({
      key: cluster.id, category: cluster.category,
      from: projectRef.current?.(cluster.position) ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    }))])
  }, [])

  const selectTool = useCallback((tool: ManualTool | 'auto') => {
    if (tool !== 'auto') lastManualTool.current = tool
    useRunStore.setState((state) => ({ loadout: { ...state.loadout, activeTool: tool } }))
    setMessage(messages[tool])
  }, [useRunStore])

  const selectMode = useCallback((next: PlayMode) => {
    selectTool(next === 'auto' ? 'auto' : lastManualTool.current)
  }, [selectTool])

  const adjustRadius = useCallback((direction: number) => {
    setRadius((current) => Math.max(tuning.brush.radius.min,
      Math.min(tuning.brush.radius.max, Math.round((current - direction * tuning.brush.radius.step) * 100) / 100)))
  }, [])

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!['f', 'd', 't', 'a', 'm'].includes(key) || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, select, [contenteditable]')) return
      const current = useRunStore.getState().loadout.activeTool
      if (key === 'a' || key === 'm') {
        event.preventDefault()
        selectMode(key === 'a' ? 'auto' : 'manual')
        return
      }
      if (current === 'auto') return
      event.preventDefault()
      if (key === 'd' || key === 't') selectTool(key === 'd' ? 'detector' : 'terrain')
      else if (current === 'terrain') cycleTerrainMode(useRunStore)
    }
    window.addEventListener('keydown', keyDown)
    return () => window.removeEventListener('keydown', keyDown)
  }, [useRunStore, selectTool, selectMode])

  const target = useCallback((point: { x: number; y: number; z: number }, alt: boolean, ctrl: boolean) => {
    const tool = useRunStore.getState().loadout.activeTool
    if (tool === 'auto') {
      const center: [number, number, number] = [point.x, point.y - VOXEL_WORLD_SIZE / 2, point.z]
      const state = useRunStore.getState()
      if (state.loadout.autoRobot === 'builder') {
        const robot = state.builders[0]
        placeBuilder(useRunStore, world, robot.id, center, robot.area?.radius ?? tuning.builder.area.default)
        setMessage('Builder placed. Press Start.')
      } else if (state.loadout.autoRobot === 'gardener') {
        const robot = state.gardeners[0]
        placeGardener(useRunStore, world, robot.id, center, robot.area?.radius ?? tuning.gardener.area.default)
        setMessage('Gardener placed. Press Start.')
      } else {
        const robot = state.robots[0]
        placeRobot(useRunStore, world, robot.id, center, robot.area?.radius ?? tuning.miner.area.default)
        setMessage('Miner placed. Press Start.')
      }
      return
    }
    if (tool === 'detector') {
      const center: [number, number, number] = [point.x, point.y - VOXEL_WORLD_SIZE / 2, point.z]
      scanWithDetector(useRunStore, center)
      const found = detectedClusters(useRunStore.getState().resourceClusters, center, detector.radius)
      setMessage(`Local scan: ${found.length} signal${found.length === 1 ? '' : 's'}`)
      return
    }
    const terrain = modeForClick(useRunStore.getState().loadout.terrainMode, alt, ctrl)
    if (!terrain) return
    const orientation = useRunStore.getState().loadout.flattenOrientation
    const result = useTerrainTool(world, useRunStore, terrain, point, radius, orientation)
    if (result.changed) pruneStructures(world, useRunStore)
    const collected = result.changed ? collectExposedResources(world, useRunStore) : []
    if (collected.length > 0) flyCollected(collected)
    setMessage(collected.length > 0
      ? `Collected ${collected.map(({ category }) => category).join(', ')}`
      : result.changed
      ? `${terrain === 'dig' ? 'Dug' : terrain === 'add' ? 'Added' : `Flattened (${orientation})`} / ${result.removedSamples} removed, ${result.addedSamples} added samples`
      : 'No terrain changed at this point')
  }, [world, useRunStore, radius, detector.radius, flyCollected])

  const hint = mode === 'auto'
    ? [['Click', `place ${autoRobot === 'gardener' ? 'Gardener' : autoRobot === 'builder' ? 'Builder' : 'Miner'}`], ['Right drag', 'orbit'], ['M', 'manual']]
    : [['Click', manualTool === 'detector' ? 'scan' : terrainMode === 'dig' ? 'dig' : terrainMode === 'add' ? 'add' : 'flatten'],
      ['Right drag', 'orbit'], ['D / T', 'detector / terrain'], ['F', 'cycle mode'], ['Wheel', 'brush'], ['A', 'auto']]

  return (
    <main data-mode={mode}>
      <header>
        <p>Contract #1380</p>
        <h1>Terraforming Contractor</h1>
        <em>We’re here to put a dent in the universe.</em>
      </header>
      <nav className="project-nav" aria-label="Project navigation"><a href="/">Home</a><a href="/guidebook/">Guidebook ↗</a></nav>
      <ModeSwitch mode={mode} onChange={selectMode} />
      <Canvas camera={{ position: [0, 0, 8], fov: 42 }} dpr={[1, 1.5]}
        fallback={<p className="fallback">This game needs a browser with WebGL2 enabled.</p>}>
        {/* VIS-01, D-027: warm white studio with one soft key light. */}
        <color attach="background" args={[palette.background]} />
        <hemisphereLight args={[palette.light.sky, palette.light.ground, 1.4]} />
        <directionalLight position={[4, 6, 5]} intensity={2} />
        <OrbitCamera onWheel={adjustRadius} />
        <PlanetView world={world} clusters={clusters} collectedIds={collectedIds} radius={radius} detectorRadius={detector.radius} areaRadius={areaRadius}
          activeTool={activeTool === 'detector' ? 'detector' : activeTool === 'auto' ? 'miner' : 'terrain'} selectedMode={terrainMode}
          flattenOrientation={flattenOrientation} onTarget={target} />
        <AtmosphereView seed={seed} />
        <DetectorView world={world} clusters={clusters} collectedIds={collectedIds} center={detector.center} radius={detector.radius}
          active={activeTool === 'detector'} meshRevision={meshRevision} />
        <MinerView world={world} store={useRunStore} active={mode === 'auto'} selected={autoRobot === 'miner'} />
        <GardenerView world={world} store={useRunStore} active={mode === 'auto'} selected={autoRobot === 'gardener'} />
        <BuilderView store={useRunStore} active={mode === 'auto'} selected={autoRobot === 'builder'} />
        <StructuresView store={useRunStore} />
        <MinerRunner world={world} store={useRunStore} active={mode === 'auto'} onCollect={flyCollected} />
        <ScreenProjector projectRef={projectRef} />
        <RemeshScheduler world={world} onRemesh={() => setMeshRevision((revision) => revision + 1)} />
        {debug && <FrameMeter onSample={setFps} />}
      </Canvas>
      <section className="panel" aria-label={mode === 'auto' ? 'Auto mode controls' : 'Manual mode controls'}>
        {mode === 'auto'
          ? <AutoPanel useRunStore={useRunStore} onMessage={setMessage} />
          : <ManualPanel useRunStore={useRunStore} tool={manualTool} terrainMode={terrainMode} flattenOrientation={flattenOrientation}
            brush={radius} onBrush={setRadius} onTool={selectTool} detectorCount={detector.center ? scanResults.length : null} />}
        <p className="action-message" aria-live="polite">{message}</p>
      </section>
      <SitePanel planetRemaining={planetRemaining} stored={stored} slotRefs={slotRefs} plants={plantCount} antennas={antennaCount} soil={soil} />
      {flights.map((flight) => <CollectChip key={flight.key} flight={flight}
        target={slotRefs.current[flight.category] ?? null} onDone={() => arrive(flight)} />)}
      {debug && <DebugOverlay fps={fps} seed={seed} chunkCount={world.chunks.length}
        dirtyChunks={world.dirtyChunkCount} remeshMs={world.lastRemeshMs} lodCounts={world.lodCounts} />}
      <footer>{hint.map(([keys, action]) => <span key={keys}><kbd>{keys}</kbd>{action}</span>)}</footer>
    </main>
  )
}
