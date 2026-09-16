import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { useSceneStore } from '../store/sceneStore.js'
import { demoRegistry } from './demoRegistry.js'
import { getInset } from './insetRegistry.js'

const DEFAULT_CAMERA = { position: [6, 5, 8], fov: 50, near: 0.1, far: 200 }
const DEFAULT_TARGET = [0, 0.75, 0]

// Only ever runs for a step whose frontmatter asks for it. Navigation on its own
// leaves the camera exactly where the learner left it.
function CameraReset() {
  const cameraResetToken = useSceneStore((state) => state.cameraResetToken)
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)

  useEffect(() => {
    if (cameraResetToken === 0 || !controls) return

    camera.position.set(...DEFAULT_CAMERA.position)
    controls.target.set(...DEFAULT_TARGET)
    controls.update()
  }, [cameraResetToken, camera, controls])

  return null
}

// THE single <Canvas>. It mounts once and never unmounts — demos swap beneath it,
// so the renderer, the WebGL context, and the camera survive every navigation,
// including the move into and out of the inset corner.
export default function SceneHost() {
  const demoKey = useSceneStore((state) => state.demoKey)
  const insetKey = useSceneStore((state) => state.insetKey)
  const insetSwapped = useSceneStore((state) => state.insetSwapped)
  const toggleInsetSwapped = useSceneStore((state) => state.toggleInsetSwapped)
  const Demo = demoKey ? demoRegistry[demoKey]?.component : null

  const inCorner = insetSwapped && getInset(insetKey) !== null

  return (
    <div className="view-slot scene-host" data-slot={inCorner ? 'corner' : 'full'}>
      <div className="view-slot__surface" aria-hidden="true">
        {/* The canvas follows its slot frame by frame during the swap rather
            than snapping at the end of it, which is the whole point of
            animating the trade in the first place. */}
        <Canvas shadows camera={DEFAULT_CAMERA} resize={{ debounce: 0 }}>
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.08}
            minDistance={3}
            maxDistance={40}
            maxPolarAngle={Math.PI / 2.05}
            target={DEFAULT_TARGET}
          />
          <CameraReset />
          {Demo && <Demo key={demoKey} />}
        </Canvas>
      </div>

      {inCorner && (
        <p className="view-slot__caption">
          <button type="button" className="view-slot__caption-button" onClick={toggleInsetSwapped}>
            The scene in 3D
          </button>
        </p>
      )}
    </div>
  )
}
