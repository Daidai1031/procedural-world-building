import { useEffect, useRef } from 'react'
import { Color } from 'three'
import { useSceneStore } from '../../../store/sceneStore.js'
import { readToken } from '../../../styles/readToken.js'

function mix(a, b, amount) {
  return Math.round(a + (b - a) * amount)
}

function tokenChannels(name) {
  return new Color(readToken(name)).getHexString().match(/../g).map((value) => parseInt(value, 16))
}

function terrainColor(height, palette) {
  const low = height < 0.45 ? palette[0] : palette[1]
  const high = height < 0.45 ? palette[1] : palette[2]
  const amount = height < 0.45 ? Math.max(0, height / 0.45) : Math.min(1, (height - 0.45) / 0.45)
  return low.map((channel, index) => mix(channel, high[index], amount))
}

export default function SimulationMapPreview({ simulation }) {
  const grayscale = useSceneStore((state) => state.grayscale)
  const canvasRef = useRef(null)

  useEffect(() => {
    const context = canvasRef.current.getContext('2d')
    const image = context.createImageData(simulation.size, simulation.size)
    const palette = (grayscale ? ['--terrain-gray-low', '--terrain-gray-mid', '--terrain-gray-high'] : ['--meadow-deep', '--moss', '--summit']).map(tokenChannels)
    const waterColor = tokenChannels('--erosion-water')

    for (let index = 0; index < simulation.height.length; index += 1) {
      const terrain = terrainColor(simulation.height[index], palette)
      const waterAmount = Math.min(0.82, simulation.water[index] * 26)
      const pixelIndex = index * 4
      image.data[pixelIndex] = mix(terrain[0], waterColor[0], waterAmount)
      image.data[pixelIndex + 1] = mix(terrain[1], waterColor[1], waterAmount)
      image.data[pixelIndex + 2] = mix(terrain[2], waterColor[2], waterAmount)
      image.data[pixelIndex + 3] = 255
    }

    context.putImageData(image, 0, 0)
  }, [simulation, grayscale])

  return (
    <canvas
      className="inset__canvas"
      ref={canvasRef}
      width={simulation.size}
      height={simulation.size}
      aria-label={`Hydraulic erosion map at timestep ${simulation.iteration}`}
    />
  )
}
