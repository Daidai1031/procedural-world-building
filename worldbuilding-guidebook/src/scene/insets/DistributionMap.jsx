import { useEffect, useRef } from 'react'
import { readToken } from '../../styles/readToken.js'
import { SCATTER_WORLD_SIZE } from '../demos/distributions/terrain.js'
import { scatterSettingsFromParams } from '../demos/distributions/params.js'
import { useScatterLayout } from '../demos/distributions/useScatterLayout.js'
import { useSceneStore } from '../../store/sceneStore.js'
import { placementProbability } from '../demos/distributions/scatter.js'

const MAP_SIZE = 220
const DOT_RADIUS = 3
const ACCEPTED_DOT_RADIUS = 4.5

// The ground seen from above. Brightness is the placement probability at each
// spot, so the clusters of accepted candidates can be checked against it.
export default function DistributionMap({ params: overrides }) {
  const canvasRef = useRef(null)
  const params = useSceneStore((state) => state.params)
  const { density } = scatterSettingsFromParams({ ...params, ...overrides })
  const { candidates, accepted, noiseAt } = useScatterLayout(overrides)

  useEffect(() => {
    const context = canvasRef.current.getContext('2d')
    const image = context.createImageData(MAP_SIZE, MAP_SIZE)

    for (let pixelY = 0; pixelY < MAP_SIZE; pixelY += 1) {
      for (let pixelX = 0; pixelX < MAP_SIZE; pixelX += 1) {
        const x = (pixelX / (MAP_SIZE - 1) - 0.5) * SCATTER_WORLD_SIZE
        const z = (pixelY / (MAP_SIZE - 1) - 0.5) * SCATTER_WORLD_SIZE
        const gray = Math.round(placementProbability(noiseAt(x, z), density) * 255)
        const index = (pixelY * MAP_SIZE + pixelX) * 4
        image.data[index] = gray
        image.data[index + 1] = gray
        image.data[index + 2] = gray
        image.data[index + 3] = 255
      }
    }
    context.putImageData(image, 0, 0)

    const rejectedColor = readToken('--clay-deep')
    const acceptedColor = readToken('--scatter-rock')
    const outlineColor = readToken('--ink')
    candidates.forEach((candidate, index) => {
      const pixelX = (candidate.x / SCATTER_WORLD_SIZE + 0.5) * (MAP_SIZE - 1)
      const pixelY = (candidate.z / SCATTER_WORLD_SIZE + 0.5) * (MAP_SIZE - 1)
      context.beginPath()
      context.arc(pixelX, pixelY, accepted[index] ? ACCEPTED_DOT_RADIUS : DOT_RADIUS, 0, Math.PI * 2)
      context.fillStyle = accepted[index] ? acceptedColor : rejectedColor
      context.fill()
      if (accepted[index]) {
        context.lineWidth = 1
        context.strokeStyle = outlineColor
        context.stroke()
      }
    })
  }, [candidates, accepted, noiseAt, density])

  return (
    <canvas
      className="inset__canvas"
      ref={canvasRef}
      width={MAP_SIZE}
      height={MAP_SIZE}
      aria-label="Placement probability from low black to high white, with accepted and rejected candidates"
    />
  )
}
