import { useMemo } from 'react'
import { useSceneStore } from '../../store/sceneStore.js'
import { mapSettingsFromParams } from '../demos/proceduralMaps/params.js'
import NoiseMapPreview from '../demos/proceduralMaps/NoiseMapPreview.jsx'

export default function NoiseMap({ params: overrides }) {
  const params = useSceneStore((state) => state.params)
  const settings = useMemo(() => mapSettingsFromParams({ ...params, ...overrides }), [params, overrides])
  return <NoiseMapPreview settings={settings} />
}
