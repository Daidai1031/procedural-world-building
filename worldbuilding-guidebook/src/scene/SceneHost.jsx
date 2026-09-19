import { OrbitControls, OrthographicCamera } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { MOUSE } from 'three'
import { useSceneStore } from '../store/sceneStore.js'
import { demoRegistry } from './demoRegistry.js'
import { getInset } from './insetRegistry.js'

const DEFAULT_TARGET = [0, 0.75, 0]
// Mirrors the literal array in the canvas-camera region below, kept as its own
// constant rather than a shared reference because that region's numbers are
// quoted verbatim in step 10's prose and must stay literal.
const DEFAULT_CAMERA_POSITION = [6, 5, 8]
const ORTHOGRAPHIC_ZOOM = 60

// Only ever runs for a step whose frontmatter asks for it, or the viewport
// toolbar's Recenter button. Navigation on its own leaves the camera exactly
// where the learner left it.
function CameraReset() {
  const cameraResetToken = useSceneStore((state) => state.cameraResetToken)
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)

  useEffect(() => {
    if (cameraResetToken === 0 || !controls) return

    camera.position.set(...DEFAULT_CAMERA_POSITION)
    controls.target.set(...DEFAULT_TARGET)
    controls.update()
  }, [cameraResetToken, camera, controls])

  return null
}

// Swaps in an orthographic camera as R3F's default without touching the
// perspective one the canvas-camera region declares. The idle camera tracks
// the active one every frame, so whichever one takes over next — including
// switching back — picks up exactly where the other left off instead of
// snapping to a stale pose.
function ProjectionRig() {
  const projection = useSceneStore((state) => state.projection)
  const cameraResetToken = useSceneStore((state) => state.cameraResetToken)
  const camera = useThree((state) => state.camera)
  const perspectiveCamera = useRef(null)
  const orthographicCamera = useRef(null)
  const isOrthographic = projection === 'orthographic'

  useEffect(() => {
    if (!isOrthographic) perspectiveCamera.current = camera
  }, [camera, isOrthographic])

  // Seeds the freshly mounted camera with the other one's pose before the
  // first paint, so switching projection never snaps the view.
  useLayoutEffect(() => {
    if (!isOrthographic || !orthographicCamera.current || !perspectiveCamera.current) return
    orthographicCamera.current.position.copy(perspectiveCamera.current.position)
    orthographicCamera.current.quaternion.copy(perspectiveCamera.current.quaternion)
  }, [isOrthographic])

  useEffect(() => {
    if (cameraResetToken === 0 || !orthographicCamera.current) return
    orthographicCamera.current.zoom = ORTHOGRAPHIC_ZOOM
    orthographicCamera.current.updateProjectionMatrix()
  }, [cameraResetToken])

  useFrame(() => {
    if (!isOrthographic || !orthographicCamera.current || !perspectiveCamera.current) return
    perspectiveCamera.current.position.copy(orthographicCamera.current.position)
    perspectiveCamera.current.quaternion.copy(orthographicCamera.current.quaternion)
  })

  if (!isOrthographic) return null

  return (
    <OrthographicCamera
      ref={orthographicCamera}
      makeDefault
      position={DEFAULT_CAMERA_POSITION}
      zoom={ORTHOGRAPHIC_ZOOM}
      near={0.1}
      far={200}
    />
  )
}

// The Rhino-style wireframe toggle: every material in the scene, not just the
// current demo's, so it stays correct across navigation.
function WireframeSync() {
  const wireframe = useSceneStore((state) => state.wireframe)
  const demoKey = useSceneStore((state) => state.demoKey)
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    scene.traverse((object) => {
      if (!object.isMesh) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of materials) {
        if (material && 'wireframe' in material) material.wireframe = wireframe
      }
    })
  }, [wireframe, demoKey, scene])

  return null
}

function AxesToggle() {
  const axesVisible = useSceneStore((state) => state.axesVisible)
  if (!axesVisible) return null
  return <axesHelper args={[5]} />
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
        {/* #region canvas-camera */}
        <Canvas
          shadows
          camera={{ position: [6, 5, 8], fov: 50, near: 0.1, far: 200 }}
          resize={{ debounce: 0 }}
        >
          {/* #endregion */}
          {/* #region orbit-controls */}
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.08}
            minDistance={3}
            maxDistance={40}
            maxPolarAngle={Math.PI / 2.05}
            target={DEFAULT_TARGET}
            mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.PAN }}
          />
          {/* #endregion */}
          <ProjectionRig />
          <CameraReset />
          <AxesToggle />
          <WireframeSync />
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
