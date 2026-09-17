import { useSceneStore } from '../store/sceneStore.js'

// Rhino-style viewport controls: they act on the one shared canvas, not the
// current lesson's params, so they render in every scene strip regardless of
// which demo is active.
export default function ViewportToolbar() {
  const isOrthographic = useSceneStore((state) => state.projection === 'orthographic')
  const wireframe = useSceneStore((state) => state.wireframe)
  const axesVisible = useSceneStore((state) => state.axesVisible)
  const toggleProjection = useSceneStore((state) => state.toggleProjection)
  const toggleWireframe = useSceneStore((state) => state.toggleWireframe)
  const toggleAxes = useSceneStore((state) => state.toggleAxes)
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
      <button type="button" onClick={requestCameraReset}>
        Recenter
      </button>
    </div>
  )
}
