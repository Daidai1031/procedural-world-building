import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import type { createRunStore } from '../state/runState'
import { createPlanetField, type PlanetWorld } from '../world/planet'
import { groundRadius, mapDirection, mapPoint, type LandingSite } from '../systems/exploration'
import type { Vec3 } from '../systems/geometry'
import { HALF } from '../systems/geometry'
import { resourceColors } from '../config/resourceColors'
import { tuning } from '../config/tuning'

// Every robot on the planet; kinds with more than one are numbered (Autopilot fields several).
function crewPositions(state: ReturnType<ReturnType<typeof createRunStore>['getState']>) {
  return ([['Miner', state.robots], ['Gardener', state.gardeners], ['Builder', state.builders]] as const).flatMap(([name, list]) =>
    list.map((robot, i) => ({ position: robot.position as Vec3, label: list.length > 1 ? `${name} ${i + 1}` : name })))
}

const cols = 64, rows = 32
const directions = Array.from({ length: cols * rows }, (_, i) => mapDirection((i % cols + 0.5) * 800 / cols, (Math.floor(i / cols) + 0.5) * 400 / rows))
const originals = new WeakMap<PlanetWorld, number[]>()
function baseline(world: PlanetWorld, seed: string) {
  if (!originals.has(world)) {
    const field = createPlanetField(seed)
    const spacing = HALF * 2 / (tuning.grid.resolution - 1)
    const initial = { densityAt: (x: number, y: number, z: number) => field(
      Math.round((x + HALF) / spacing) * spacing - HALF,
      Math.round(y / spacing) * spacing,
      Math.round((z + HALF) / spacing) * spacing - HALF) }
    originals.set(world, directions.map(d => groundRadius(initial, d)))
  }
  return originals.get(world)!
}

export function WorldMap({ world, useRunStore, sites, positionRef, onLand, onClose }: {
  world: PlanetWorld; useRunStore: ReturnType<typeof createRunStore>; sites: LandingSite[];
  positionRef: MutableRefObject<Vec3 | null>; onLand: (site: LandingSite) => boolean; onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const seed = useRunStore(s => s.seed)
  const clusters = useRunStore(s => s.resourceClusters)
  const collected = useRunStore(s => s.collectedIds)
  const structures = useRunStore(s => s.structures)
  const remaining = useRunStore(s => s.planetRemaining)
  const [sample, setSample] = useState(() => ({ heights: directions.map(d => groundRadius(world, d)), player: positionRef.current,
    robots: crewPositions(useRunStore.getState()) }))
  const original = useMemo(() => baseline(world, seed), [world, seed])
  const [layers, setLayers] = useState({ resources: true, development: true, landing: true })
  const [landingError, setLandingError] = useState('')
  const [selected, setSelected] = useState(sites.find(s => s.available)?.id ?? '')
  const site = sites.find(s => s.id === selected)
  useEffect(() => {
    dialog.current?.showModal()
    const timer = window.setInterval(() => {
      const state = useRunStore.getState()
      setSample({ heights: directions.map(d => groundRadius(world, d)), player: positionRef.current,
        robots: crewPositions(state) })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [world, useRunStore, positionRef])
  const mined = clusters.filter(c => c.category === 'mineral' && collected.includes(c.id)).length
  return <dialog className="world-map-dialog" ref={dialog} aria-labelledby="map-title" onClose={onClose}>
    <div className="map-heading"><div><p className="kicker">Orbital survey / live atlas</p><h2 id="map-title">World map</h2></div>
      <button className="map-close" onClick={onClose} aria-label="Close world map">Close ×</button></div>
    <div className="map-layers" aria-label="Map layers">
      {(['resources', 'development', 'landing'] as const).map(layer => <label key={layer}><input type="checkbox" checked={layers[layer]}
        onChange={event => setLayers(current => ({ ...current, [layer]: event.target.checked }))} />{layer === 'landing' ? 'Landing sites' : layer === 'development' ? 'Development' : 'Resources'}</label>)}
    </div>
    <svg className="world-map" viewBox="0 0 800 400" aria-label="Equirectangular world map: terrain, resources and landing sites">
      <rect width="800" height="400" fill="#d8d4c8" />
      {sample.heights.map((height, index) => {
        const change = height - original[index]
        const shade = Math.max(48, Math.min(82, 64 + (height - 2) * 25))
        const color = layers.development && Math.abs(change) > 0.08 ? change < 0 ? '#b97658' : '#d0ad62' : 'hsl(55 10% ' + shade + '%)'
        return <rect key={index} x={(index % cols) * 800 / cols} y={Math.floor(index / cols) * 400 / rows} width={800 / cols + 0.2} height={400 / rows + 0.2} fill={color} />
      })}
      {Array.from({ length: 7 }, (_, i) => <path key={'lon' + i} d={'M' + (i + 1) * 100 + ' 0 V400'} stroke="#fbfaf6" strokeOpacity=".3" fill="none" />)}
      {Array.from({ length: 3 }, (_, i) => <path key={'lat' + i} d={'M0 ' + (i + 1) * 100 + ' H800'} stroke="#fbfaf6" strokeOpacity=".3" fill="none" />)}
      {layers.resources && clusters.filter(c => !collected.includes(c.id)).map(cluster => {
        const [x, y] = mapPoint(cluster.position)
        return <g key={cluster.id} transform={'translate(' + x + ' ' + y + ')'}><title>{cluster.category + ' / subsurface deposit'}</title>
          <circle r="9" fill={resourceColors[cluster.category]} stroke="#fbfaf6" strokeWidth="1.5" />
          <text textAnchor="middle" y="3" fontSize="9" fill="#242720">M</text></g>
      })}
      {layers.development && structures.map(structure => {
        const [x, y] = mapPoint(structure.position)
        return <g key={structure.id} transform={'translate(' + x + ' ' + y + ')'}><title>{structure.kind}</title>
          {structure.kind === 'plant' ? <path d="M0 -5 L5 4 H-5 Z" fill="#3f704b" stroke="#fff" strokeWidth=".6" /> : <path d="M-4 -4 H4 V4 H-4 Z" fill="#454641" stroke="#fff" strokeWidth="1" />}</g>
      })}
      {layers.development && sample.robots.map((robot, i) => {
        const [x, y] = mapPoint(robot.position)
        return <g key={i} transform={'translate(' + x + ' ' + y + ')'}><circle r="6" fill="#353632" stroke="#fff" /><text y="-10" textAnchor="middle" fontSize="10" fill="#242720">{robot.label}</text></g>
      })}
      {layers.landing && sites.map(s => {
        const [x, y] = mapPoint(s.position)
        return <g key={s.id} transform={'translate(' + x + ' ' + y + ')'} role="button" tabIndex={0}
          aria-label={s.name + (s.available ? ', select landing site' : ', unavailable')} aria-pressed={selected === s.id}
          onClick={() => setSelected(s.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(s.id) } }}>
          <circle r="14" fill={selected === s.id ? '#353632' : '#fbfaf6'} stroke={s.available ? '#546d59' : '#9c3d22'} strokeWidth="2" />
          <text textAnchor="middle" y="4" fontSize="11" fill={selected === s.id ? '#fff' : '#353632'}>{s.available ? '↓' : '×'}</text>
          <text textAnchor="middle" y="-19" fontSize="11" fill="#242720" stroke="#fbfaf6" strokeWidth="3" paintOrder="stroke">{s.name}</text>
        </g>
      })}
      {sample.player && <g transform={'translate(' + mapPoint(sample.player).join(' ') + ')'}><circle r="8" fill="#426e9c" stroke="white" strokeWidth="2" /><text y="-13" textAnchor="middle" fontSize="12" fill="#253e59" stroke="#fff" strokeWidth="3" paintOrder="stroke">You</text></g>}
      <text x="8" y="16" fontSize="10" fill="#353632">90° N</text><text x="8" y="390" fontSize="10" fill="#353632">90° S</text>
    </svg>
    <div className="map-legend"><span>◉ M Mineral</span><span>▲ Plants · ■ Antennas</span><span className="map-cut">■ Excavated</span><span className="map-fill">■ Filled</span><span>↓ Landing</span></div>
    <p className="map-note">Surface height map · subsurface resources projected to the surface · updates every second</p>
    <div className="map-summary"><span>{(remaining * 100).toFixed(1)}% planet remaining</span><span>{mined} minerals collected</span><span>{structures.filter(s => s.kind === 'plant').length} living plants</span><span>{sites.filter(s => s.available).length} landing sites available</span></div>
    <div className="landing-picker"><label>Landing site <select value={selected} onChange={event => setSelected(event.target.value)}>
      {sites.map(s => <option key={s.id} value={s.id}>{s.name}{s.available ? '' : ' — unavailable'}</option>)}
    </select></label><p>{site?.available ? 'Walk the surface. Return to orbit at any time.' : 'Terrain is too steep or the ground is missing.'}</p>
      <button disabled={!site?.available} onClick={() => { if (site && !onLand(site)) setLandingError('Ground has changed. Select a different landing site.') }}>Land here ↓</button></div>
    {landingError && <p role="status" className="notice">{landingError}</p>}
  </dialog>
}
