import type { RunState, createRunStore } from '../state/runState'
import { materialIds, type MaterialId } from '../content/materials'
import { surfaceOf } from '../world/planet'
import { tuning } from '../config/tuning'

type Store = ReturnType<typeof createRunStore>

// D-066: whole units of construction material, one count per material, kept per planet in its run state.
export type Inventory = Record<MaterialId, number>

export function emptyInventory(): Inventory {
  return Object.fromEntries(materialIds.map(id => [id, 0])) as Inventory
}

/** The one material this planet's excavation yields. */
export const nativeMaterial = (seed: string): MaterialId => surfaceOf(seed).material

export const stockOf = (state: Pick<RunState, 'inventory'>, material: MaterialId) => state.inventory[material]
export const nativeStock = (state: Pick<RunState, 'inventory' | 'seed'>) => state.inventory[nativeMaterial(state.seed)]

/** Units of material that `samples` removed density samples are worth. */
export const unitsFor = (samples: number) => Math.floor(samples * tuning.materials.unitPerSample)

export function deposit(store: Store, material: MaterialId, amount: number) {
  const units = Math.floor(amount)
  if (units <= 0) return 0
  store.setState(state => ({ inventory: { ...state.inventory, [material]: state.inventory[material] + units } }))
  return units
}

// All or nothing: a request larger than the stock changes nothing and returns false.
export function withdraw(store: Store, material: MaterialId, amount: number) {
  const units = Math.floor(amount)
  if (units < 0 || store.getState().inventory[material] < units) return false
  if (units > 0) store.setState(state => ({ inventory: { ...state.inventory, [material]: state.inventory[material] - units } }))
  return true
}

// For an edit that has already happened (the Builder's terrain change): add what it returned, take what it used.
// Stock never goes negative; the part of the use that stock could not cover is returned so a caller can see it.
export function settle(store: Store, material: MaterialId, gained: number, used: number) {
  const state = store.getState()
  const have = state.inventory[material] + Math.floor(gained)
  const taken = Math.min(have, Math.floor(used))
  store.setState({ inventory: { ...state.inventory, [material]: have - taken } })
  return Math.floor(used) - taken
}
