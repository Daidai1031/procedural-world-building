import type { RunState, createRunStore } from '../state/runState'
import { registryFor } from '../state/planets'
import { distantPlanets, visiblePlanetCount } from './signal'
import { hashSeed, planetConfig } from '../world/planet'
import { tuning } from '../config/tuning'
import { planetName } from '../state/planets'
import { parentSeed } from './systemView'

type Store = ReturnType<typeof createRunStore>

export interface SystemPlanet {
  seed: string
  name: string
  position: [number, number, number]
  parent: string | null
  visited: boolean
  active: boolean
  // Descriptive state only (SYS-03): no score and no universal end goal.
  remaining: number | null
  plants: number
  antennas: number
  robotsRunning: number
  residents: number
  residentsSearching: number
  traits: string
}

const SPACING = 6.5

// SYS-01: a stable spatial arrangement, not orbital physics. A planet found by a signal sits near the one that sent it.
export function planetPosition(seed: string): [number, number, number] {
  const match = /^(.*)\/signal-(\d+)$/.exec(seed)
  if (!match) return [0, 0, 0]
  const [, parent, index] = match
  const [px, py, pz] = planetPosition(parent)
  const hash = hashSeed(seed)
  const angle = (Number(index) - 1) * 1.2566 + 0.6 + ((hash % 100) / 100 - 0.5) * 0.5
  const lift = (((hash >>> 8) % 100) / 100 - 0.5) * 3
  return [px + Math.cos(angle) * SPACING, py + lift, pz + Math.sin(angle) * SPACING]
}

// PLN-02: the starting conditions in words, so planets can be compared before and after a visit.
export function planetTraits(seed: string) {
  const config = planetConfig(seed)
  const { home } = tuning.planets
  const size = config.radius < home.radius - 0.05 ? 'Small' : config.radius > home.radius + 0.01 ? 'Large' : 'Mid-sized'
  const relief = config.relief < 0.1 ? 'smooth' : config.relief > 0.17 ? 'rugged' : 'rolling'
  const minerals = config.minerals < 0.8 ? 'mineral-poor' : config.minerals > 1.3 ? 'mineral-rich' : 'some minerals'
  const residents = config.residents < 0.8 ? 'few residents' : config.residents > 1.3 ? 'many residents' : 'some residents'
  return `${size}, ${relief}, ${minerals}, ${residents}`
}

const active = (phase: string) => !['idle', 'paused', 'stopped'].includes(phase)
function describe(state: RunState) {
  return {
    remaining: state.planetRemaining,
    plants: state.structures.filter(s => s.kind === 'plant').length,
    antennas: state.structures.filter(s => s.kind === 'antenna').length,
    residents: state.residents.length,
    residentsSearching: state.residents.filter(r => r.state === 'moving' || r.state === 'searching').length,
    robotsRunning: state.robots.filter(r => active(r.phase)).length + state.gardeners.filter(r => active(r.phase)).length
      + state.builders.filter(r => active(r.phase)).length,
  }
}

// Every visited planet, plus planets that visited planets have answered but nobody has landed on yet.
export function systemPlanets(store: Store): SystemPlanet[] {
  const registry = registryFor(store)
  const current = store.getState()
  const visited = registry.list.getState().planets
  const states = new Map(visited.map(({ seed }) => [seed, seed === current.seed ? current : registry.snapshot(seed)]))
  const out: SystemPlanet[] = visited.map(({ seed, name }) => {
    const state = states.get(seed)
    return { seed, name, position: planetPosition(seed), parent: parentSeed(seed), visited: true, active: seed === current.seed, traits: planetTraits(seed),
      ...(state ? describe(state) : { remaining: null, plants: 0, antennas: 0, robotsRunning: 0, residents: 0, residentsSearching: 0 }) }
  })
  for (const [seed, state] of states) {
    if (!state) continue
    const count = visiblePlanetCount(state.signal.broadcastCount)
    for (const planet of distantPlanets(seed).slice(0, count)) {
      if (out.some(p => p.seed === planet.seed)) continue
      out.push({ seed: planet.seed, name: planetName(planet.seed, registry.homeSeed), position: planetPosition(planet.seed), parent: parentSeed(planet.seed), visited: false,
        active: false, remaining: null, plants: 0, antennas: 0, robotsRunning: 0, residents: 0, residentsSearching: 0, traits: planetTraits(planet.seed) })
    }
  }
  return out
}

// SYS-06: the one-line description of a world, shared by the caption and the screen-reader list. Descriptive only.
export function describePlanet(planet: SystemPlanet) {
  if (!planet.visited) return `${planet.traits} · answered a signal, not visited yet`
  const parts = [planet.traits, `${Math.round((planet.remaining ?? 1) * 100)}% of the original rock`]
  // Descriptive only: where residents are, never whether they are "happy".
  if (planet.residents) parts.push(`${planet.residents} resident${planet.residents === 1 ? '' : 's'}${planet.residentsSearching ? `, ${planet.residentsSearching} looking for shelter` : ''}`)
  if (planet.plants || planet.antennas) parts.push(`${planet.plants} plant${planet.plants === 1 ? '' : 's'}, ${planet.antennas} antenna${planet.antennas === 1 ? '' : 's'}`)
  parts.push(planet.active ? (planet.robotsRunning ? `${planet.robotsRunning} robot${planet.robotsRunning === 1 ? '' : 's'} at work` : 'Crew idle')
    : planet.robotsRunning ? 'Crew paused until you return' : 'Quiet')
  return parts.join(' · ')
}
