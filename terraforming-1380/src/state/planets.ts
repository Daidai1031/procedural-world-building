import { create } from 'zustand'
import { PlanetWorld, hashSeed } from '../world/planet'
import type { RunState, createRunStore } from './runState'

type Store = ReturnType<typeof createRunStore>

export interface PlanetEntry { seed: string; name: string }

// PLN-01: the seed is the stable planet ID; the display name is derived from it.
export function planetName(seed: string, homeSeed: string) {
  return seed === homeSeed ? 'Home site' : `KX-${100 + (hashSeed(seed) % 900)}`
}

// PLN-03/04: one registry per run store. It keeps every visited planet's edited density and a snapshot of its run state,
// so switching planets only swaps which one is active. D-040: inactive planets are frozen, funds are shared.
export class PlanetRegistry {
  readonly homeSeed: string
  private readonly worlds = new Map<string, PlanetWorld>()
  private readonly snapshots = new Map<string, RunState>()
  readonly list = create<{ planets: PlanetEntry[] }>()(() => ({ planets: [] }))

  constructor(homeSeed: string) {
    this.homeSeed = homeSeed
    this.add(homeSeed)
  }

  private add(seed: string) {
    const { planets } = this.list.getState()
    if (!planets.some(p => p.seed === seed)) this.list.setState({ planets: [...planets, { seed, name: planetName(seed, this.homeSeed) }] })
  }

  world(seed: string) {
    let world = this.worlds.get(seed)
    if (!world) { world = new PlanetWorld(seed); this.worlds.set(seed, world) }
    return world
  }
  has(seed: string) { return this.worlds.has(seed) || this.snapshots.has(seed) }
  snapshot(seed: string) { return this.snapshots.get(seed) }
  save(state: RunState) { this.snapshots.set(state.seed, state); this.add(state.seed) }
  discover(seed: string) { this.add(seed) }
}

const registries = new WeakMap<Store, PlanetRegistry>()
export function registryFor(store: Store) {
  let registry = registries.get(store)
  if (!registry) { registry = new PlanetRegistry(store.getState().seed); registries.set(store, registry) }
  return registry
}
