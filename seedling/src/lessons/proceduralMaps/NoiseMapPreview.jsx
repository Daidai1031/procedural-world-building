import { useEffect, useRef } from 'react'
import { sampleProceduralMap } from './noiseMath.js'

const MAP_SIZE = 220
const SAMPLE_SPAN = 10

export default function NoiseMapPreview({ settings }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const image = context.createImageData(MAP_SIZE, MAP_SIZE)

    for (let pixelY = 0; pixelY < MAP_SIZE; pixelY += 1) {
      for (let pixelX = 0; pixelX < MAP_SIZE; pixelX += 1) {
        const sampleX = (pixelX / (MAP_SIZE - 1) - 0.5) * SAMPLE_SPAN
        const sampleY = (pixelY / (MAP_SIZE - 1) - 0.5) * SAMPLE_SPAN
        const value = sampleProceduralMap(sampleX, sampleY, settings)
        const gray = Math.round(value * 255)
        const index = (pixelY * MAP_SIZE + pixelX) * 4
        image.data[index] = gray
        image.data[index + 1] = gray
        image.data[index + 2] = gray
        image.data[index + 3] = 255
      }
    }

    context.putImageData(image, 0, 0)
  }, [settings])

  return (
    <section className="map-preview" aria-labelledby="map-preview-title">
      <header className="preview-header">
        <span>2D output</span>
        <strong id="map-preview-title">Noise map</strong>
      </header>
      <div className="map-preview__canvas-wrap">
        <canvas ref={canvasRef} width={MAP_SIZE} height={MAP_SIZE} />
      </div>
      <div className="map-preview__legend" aria-hidden="true">
        <span>0 · low</span>
        <i />
        <span>1 · high</span>
      </div>
    </section>
  )
}
