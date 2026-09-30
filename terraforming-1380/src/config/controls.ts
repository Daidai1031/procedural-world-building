import type { TerrainMode } from '../state/runState'

// D-015: F is the reliable path; modifier clicks are temporary shortcuts.
export const terrainModes: TerrainMode[] = ['dig', 'add', 'flatten']

export function nextTerrainMode(mode: TerrainMode): TerrainMode {
  return terrainModes[(terrainModes.indexOf(mode) + 1) % terrainModes.length]
}

export function modeForClick(selected: TerrainMode, alt: boolean, ctrl: boolean): TerrainMode | null {
  if (alt && ctrl) return null
  if (ctrl) return 'flatten'
  if (alt) return 'add'
  return selected
}
