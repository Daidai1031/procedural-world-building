import { useEffect, useRef } from 'react'
import { useSceneStore } from '../../../store/sceneStore.js'
import { drawMatcapPattern } from './matcapTexture.js'
import './MatcapLegendPreview.css'

const PREVIEW_SIZE = 64

// The legend's "The photo" row names a picture; this draws the actual, live
// one MatCap is reading from, redrawn whenever Highlight angle moves it.
export default function MatcapLegendPreview() {
  const angle = useSceneStore((state) => state.params.shaderMatcapAngle)
  const canvasRef = useRef(null)

  useEffect(() => {
    drawMatcapPattern(canvasRef.current.getContext('2d'), PREVIEW_SIZE, angle)
  }, [angle])

  return <canvas ref={canvasRef} width={PREVIEW_SIZE} height={PREVIEW_SIZE} className="matcap-legend-preview" />
}
