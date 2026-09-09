import { useEffect, useRef } from 'react'

function mix(a, b, amount) {
  return Math.round(a + (b - a) * amount)
}

function terrainColor(height) {
  if (height < 0.45) {
    const amount = Math.max(0, height / 0.45)
    return [mix(153, 38, amount), mix(183, 127, amount), mix(245, 83, amount)]
  }

  const amount = Math.min(1, (height - 0.45) / 0.45)
  return [mix(38, 252, amount), mix(127, 202, amount), mix(83, 89, amount)]
}

export default function SimulationMapPreview({ simulation, isRunning }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const image = context.createImageData(simulation.size, simulation.size)

    for (let index = 0; index < simulation.height.length; index += 1) {
      const [terrainRed, terrainGreen, terrainBlue] = terrainColor(simulation.height[index])
      const waterAmount = Math.min(0.82, simulation.water[index] * 26)
      const pixelIndex = index * 4
      image.data[pixelIndex] = mix(terrainRed, 68, waterAmount)
      image.data[pixelIndex + 1] = mix(terrainGreen, 108, waterAmount)
      image.data[pixelIndex + 2] = mix(terrainBlue, 200, waterAmount)
      image.data[pixelIndex + 3] = 255
    }

    context.putImageData(image, 0, 0)
  }, [simulation])

  return (
    <section className="map-preview simulation-map" aria-labelledby="simulation-map-title">
      <header className="preview-header">
        <span>2D simulation state</span>
        <strong id="simulation-map-title">Height + water</strong>
      </header>
      <div className="map-preview__canvas-wrap">
        <canvas
          ref={canvasRef}
          width={simulation.size}
          height={simulation.size}
          aria-label={`Hydraulic erosion map at timestep ${simulation.iteration}`}
        />
      </div>
      <div className="simulation-map__legend" aria-label="Map legend">
        <span><i className="simulation-map__swatch simulation-map__swatch--low" />Low ground</span>
        <span><i className="simulation-map__swatch simulation-map__swatch--high" />High ground</span>
        <span><i className="simulation-map__swatch simulation-map__swatch--water" />Water</span>
      </div>
      <p className="simulation-map__caption" aria-live="polite">
        {isRunning ? 'Running' : 'Paused'} at timestep {simulation.iteration}
      </p>
    </section>
  )
}
