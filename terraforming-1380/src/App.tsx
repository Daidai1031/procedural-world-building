import { OpeningTitle } from './ui/OpeningTitle'
import { GameOver } from './ui/GameOver'
import { Comms } from './ui/Comms'
import { Starfield } from './ui/Starfield'
import { SignalView } from './views/SignalView'
import { DistantPlanetsView } from './views/DistantPlanetsView'
import { travelTo, visiblePlanetCount } from './systems/signal'
import { registryFor } from './state/planets'
import { planetConfig } from './world/planet'
import { SystemLabels } from './ui/SystemLabels'
import { SystemCaption, SystemReturn, SystemVeil, SystemWorldList } from './ui/SystemCaption'
import { HoldToTravel } from './ui/HoldToTravel'
import { SystemWorlds } from './views/SystemWorlds'
import { SystemArcs } from './views/SystemArcs'
import { ActiveReadouts } from './views/ActiveReadouts'
import { SystemCamera, useSystemLayout } from './views/SystemCamera'
import { useSystemPlanets } from './state/useSystemPlanets'
import { clearFocus, escapeSystem, openSystem, resetSystem, toggleSystem, useSystemView } from './state/systemView'
import { showWorkArea } from './render/terrainMaterial'
import { WorldMap } from './ui/WorldMap'
import { PixelIcon } from './ui/PixelIcon'
import { SurfaceCamera } from './views/SurfaceCamera'
import { LandingMarkers } from './views/LandingMarkers'
import { findLandingSites, landingQuality, type LandingSite } from './systems/exploration'
import type { Vec3 } from './systems/geometry'
import { PlanetStatus } from './ui/PlanetStatus'
import { updateSiteIndicators } from './systems/economy'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import type { AutoRobot, createRunStore } from './state/runState'
import { tuning } from './config/tuning'
import { palette } from './config/palette'
import { modeForClick } from './config/controls'
import { cycleTerrainMode, useTerrainTool } from './tools/terrainTool'
import { detectedClusters, scanWithDetector } from './tools/detector'
import { collectExposedResources } from './tools/collector'
import { placeRobot } from './systems/miner'
import { placeGardener } from './systems/gardener'
import { placeRigger } from './systems/rigger'
import { placeBuilder } from './systems/builder'
import { pruneStructures } from './systems/structures'
import type { ResourceCategory, ResourceCluster } from './world/resourceClusters'
import { CollectChip, type CollectFlight } from './ui/CollectChip'
import { ModeSwitch, type PlayMode } from './ui/ModeSwitch'
import { AutoPanel } from './ui/AutoPanel'
import { cancelAutopilot, startAutopilot } from './systems/autopilot'
import { ManualPanel } from './ui/ManualPanel'
import { SitePanel } from './ui/SitePanel'
import { ScreenProjector, type ProjectSphere, type ProjectToScreen } from './views/ScreenProjector'
import { PlanetView } from './views/PlanetView'
import { DetectorView } from './views/DetectorView'
import { MinerRunner } from './views/MinerRunner'
import { MinerView } from './views/MinerView'
import { PlacerView } from './views/PlacerView'
import { BuilderView } from './views/BuilderView'
import { StructuresView } from './views/StructuresView'
import { ResidentRunner, ResidentsView } from './views/ResidentsView'
import { disturbanceAt, residentSummary } from './systems/residents'
import { AtmosphereView } from './views/AtmosphereView'
import { OrbitCamera } from './views/OrbitCamera'
import { RemeshScheduler } from './views/RemeshScheduler'
import { DebugHandles, DebugOverlay, FrameMeter } from './debug/DebugOverlay'
import { VOXEL_WORLD_SIZE } from './world/voxels/voxelMath.js'

type ManualTool = 'terrain' | 'detector'

const messages = {
  terrain: 'Left click to shape the surface',
  detector: 'Left click the surface to inspect a local volume',
  auto: 'Left click the surface to place the selected robot',
}

export function App({ useRunStore, debug, intro = true }: { useRunStore: ReturnType<typeof createRunStore>; debug: boolean; intro?: boolean }) {
  const [introOpen, setIntroOpen] = useState(intro)
  const completeIntro = useCallback(() => setIntroOpen(false), [])
  const seed = useRunStore((state) => state.seed)
  const registry = useMemo(() => registryFor(useRunStore), [useRunStore])
  const bankrupt = useRunStore((state) => state.economy.bankrupt)
  const terrainMode = useRunStore((state) => state.loadout.terrainMode)
  const flattenOrientation = useRunStore((state) => state.loadout.flattenOrientation)
  const activeTool = useRunStore((state) => state.loadout.activeTool)
  const clusters = useRunStore((state) => state.resourceClusters)
  const collectedIds = useRunStore((state) => state.collectedIds)
  const detector = useRunStore((state) => state.detector)
  const autoRobot = useRunStore((state) => state.loadout.autoRobot)
  const areaRadius = useRunStore((state) => (state.loadout.autoRobot === 'gardener' ? state.gardeners[0]?.area?.radius
    : state.loadout.autoRobot === 'rigger' ? state.riggers[0]?.area?.radius
    : state.loadout.autoRobot === 'builder' ? state.builders[0]?.area?.radius : state.robots[0]?.area?.radius) ?? tuning.miner.area.default)
  const autopilotOn = useRunStore((state) => state.autopilot.enabled)
  // Ids are joined into one string so the selector stays stable while robots only change phase.
  const minerIds = useRunStore((state) => state.robots.map(({ id }) => id).join())
  const gardenerIds = useRunStore((state) => state.gardeners.map(({ id }) => id).join())
  const riggerIds = useRunStore((state) => state.riggers.map(({ id }) => id).join())
  const builderIds = useRunStore((state) => state.builders.map(({ id }) => id).join())
  const world = useMemo(() => registry.world(seed), [registry, seed])
  useEffect(() => { if (debug) Object.assign(window, { __world: world, __registry: registry, __travel: (to: string) => travelTo(useRunStore, to) }) }, [debug, world, registry, useRunStore])
  const [surfaceSite, setSurfaceSite] = useState<LandingSite | null>(null)
  const [landingVisit, setLandingVisit] = useState(0)
  const [mapOpen, setMapOpen] = useState(false)
  const phase = useSystemView(state => state.phase)
  const pulledBack = phase !== 'orbit'
  const systemWorlds = useSystemPlanets(useRunStore)
  const layout = useSystemLayout(systemWorlds, seed)
  const sphereRef = useRef<ProjectSphere | null>(null)
  const knownPlanets = registry.list(state => state.planets.length)
  const signalPlanets = useRunStore(state => visiblePlanetCount(state.signal.broadcastCount))
  const canPull = !introOpen && !surfaceSite && !bankrupt && (knownPlanets > 1 || signalPlanets > 0)
  // Anything that takes over the screen ends the pull-back at once, with no animation.
  useEffect(() => { if (introOpen || surfaceSite || bankrupt) resetSystem() }, [introOpen, surfaceSite, bankrupt])
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
  // Autopilot is a state of the crew rather than a mode: it runs the crew exactly as Auto does, but nobody places anything.
  const mode: 'auto' | 'manual' = autopilotOn || activeTool === 'auto' ? 'auto' : 'manual'
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
    // When switching modes, cancel autopilot if it's running
    if (useRunStore.getState().autopilot.enabled) {
      cancelAutopilot(useRunStore)
    }
    selectTool(next === 'auto' ? 'auto' : lastManualTool.current)
  }, [selectTool, useRunStore])

  const handOver = useCallback(() => {
    if (!startAutopilot(useRunStore, world, useRunStore.getState().autopilot.counts)) return
    showWorkArea(null)
    setMessage('Autopilot engaged. The crew works the whole planet.')
  }, [useRunStore, world])

  const takeOver = useCallback(() => {
    cancelAutopilot(useRunStore)
    setMessage(messages.auto)
  }, [useRunStore])

  // Comms shortcut: show the robot's station in Auto mode, select it, and bring its card into view.
  const openRobot = useCallback((robot: AutoRobot) => {
    returnToOrbit()
    // Cancel autopilot when opening a specific robot
    if (useRunStore.getState().autopilot.enabled) {
      cancelAutopilot(useRunStore)
    }
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
      if ((key === 'o' || key === 'escape') && !event.repeat && !event.altKey && !event.ctrlKey && !event.metaKey
        && !(event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]'))) {
        if (key === 'escape') escapeSystem()
        else if (canPull || useSystemView.getState().phase !== 'orbit') toggleSystem()
        return
      }
      // While pulled back only the mode keys still work: the crew keeps running, tools do nothing.
      if (useSystemView.getState().phase !== 'orbit' && !['a', 'm'].includes(key)) return
      if (!['f', 'd', 't', 'a', 'm'].includes(key) || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, select, [contenteditable]')) return
      const current = useRunStore.getState().loadout.activeTool
      if (key === 'a' || key === 'm') {
        event.preventDefault()
        selectMode(key === 'a' ? 'auto' : 'manual')
        return
      }
      if (current === 'auto' || useRunStore.getState().autopilot.enabled) return
      event.preventDefault()
      if (key === 'd' || key === 't') selectTool(key === 'd' ? 'detector' : 'terrain')
      else if (current === 'terrain') cycleTerrainMode(useRunStore)
    }
    window.addEventListener('keydown', keyDown)
    return () => window.removeEventListener('keydown', keyDown)
  }, [useRunStore, selectTool, selectMode, surfaceSite, mapOpen, introOpen, canPull])

  const target = useCallback((point: { x: number; y: number; z: number }, alt: boolean, ctrl: boolean) => {
    if (surfaceSite || mapOpen || useRunStore.getState().autopilot.enabled) return
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
      } else if (state.loadout.autoRobot === 'rigger') {
        const robot = state.riggers[0]
        placeRigger(useRunStore, world, robot.id, center, robot.area?.radius ?? tuning.rigger.area.default)
        setMessage('Rigger placed. Press Start.')
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

  const hint = pulledBack ? [['Right drag', 'turn'], ['Wheel', 'zoom'], ['Click', 'focus'], ['Esc', 'back'], ['O', 'orbit view']]
    : autopilotOn
    ? [['Right drag', 'orbit'], ['A', 'auto'], ['M', 'manual']]
    : mode === 'auto'
    ? [['Click', `place ${autoRobot === 'gardener' ? 'Gardener' : autoRobot === 'rigger' ? 'Rigger' : autoRobot === 'builder' ? 'Builder' : 'Miner'}`], ['Right drag', 'orbit'], ['M', 'manual']]
    : [['Click', manualTool === 'detector' ? 'scan' : terrainMode === 'dig' ? 'dig' : terrainMode === 'add' ? 'add' : 'flatten'],
      ['Right drag', 'orbit'], ['D / T', 'detector / terrain'], ['F', 'cycle mode'], ['Wheel', 'brush'], ['A', 'auto']]

  return (
    <>
    <Starfield />
    <main inert={introOpen || bankrupt} aria-hidden={introOpen || bankrupt || undefined} data-view={surfaceSite ? 'surface' : pulledBack && phase !== 'arriving' ? 'system' : 'orbit'}>
      <div className="app-topbar">
        <header className="brand">
          <p>Contract #1380</p>
          <h1>Terraforming Contractor</h1>
        </header>
        <nav className="project-nav" aria-label="Project navigation"><a href="/">Home</a><a href="/guidebook/">Guidebook ↗</a></nav>
      </div>
      <Canvas className="world-canvas" camera={{ position: [0, 0, 8], fov: 42 }} dpr={[1, 1.5]}
        onPointerMissed={event => { if (event.button === 0) clearFocus() }}
        fallback={<p className="fallback">This game needs a browser with WebGL2 enabled.</p>}>
        {/* VIS-01, D-027: warm white studio with one soft key light. */}
        <ambientLight intensity={0.55} />
        <hemisphereLight args={[palette.light.sky, palette.light.ground, 1.8]} />
        <directionalLight position={[4, 6, 5]} intensity={2} />
        <directionalLight position={[-3, -5, 2]} intensity={1.3} color={palette.light.sky} />
        <directionalLight position={[2, 1, -5]} intensity={0.6} />
        {surfaceSite ? <SurfaceCamera key={landingVisit} world={world} start={surfaceSite.direction}
          positionRef={walkerPosition} movement={movement} onExit={returnToOrbit} /> : <OrbitCamera onWheel={adjustRadius} />}
        {!surfaceSite && <SystemCamera layout={layout} planets={systemWorlds} store={useRunStore} />}
        {!surfaceSite && <SystemWorlds planets={systemWorlds} layout={layout} registry={registry} />}
        {!surfaceSite && <ActiveReadouts store={useRunStore} seed={seed} />}
        {!surfaceSite && <SystemArcs planets={systemWorlds} layout={layout} store={useRunStore} />}
        {!surfaceSite && !pulledBack && <LandingMarkers sites={landingSites} onLand={land} />}
        <PlanetView world={world} baseRadius={planetConfig(seed).radius * VOXEL_WORLD_SIZE} clusters={clusters} collectedIds={collectedIds} radius={radius} detectorRadius={detector.radius} areaRadius={areaRadius}
          activeTool={surfaceSite || pulledBack || autopilotOn ? 'explore' : activeTool === 'detector' ? 'detector' : activeTool === 'auto' ? 'miner' : 'terrain'} selectedMode={terrainMode}
          flattenOrientation={flattenOrientation} onTarget={target} />
        <AtmosphereView seed={seed} />
        <DetectorView world={world} clusters={clusters} collectedIds={collectedIds} center={detector.center} radius={detector.radius}
          active={!surfaceSite && activeTool === 'detector'} meshRevision={meshRevision} />
        {/* Only the first robot of each kind has a work area to show; the rest belong to Autopilot. */}
        {minerIds.split(',').filter(Boolean).map((id, index) => <MinerView key={id} robotId={id} world={world} store={useRunStore} active={mode === 'auto' || !!surfaceSite} selected={index === 0 && !autopilotOn && !surfaceSite && autoRobot === 'miner'} />)}
        {gardenerIds.split(',').filter(Boolean).map((id, index) => <PlacerView key={id} role="gardener" robotId={id} store={useRunStore} active={mode === 'auto' || !!surfaceSite} selected={index === 0 && !autopilotOn && !surfaceSite && autoRobot === 'gardener'} />)}
        {riggerIds.split(',').filter(Boolean).map((id, index) => <PlacerView key={id} role="rigger" robotId={id} store={useRunStore} active={mode === 'auto' || !!surfaceSite} selected={index === 0 && !autopilotOn && !surfaceSite && autoRobot === 'rigger'} />)}
        {builderIds.split(',').filter(Boolean).map((id, index) => <BuilderView key={id} robotId={id} store={useRunStore} active={mode === 'auto' || !!surfaceSite} selected={index === 0 && !autopilotOn && !surfaceSite && autoRobot === 'builder'} />)}
        <StructuresView store={useRunStore} />
        <ResidentsView world={world} store={useRunStore} />
        <ResidentRunner world={world} store={useRunStore} active={mode === 'manual' && !bankrupt && !introOpen} />
        <SignalView store={useRunStore} />
        {!surfaceSite && !pulledBack && <DistantPlanetsView store={useRunStore} seed={seed}
          onHover={planet => setMessage(planet ? `Distant planet ${planet.name} · click to see it in the system view` : messages[mode === 'auto' ? 'auto' : manualTool])}
          onSelect={planet => openSystem(planet.seed)} />}
        <MinerRunner world={world} store={useRunStore} active={mode === 'auto' && !bankrupt} onCollect={flyCollected} />
        <ScreenProjector projectRef={projectRef} sphereRef={sphereRef} />
        <RemeshScheduler world={world} onRemesh={() => setMeshRevision((revision) => revision + 1)} />
        {debug && <FrameMeter onSample={setFps} />}
        {debug && <DebugHandles />}
      </Canvas>
      {!surfaceSite && <div className="left-sidebar">
        <div className="sidebar-controls"><ModeSwitch mode={mode} onChange={selectMode} /></div>
        <section className="panel" tabIndex={0} aria-label={mode === 'auto' ? 'Auto mode controls' : 'Manual mode controls'}>
        {mode === 'auto'
          ? <AutoPanel useRunStore={useRunStore} onMessage={setMessage} onStartAutopilot={handOver} onCancelAutopilot={takeOver} />
          : <ManualPanel useRunStore={useRunStore} tool={manualTool} terrainMode={terrainMode} flattenOrientation={flattenOrientation}
            brush={radius} onBrush={setRadius} onTool={selectTool} detectorCount={detector.center ? scanResults.length : null} />}
        <p className="action-message" aria-live="polite">{message}</p>
        </section>
      </div>}
      <div className="right-sidebar">
        <div className="sidebar-controls">
          <div className="exploration-toolbar">
            <button onClick={() => { movement.current.clear(); setMapOpen(true) }}><PixelIcon glyph="map" />World map & landing</button>
            {canPull && <button onClick={() => openSystem()}><PixelIcon glyph="system" />System overview</button>}
            {surfaceSite && <button onClick={returnToOrbit}><PixelIcon glyph="orbit" />Return to orbit</button>}
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
        dirtyChunks={world.dirtyChunkCount} remeshMs={world.lastRemeshMs} lodCounts={world.lodCounts}
        residents={(({ peeking, hiding, moving, searching }) => `${peeking} peek · ${hiding} hide · ${moving} move · ${searching} search`)(residentSummary(useRunStore.getState().residents))}
        habitat={(({ residents, habitat }) => `${residents.filter(r => r.home && r.homeValid).length}/${residents.length} homes ok · ${habitat.candidates.length} dug · peak ${Math.max(0, ...residents.map(r => r.home ? disturbanceAt(habitat, r.home) : 0)).toFixed(2)}`)(useRunStore.getState())} />}
      {mapOpen && <WorldMap world={world} useRunStore={useRunStore} sites={landingSites} positionRef={walkerPosition}
        onLand={land} onClose={() => setMapOpen(false)} />}
      {pulledBack && <SystemLabels planets={systemWorlds} layout={layout} sphereRef={sphereRef} />}
      {pulledBack && <HoldToTravel planets={systemWorlds} layout={layout} sphereRef={sphereRef} />}
      <SystemWorldList planets={systemWorlds} />
      <SystemCaption planets={systemWorlds} />
      <SystemReturn />
      {surfaceSite && <div className="surface-hud">
        <p>{surfaceSite.name} · Surface exploration</p><span>WASD / arrows to walk · drag to look · Esc to orbit</span>
        <div className="walk-pad" aria-label="Walking controls">{[['w', 'Forward ↑'], ['a', 'Left ←'], ['s', 'Back ↓'], ['d', 'Right →']].map(([key, label]) =>
          <button key={key} aria-label={label} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); movement.current.add(key) }}
            onPointerUp={() => movement.current.delete(key)} onPointerCancel={() => movement.current.delete(key)}
            onLostPointerCapture={() => movement.current.delete(key)} onBlur={() => movement.current.delete(key)}>{label}</button>)}</div>
      </div>}
      <Comms useRunStore={useRunStore} onOpenRobot={openRobot} onTakeOver={takeOver} />
      <footer>{hint.map(([keys, action]) => <span key={keys}><kbd>{keys}</kbd>{action}</span>)}</footer>
    </main>
    {introOpen && <OpeningTitle onComplete={completeIntro} />}
    {bankrupt && <GameOver />}
    <SystemVeil />
    </>
  )
}
