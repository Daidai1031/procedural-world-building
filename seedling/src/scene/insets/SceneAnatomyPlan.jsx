import { useEffect, useRef } from 'react'
import { readToken } from '../../styles/readToken.js'
import { useSceneStore } from '../../store/sceneStore.js'
import { entities } from '../demos/sceneAnatomy/entities.js'

// The floor in SceneAnatomyDemo is 20 units square, so the plan draws the same
// extent. Both views are the same numbers seen from different places.
const WORLD_EXTENT = 20
// 2.5 world units per cell, the same section spacing the 3D grid is drawn at.
const GRID_DIVISIONS = 8
// DEFAULT_CAMERA and DEFAULT_TARGET in SceneHost.jsx, dropped onto the ground.
const CAMERA_START = [6, 8]
const CAMERA_TARGET = [0, 0]
const CAMERA_DOT_RADIUS = 4
const SELECTION_RING_GAP = 4
const SELECTION_RING_WIDTH = 2
const GRID_LINE_WIDTH = 1

// Half-width of each entity's footprint, in world units, taken from its geometry
// arguments in entities.js.
function footprintRadius(entity) {
  const [first, second] = entity.geometry.args

  if (entity.geometry.kind === 'box') return first / 2
  if (entity.geometry.kind === 'cylinder') return Math.max(first, second)
  if (entity.geometry.kind === 'torusKnot') return first + second

  return first
}

// The same drawing serves the 220px corner and the full viewport, so the world
// is scaled to the shorter side and centred rather than stretched.
function drawPlan(canvas, selectedEntityId) {
  const context = canvas.getContext('2d')
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (width === 0 || height === 0) return

  const ratio = window.devicePixelRatio || 1
  canvas.width = width * ratio
  canvas.height = height * ratio
  context.setTransform(ratio, 0, 0, ratio, 0, 0)

  // The same paper the 3D ground is made of, so the two views read as one
  // place. Emphasis here is ink, not --summit: this is the world, and --summit
  // is reserved for marking the current thing in the interface.
  const paper = readToken('--paper-2')
  const rule = readToken('--line')
  const ink = readToken('--ink')

  const plan = Math.min(width, height)
  const scale = plan / WORLD_EXTENT
  const toPixelsX = (worldX) => width / 2 + worldX * scale
  const toPixelsY = (worldZ) => height / 2 + worldZ * scale

  context.fillStyle = paper
  context.fillRect(0, 0, width, height)

  context.strokeStyle = rule
  context.lineWidth = GRID_LINE_WIDTH
  for (let division = 0; division <= GRID_DIVISIONS; division += 1) {
    const offset = (division / GRID_DIVISIONS - 0.5) * plan

    context.beginPath()
    context.moveTo(toPixelsX(0) + offset, 0)
    context.lineTo(toPixelsX(0) + offset, height)
    context.moveTo(0, toPixelsY(0) + offset)
    context.lineTo(width, toPixelsY(0) + offset)
    context.stroke()
  }

  for (const entity of entities) {
    const [x, , z] = entity.position
    const radius = footprintRadius(entity) * scale

    context.beginPath()
    context.arc(toPixelsX(x), toPixelsY(z), radius, 0, Math.PI * 2)
    context.fillStyle = readToken(entity.colorToken)
    context.fill()

    if (entity.id !== selectedEntityId) continue

    context.beginPath()
    context.arc(toPixelsX(x), toPixelsY(z), radius + SELECTION_RING_GAP, 0, Math.PI * 2)
    context.strokeStyle = ink
    context.lineWidth = SELECTION_RING_WIDTH
    context.stroke()
  }

  // Where the camera stands and what it is pointed at — the two numbers the
  // camera steps talk about, which a 3D view cannot show you from inside it.
  const [cameraX, cameraZ] = CAMERA_START
  const [targetX, targetZ] = CAMERA_TARGET

  context.strokeStyle = ink
  context.lineWidth = GRID_LINE_WIDTH
  context.beginPath()
  context.moveTo(toPixelsX(cameraX), toPixelsY(cameraZ))
  context.lineTo(toPixelsX(targetX), toPixelsY(targetZ))
  context.stroke()

  context.beginPath()
  context.arc(toPixelsX(cameraX), toPixelsY(cameraZ), CAMERA_DOT_RADIUS, 0, Math.PI * 2)
  context.fillStyle = ink
  context.fill()
}

// A plain 2D context, not a second <Canvas>. Those are cheap and may be created
// freely; the WebGL one is not.
export default function SceneAnatomyPlan() {
  const canvasRef = useRef(null)
  const selectedEntity = useSceneStore((state) => state.params.selectedEntity)

  useEffect(() => {
    const canvas = canvasRef.current
    drawPlan(canvas, selectedEntity)

    const observer = new ResizeObserver(() => drawPlan(canvas, selectedEntity))
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [selectedEntity])

  return <canvas className="inset__canvas" ref={canvasRef} />
}
