import { useEffect, useState } from 'react'
import type { createRunStore } from '../state/runState'
import type { PlanetWorld } from '../world/planet'
import { edgeInfo, hasNavGraph, navGraph } from '../systems/traffic'
import { tuning } from '../config/tuning'
import { selectEdge, toggleNavLayer, useNavLayers } from '../state/navLayers'

const layerNames = [['nodes', 'Navigation nodes'], ['heat', 'Traffic heat'], ['paths', 'Desire paths'], ['roads', 'Built roads'], ['blocked', 'Blocked edges']] as const

// D-070/RDS-09/10: the ground graph's layers and a card for one chosen edge: why it is a path or a road, in numbers.
// Closed by default so it stays out of the way. Reads the planet twice a second, not every tick.
export function TrafficPanel({ store, world }: { store: ReturnType<typeof createRunStore>; world: PlanetWorld }) {
  const layers = useNavLayers()
  const [, refresh] = useState(0)
  useEffect(() => { const timer = window.setInterval(() => refresh(n => n + 1), 500); return () => window.clearInterval(timer) }, [])
  const state = store.getState()
  const graph = hasNavGraph(world) ? navGraph(world, state.seed) : null
  const ranked = graph ? Object.entries(state.nav.heat).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 4).map(([id]) => id) : []
  const shown = [...new Set([...state.nav.roads.slice(0, 3), ...ranked])]
  const info = graph && layers.selected ? edgeInfo(state, graph, layers.selected) : null
  return <details className="traffic-panel">
    <summary>Roads &amp; paths · {state.nav.roads.length} road{state.nav.roads.length === 1 ? '' : 's'} · {state.nav.trips.length} walking</summary>
    {layerNames.map(([key, label]) => <label key={key}><input type="checkbox" checked={layers[key]} onChange={() => toggleNavLayer(key)} /> {label}</label>)}
    {shown.length === 0 && <p>Nothing has worn a path yet. Walkers go between the spaceport, colonies, mines and patches.</p>}
    {graph && shown.map(id => {
      const e = edgeInfo(state, graph, id)!
      return <button key={id} aria-pressed={layers.selected === id} onClick={() => selectEdge(layers.selected === id ? null : id)}>
        {e.kind === 'road' ? (e.blocked ? 'Blocked road' : 'Road') : e.blocked ? 'Blocked path' : 'Path'} · {e.uses} trip{e.uses === 1 ? '' : 's'} · heat {e.heat.toFixed(1)}</button>
    })}
    {info && <div className="traffic-card" role="status">
      <strong>{info.kind === 'road' ? 'Road' : info.kind === 'path' ? 'Desire path' : 'Faint trail'}{info.blocked ? ' · blocked' : ''}</strong>
      <p>{info.uses} crossing{info.uses === 1 ? '' : 's'}. Heat {info.heat.toFixed(1)}; a path shows at {info.pathAt}, a Builder may pave it at {info.roadAt}.</p>
      {info.kind === 'road' && !info.blocked && <p>Crossing costs {info.cost.toFixed(2)} instead of {info.plainCost.toFixed(2)} ({Math.round(info.cost / info.plainCost * 100)}%). It took {tuning.roads.cost} units of the planet&apos;s material.</p>}
      {info.blocked && <p>Terrain was cut here, so nothing can cross. {info.kind === 'road' ? 'The road stays on the books and opens again if the ground is rebuilt.' : ''}</p>}
      {info.reroutes.length > 0 && <p>{info.reroutes.length} walker{info.reroutes.length === 1 ? '' : 's'} turned back here and went another way.</p>}
    </div>}
  </details>
}
