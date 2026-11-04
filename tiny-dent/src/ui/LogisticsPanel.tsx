import { useState } from 'react'
import type { createRunStore } from '../state/runState'
import { registryFor } from '../state/planets'
import type { SystemPlanet } from '../systems/system'
import { speciesName } from '../systems/migration'
import { creatureLines } from '../systems/migration'
import { planetName } from '../state/planets'
import { buildRoute, buildSpaceport, cancelShipment, closeRoute, planetState, routeQuote, ship } from '../systems/logistics'
import { materials, materialIds } from '../content/materials'
import { tuning } from '../config/tuning'
import { useSystemView } from '../state/systemView'
import { toggleRailLayer, useRailLayers } from '../state/railLayers'

// D-067: spaceports, routes and shipments, offered only while the camera is pulled back. Every refusal says why.
export function LogisticsPanel({ useRunStore, planets }: { useRunStore: ReturnType<typeof createRunStore>; planets: SystemPlanet[] }) {
  const phase = useSystemView(state => state.phase)
  const logistics = registryFor(useRunStore).logistics
  const { routes, shipments, tick } = logistics()
  const layers = useRailLayers()
  const seed = useRunStore(state => state.seed)
  const port = useRunStore(state => state.spaceport)
  const inventory = useRunStore(state => state.inventory)
  const capital = useRunStore(state => state.metrics.capital)
  const [note, setNote] = useState('')
  if (phase !== 'system') return null
  const name = (id: string) => planets.find(p => p.seed === id)?.name ?? id
  const others = planets.filter(p => p.visited && !p.active)
  const open = routes.filter(r => r.status === 'open')
  const reply = (result: { ok: boolean; reason?: string }) => setNote(result.ok ? '' : result.reason ?? '')
  const stocked = materialIds.filter(id => inventory[id] > 0)
  const transit = shipments.filter(s => s.status === 'transit')
  return <aside className="logistics-panel" aria-label="Space trains">
    <p className="kicker">Space trains</p>
    <label><input type="checkbox" checked={layers.routes} onChange={() => toggleRailLayer('routes')} /> Rail routes</label>
    <label><input type="checkbox" checked={layers.flow} onChange={() => toggleRailLayer('flow')} /> Cargo flow</label>
    <p>{name(seed)}: {port ? 'spaceport built' : 'no spaceport'} · ₡{capital.toFixed(0)}</p>
    {!port && <button onClick={() => reply(buildSpaceport(useRunStore))}>Build spaceport (₡{tuning.logistics.spaceportCost})</button>}
    {port && others.map(p => {
      const joined = open.find(r => (r.a === p.seed && r.b === seed) || (r.b === p.seed && r.a === seed))
      const there = planetState(useRunStore, p.seed)?.spaceport
      return <div key={p.seed} className="logistics-row">
        <span>{p.name}{there ? '' : ' · no spaceport'}</span>
        {joined ? <button onClick={() => closeRoute(useRunStore, joined.id)}>Close route</button>
          : <button disabled={!there} onClick={() => reply(buildRoute(useRunStore, p.seed))}>Open route (₡{routeQuote(seed, p.seed).cost})</button>}
      </div>
    })}
    {port && open.length > 0 && stocked.map(id => {
      const lot = Math.min(tuning.logistics.lot, inventory[id])
      return others.filter(p => planetState(useRunStore, p.seed)?.spaceport).map(p => <button key={id + p.seed} onClick={() => reply(ship(useRunStore, p.seed, [{ material: id, amount: lot }]))}>
        Ship {lot} {materials[id].name.toLowerCase()} → {p.name}</button>)
    })}
    {port && open.length > 0 && <Passengers useRunStore={useRunStore} others={others} reply={reply} />}
    {transit.length > 0 && <ul>{transit.map(s => <li key={s.id}>
      {[...s.cargo.map(l => `${l.amount} ${materials[l.material].name.toLowerCase()}`), ...s.passengers.map(p => speciesName(p.species))].join(', ')} → {name(s.to)} · {Math.min(100, Math.round((tick - s.departTick) / (s.arriveTick - s.departTick) * 100))}%
      <button onClick={() => cancelShipment(useRunStore, s.id)}>Cancel</button></li>)}</ul>}
    {note && <p role="alert" className="logistics-note">{note}</p>}
  </aside>
}

// MIG: send a creature on a train, and read each visitor's passport line. Only mounted while the system view is open.
function Passengers({ useRunStore, others, reply }: { useRunStore: ReturnType<typeof createRunStore>; others: SystemPlanet[]; reply: (r: { ok: boolean; reason?: string }) => void }) {
  const residents = useRunStore(state => state.residents)
  const seed = useRunStore(state => state.seed)
  const homeSeed = registryFor(useRunStore).homeSeed
  const nameOf = (id: string) => planetName(id, homeSeed)
  const species = [...new Set(residents.map(resident => resident.species))]
  const visitors = residents.filter(resident => resident.origin !== seed)
  const targets = others.filter(p => planetState(useRunStore, p.seed)?.spaceport)
  return <>
    {species.flatMap(kind => targets.map(p => {
      const pick = residents.filter(resident => resident.species === kind).sort((a, b) => a.creatureId < b.creatureId ? -1 : 1).at(-1)!
      return <button key={kind + p.seed} onClick={() => reply(ship(useRunStore, p.seed, [], [pick.creatureId]))}>Send a {speciesName(kind)} → {p.name} (₡{tuning.migration.seatFee})</button>
    }))}
    {visitors.length > 0 && <ul aria-label="Visitors">{visitors.map(v => <li key={v.creatureId}><strong>{speciesName(v.species)}</strong> {creatureLines(v, nameOf).join(' · ')}</li>)}</ul>}
  </>
}
