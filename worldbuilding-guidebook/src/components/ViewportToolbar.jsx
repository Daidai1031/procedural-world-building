import { useSceneStore } from '../store/sceneStore.js'

// Only the terrain demos colour by height, so only they have a grayscale view.
const TERRAIN_DEMOS = ['noise-terrain', 'simulation-terrain', 'voxel-terrain']

// Only the demos that cut the volume into chunks draw chunk outlines, so only they
// can hide them.
const CHUNK_DEMOS = ['voxel-chunks', 'voxel-edit', 'voxel-lod']

// Rhino-style viewport controls: they act on the one shared canvas, not the
// current lesson's params, so they render in every scene strip regardless of
// which demo is active.
export default function ViewportToolbar() {
  const isOrthographic = useSceneStore((state) => state.projection === 'orthographic')
  const wireframe = useSceneStore((state) => state.wireframe)
  const axesVisible = useSceneStore((state) => state.axesVisible)
  const grayscale = useSceneStore((state) => state.grayscale)
  const outlinesVisible = useSceneStore((state) => state.outlinesVisible)
  const demoKey = useSceneStore((state) => state.demoKey)
  const toggleProjection = useSceneStore((state) => state.toggleProjection)
  const toggleWireframe = useSceneStore((state) => state.toggleWireframe)
  const toggleAxes = useSceneStore((state) => state.toggleAxes)
  const toggleGrayscale = useSceneStore((state) => state.toggleGrayscale)
  const toggleOutlines = useSceneStore((state) => state.toggleOutlines)
  const requestCameraReset = useSceneStore((state) => state.requestCameraReset)

  return (
    <div className="viewport-toolbar" role="group" aria-label="Viewport">
      <button type="button" aria-pressed={isOrthographic} onClick={toggleProjection}>
        {isOrthographic ? 'Orthographic' : 'Perspective'}
      </button>
      <button type="button" aria-pressed={wireframe} onClick={toggleWireframe}>
        Wireframe
      </button>
      <button type="button" aria-pressed={axesVisible} onClick={toggleAxes}>
        Axes
      </button>
      {TERRAIN_DEMOS.includes(demoKey) && (
        <button type="button" aria-pressed={grayscale} onClick={toggleGrayscale}>
          Grayscale
        </button>
      )}
      {CHUNK_DEMOS.includes(demoKey) && (
        <button type="button" aria-pressed={outlinesVisible} onClick={toggleOutlines}>
          Chunk outlines
        </button>
      )}
      <button type="button" onClick={requestCameraReset}>
        Recenter
      </button>
    </div>
  )
}
