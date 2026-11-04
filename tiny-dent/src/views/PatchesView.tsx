import { useEffect } from 'react'
import type { createRunStore } from '../state/runState'
import { setTerrainPatches } from '../render/terrainMaterial'

// D-069/PAT-03: patches are painted by the terrain shader itself (render/terrainMaterial.ts), so they take the contour
// lines, grain and lighting of the ground they lie on. This only hands the active planet's patches to it.
export function PatchesView({ store }: { store: ReturnType<typeof createRunStore> }) {
  const patches = store(state => state.patches)
  useEffect(() => {
    setTerrainPatches(patches)
    return () => setTerrainPatches([])
  }, [patches])
  return null
}
