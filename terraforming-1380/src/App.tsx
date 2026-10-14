import { OpeningTitle } from './ui/OpeningTitle'
import { GameOver } from './ui/GameOver'
import { Comms } from './ui/Comms'
import { Starfield } from './ui/Starfield'
import { SignalView } from './views/SignalView'
import { DistantPlanetsView } from './views/DistantPlanetsView'
import { travelTo, type DistantPlanet } from './systems/signal'
import { showWorkArea } from './render/terrainMaterial'
import { WorldMap } from './ui/WorldMap'
import { SurfaceCamera } from './views/SurfaceCamera'
import { LandingMarkers } from './views/LandingMarkers'
import { findLandingSites, landingQuality, type LandingSite } from './systems/exploration'
import type { Vec3 } from './systems/geometry'
import { PlanetStatus } from './ui/PlanetStatus'
import { updateSiteIndicators } from './systems/economy'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import type { AutoRobot, createRunStore } from './state/runState'
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

export function App({ useRunStore, debug, intro = true }: { useRunStore: ReturnType<typeof createRunStore>; debug: boolean; intro?: boolean }) {
  const [introOpen, setIntroOpen] = useState(intro)
  const [travel, setTravel] = useState<DistantPlanet | null>(null)
  const completeIntro = useCallback(() => setIntroOpen(false), [])
  const seed = useRunStore((state) => state.seed)
  const bankrupt = useRunStore((state) => state.economy.bankrupt)
  const terrainMode = useRunStore((state) => state.loadout.terrainMode)
  const flattenOrientation = useRunStore((state) => state.loadout.flattenOrientation)
  const activeTool = useRunStore((state) => state.loadout.activeTool)
  const clusters = useRunStore((state) => state.resourceClusters)
  const collectedIds = useRunStore((state) => state.collectedIds)
  const detector = useRunStore((state) => state.detector)
  const autoRobot = useRunStore((state) => state.loadout.autoRobot)
  const areaRadius = useRunStore((state) => (state.loadout.autoRobot === 'gardener' ? state.gardeners[0].area?.radius
    : state.loadout.autoRobot === 'builder' ? state.builders[0].area?.radius : state.robots[0].area?.radius) ?? tuning.miner.area.default)
  const world = useMemo(() => new PlanetWorld(seed), [seed])
  const [surfaceSite, setSurfaceSite] = useState<LandingSite | null>(null)
  const [landingVisit, setLandingVisit] = useState(0)
  const [mapOpen, setMapOpen] = useState(false)
  const [landingSites, setLandingSites] = useState(() => findLandingSites(world))
  const walkerPosition = useRef<Vec3 | null>(null)
  const movement = useRef(new Set<string>())
  useEffect(() => { if (surfaceSite) showWorkArea(null) }, [surfaceSite])
  const returnToOrbit = useCallback(() => { setSurfaceSite(null); movement.current.clear() }, [])
  const land = useCallback((site: LandingSite) => {
    if (landingQuality(world, site.direction) > 0.13) {
      setMessage('This landing site has changed. Choose another site on the map.')
      return false
    }
    movement.current.clear()
    setLandingVisit(visit => visit + 1)
    setSurfaceSite(site)
    setMapOpen(false)
    return true
  }, [world])
  useEffect(() => {
    const refresh = () => setLandingSites(findLandingSites(world))
    refresh()
    const timer = window.setInterval(refresh, 2000)
    return () => window.clearInterval(timer)
  }, [world])
  const [radius, setRadius] = useState<number>(tuning.brush.radius.default)
  const [meshRevision, setMeshRevision] = useState(0)
  const [message, setMessage] = useState(messages.terrain)
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

  // Comms shortcut: show the robot's station in Auto mode, select it, and bring its card into view.
  const openRobot = useCallback((robot: AutoRobot) => {
    returnToOrbit()
    useRunStore.setState((state) => ({ loadout: { ...state.loadout, activeTool: 'auto', autoRobot: robot } }))
    setMessage(`Left click the surface to place the ${robot[0].toUpperCase() + robot.slice(1)}`)
    window.requestAnimationFrame(() => document.querySelector(`[aria-label="${robot[0].toUpperCase() + robot.slice(1)} controls"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }, [useRunStore, returnToOrbit])

  const adjustRadius = useCallback((direction: number) => {
    setRadius((current) => Math.max(tuning.brush.radius.min,
      Math.min(tuning.brush.radius.max, Math.round((current - direction * tuning.brush.radius.step) * 100) / 100)))
  }, [])

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (introOpen || surfaceSite || mapOpen) return
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
  }, [useRunStore, selectTool, selectMode, surfaceSite, mapOpen, introOpen])

  const target = useCallback((point: { x: number; y: number; z: number }, alt: boolean, ctrl: boolean) => {
    if (surfaceSite || mapOpen) return
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
    if (result.changed) updateSiteIndicators(useRunStore)
    if (collected.length > 0) flyCollected(collected)
    setMessage(collected.length > 0
      ? `Collected ${collected.map(({ category }) => category).join(', ')}`
      : result.changed
      ? `${terrain === 'dig' ? 'Dug' : terrain === 'add' ? 'Added' : `Flattened (${orientation})`} / ${result.removedSamples} removed, ${result.addedSamples} added samples`
      : 'No terrain changed at this point')
  }, [world, useRunStore, radius, detector.radius, flyCollected, surfaceSite, mapOpen, introOpen])

  const hint = mode === 'auto'
    ? [['Click', `place ${autoRobot === 'gardener' ? 'Gardener' : autoRobot === 'builder' ? 'Builder' : 'Miner'}`], ['Right drag', 'orbit'], ['M', 'manual']]
    : [['Click', manualTool === 'detector' ? 'scan' : terrainMode === 'dig' ? 'dig' : terrainMode === 'add' ? 'add' : 'flatten'],
      ['Right drag', 'orbit'], ['D / T', 'detector / terrain'], ['F', 'cycle mode'], ['Wheel', 'brush'], ['A', 'auto']]

  return (
    <>
    <Starfield />
    <main inert={introOpen || bankrupt || !!travel} aria-hidden={introOpen || bankrupt || !!travel || undefined} data-mode={mode} data-view={surfaceSite ? 'surface' : 'orbit'}>
      <div className="app-topbar">
        <header className="brand">
          <p>Contract #1380</p>
          <h1>Terraforming Contractor</h1>
        </header>
        <nav className="project-nav" aria-label="Project navigation"><a href="/">Home</a><a href="/guidebook/">Guidebook ↗</a></nav>
      </div>
      <Canvas className="world-canvas" camera={{ position: [0, 0, 8], fov: 42 }} dpr={[1, 1.5]}
        fallback={<p className="fallback">This game needs a browser with WebGL2 enabled.</p>}>
        {/* VIS-01, D-027: warm white studio with one soft key light. */}
        <ambientLight intensity={0.55} />
        <hemisphereLight args={[palette.light.sky, palette.light.ground, 1.8]} />
        <directionalLight position={[4, 6, 5]} intensity={2} />
        <directionalLight position={[-3, -5, 2]} intensity={1.3} color={palette.light.sky} />
        <directionalLight position={[2, 1, -5]} intensity={0.6} />
        {surfaceSite ? <SurfaceCamera key={landingVisit} world={world} start={surfaceSite.direction}
          positionRef={walkerPosition} movement={movement} onExit={returnToOrbit} /> : <OrbitCamera onWheel={adjustRadius} />}
        {!surfaceSite && <LandingMarkers sites={landingSites} onLand={land} />}
        <PlanetView world={world} clusters={clusters} collectedIds={collectedIds} radius={radius} detectorRadius={detector.radius} areaRadius={areaRadius}
          activeTool={surfaceSite ? 'explore' : activeTool === 'detector' ? 'detector' : activeTool === 'auto' ? 'miner' : 'terrain'} selectedMode={terrainMode}
          flattenOrientation={flattenOrientation} onTarget={target} />
        <AtmosphereView seed={seed} />
        <DetectorView world={world} clusters={clusters} collectedIds={collectedIds} center={detector.center} radius={detector.radius}
          active={!surfaceSite && activeTool === 'detector'} meshRevision={meshRevision} />
        <MinerView world={world} store={useRunStore} active={mode === 'auto' || !!surfaceSite} selected={!surfaceSite && autoRobot === 'miner'} />
        <GardenerView world={world} store={useRunStore} active={mode === 'auto' || !!surfaceSite} selected={!surfaceSite && autoRobot === 'gardener'} />
        <BuilderView store={useRunStore} active={mode === 'auto' || !!surfaceSite} selected={!surfaceSite && autoRobot === 'builder'} />
        <StructuresView store={useRunStore} />
        <SignalView store={useRunStore} />
        {!surfaceSite && <DistantPlanetsView store={useRunStore} seed={seed}
          onHover={planet => setMessage(planet ? `Distant planet ${planet.name} · click to travel` : messages[mode === 'auto' ? 'auto' : manualTool])}
          onSelect={setTravel} />}
        <MinerRunner world={world} store={useRunStore} active={mode === 'auto' && !bankrupt} onCollect={flyCollected} />
        <ScreenProjector projectRef={projectRef} />
        <RemeshScheduler world={world} onRemesh={() => setMeshRevision((revision) => revision + 1)} />
        {debug && <FrameMeter onSample={setFps} />}
      </Canvas>
      {!surfaceSite && <div className="left-sidebar">
        <div className="sidebar-controls"><ModeSwitch mode={mode} onChange={selectMode} /></div>
        <section className="panel" tabIndex={0} aria-label={mode === 'auto' ? 'Auto mode controls' : 'Manual mode controls'}>
        {mode === 'auto'
          ? <AutoPanel useRunStore={useRunStore} onMessage={setMessage} />
          : <ManualPanel useRunStore={useRunStore} tool={manualTool} terrainMode={terrainMode} flattenOrientation={flattenOrientation}
            brush={radius} onBrush={setRadius} onTool={selectTool} detectorCount={detector.center ? scanResults.length : null} />}
        <p className="action-message" aria-live="polite">{message}</p>
        </section>
      </div>}
      <div className="right-sidebar">
        <div className="sidebar-controls">
          <div className="exploration-toolbar">
            <button onClick={() => { movement.current.clear(); setMapOpen(true) }}>World map & landing ↗</button>
            {surfaceSite && <button onClick={returnToOrbit}>Return to orbit ↑</button>}
          </div>
        </div>
        <div className="site-reports" role="region" aria-label="Site reports">
        <SitePanel useRunStore={useRunStore} slotRefs={slotRefs} />
        <PlanetStatus useRunStore={useRunStore} />
        </div>
      </div>
      {flights.map((flight) => <CollectChip key={flight.key} flight={flight}
        target={slotRefs.current[flight.category] ?? null} onDone={() => arrive(flight)} />)}
      {debug && <DebugOverlay fps={fps} seed={seed} chunkCount={world.chunks.length}
        dirtyChunks={world.dirtyChunkCount} remeshMs={world.lastRemeshMs} lodCounts={world.lodCounts} />}
      {mapOpen && <WorldMap world={world} useRunStore={useRunStore} sites={landingSites} positionRef={walkerPosition}
        onLand={land} onClose={() => setMapOpen(false)} />}
      {surfaceSite && <div className="surface-hud">
        <p>{surfaceSite.name} · Surface exploration</p><span>WASD / arrows to walk · drag to look · Esc to orbit</span>
        <div className="walk-pad" aria-label="Walking controls">{[['w', 'Forward ↑'], ['a', 'Left ←'], ['s', 'Back ↓'], ['d', 'Right →']].map(([key, label]) =>
          <button key={key} aria-label={label} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); movement.current.add(key) }}
            onPointerUp={() => movement.current.delete(key)} onPointerCancel={() => movement.current.delete(key)}
            onLostPointerCapture={() => movement.current.delete(key)} onBlur={() => movement.current.delete(key)}>{label}</button>)}</div>
      </div>}
      <Comms useRunStore={useRunStore} onOpenRobot={openRobot} />
      <footer>{hint.map(([keys, action]) => <span key={keys}><kbd>{keys}</kbd>{action}</span>)}</footer>
    </main>
    {introOpen && <OpeningTitle onComplete={completeIntro} />}
    {bankrupt && <GameOver />}
    {travel && !bankrupt && <section className="travel-dialog" role="dialog" aria-modal="true" aria-labelledby="travel-title">
      <div>
        <p>Signal answered</p>
        <h2 id="travel-title">Travel to {travel.name}?</h2>
        <span>This site, its robots and its warehouse stay behind. Your funds travel with you.</span>
        <div className="travel-actions">
          <button onClick={() => setTravel(null)}>Stay here</button>
          <button autoFocus onClick={() => travelTo(useRunStore, travel.seed)}>Travel →</button>
        </div>
      </div>
    </section>}
    </>
  )
}
