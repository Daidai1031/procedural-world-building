import type { createRunStore } from '../state/runState'
import { PlanetReadouts } from './PlanetReadouts'

// The active planet's own readouts, read live from the store and shown only while the camera is pulled back.
export function ActiveReadouts({ store, seed }: { store: ReturnType<typeof createRunStore>; seed: string }) {
  return <PlanetReadouts seed={seed} source={() => store.getState()} live />
}
