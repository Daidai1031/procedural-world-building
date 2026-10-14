import { useMemo } from 'react'
import { useSceneStore } from '../../../store/sceneStore.js'
import { scatterSettingsFromParams } from './params.js'
import { buildLayout } from './scatter.js'

// The layout for the current settings. Random values are drawn only when one of
// these settings changes, never per frame, so the layout holds still. A compare
// side passes its own params over the store's.
export function useScatterLayout(overrides) {
  const params = useSceneStore((state) => state.params)
  const { candidateCount, seed, density, noiseFrequency, placementMode } = scatterSettingsFromParams({ ...params, ...overrides })

  return useMemo(
    () => buildLayout({ candidateCount, seed, density, noiseFrequency, placementMode }),
    [candidateCount, seed, density, noiseFrequency, placementMode],
  )
}
