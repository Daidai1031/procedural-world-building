import { useMemo } from 'react'
import { useSceneStore } from '../../../store/sceneStore.js'
import { mapSettingsFromParams } from './params.js'
import TerrainPreview from './TerrainPreview.jsx'
import TerrainWorld from './TerrainWorld.jsx'
import { useWireframeShortcut } from './useWireframeShortcut.js'

export default function NoiseTerrainDemo() {
  const params = useSceneStore((state) => state.params)
  const compareRevision = useSceneStore((state) => state.compareRevision)
  const settings = useMemo(() => mapSettingsFromParams(params), [params])
  useWireframeShortcut()
  return (
    <TerrainWorld>
      <TerrainPreview settings={settings} wireframe={params.mapWireframe} compareRevision={compareRevision} />
    </TerrainWorld>
  )
}
