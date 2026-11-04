import { create } from 'zustand'
import { PlanetWorld, hashSeed } from '../world/planet'
import type { RunState, createRunStore } from './runState'
import { emptyLogistics, type LogisticsState } from '../systems/logisticsState'

type Store = ReturnType<typeof createRunStore>

export interface PlanetEntry { seed: string; name: string }

// PLN-01: the seed is the stable planet ID; the display name is derived from it.
export function planetName(seed: string, homeSeed: string) {
  return seed === homeSeed ? 'Home site' : `KX-${100 + (hashSeed(seed) % 900)}`
}

// PLN-03/04: one registry per run store. It keeps every visited planet's edited density and a snapshot of its run state,
// so switching planets only swaps which one is visible. Funds are shared.
export class PlanetRegistry {
  readonly homeSeed: string
  private readonly worlds = new Map<string, PlanetWorld>()
  private readonly snapshots = new Map<string, RunState>()
  private readonly backgroundStores = new Map<string, Store>()
  // D-067: trains and routes belong to no planet, so they are kept here and are never frozen with one.
  readonly logistics = create<LogisticsState>()(() => emptyLogistics())
  readonly list = create<{ planets: PlanetEntry[] }>()(() => ({ planets: [] }))

  constructor(homeSeed: string, private readonly activeStore?: Store) {
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
  snapshot(seed: string) {
    const active = this.activeStore?.getState()
    return active?.seed === seed ? active : this.snapshots.get(seed)
  }
  backgroundStore(seed: string) {
    const state = this.snapshots.get(seed)
    if (!state) return undefined
    let store = this.backgroundStores.get(seed)
    if (!store) {
      store = create<RunState>()(() => state)
      this.backgroundStores.set(seed, store)
      registries.set(store, this)
    }
    store.setState(state, true)
    return store
  }
  save(state: RunState) { this.snapshots.set(state.seed, state); this.add(state.seed) }
  discover(seed: string) { this.add(seed) }
  // Deliveries and migration can address either the visible planet or a saved one.
  patchSnapshot(seed: string, change: (state: RunState) => Partial<RunState>) {
    if (this.activeStore?.getState().seed === seed) {
      this.activeStore.setState(change(this.activeStore.getState()))
      return true
    }
    const state = this.snapshots.get(seed)
    if (!state) return false
    this.snapshots.set(seed, { ...state, ...change(state) })
    return true
  }
}

const registries = new WeakMap<Store, PlanetRegistry>()
export function registryFor(store: Store) {
  let registry = registries.get(store)
  if (!registry) { registry = new PlanetRegistry(store.getState().seed, store); registries.set(store, registry) }
  return registry
}
