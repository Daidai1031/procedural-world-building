import { CanvasTexture, SRGBColorSpace } from 'three'
import { readToken } from '../../../styles/readToken.js'

// The lesson's own fixed palette (Step 06's demo and legend preview always
// draw this "photo", regardless of any colours picked elsewhere). The
// composite lab passes its own three free colours instead — see
// CompositeLabDemo.jsx — so MatCap there does not overwrite whatever palette
// the other layers are using.
function defaultMatcapColors() {
  return [readToken('--paper'), readToken('--moss'), readToken('--ink-dim')]
}

// A small canvas standing in for a photographed sphere ornament, so MatCap
// needs no external image asset. Highlight angle moves where the bright spot
// sits on this "photo," not any real light in the scene. Shared by the
// shader's own texture and by MatcapPreview.jsx, so both draw the same photo.
export function drawMatcapPattern(context, size, angleDegrees, colors) {
  const [highlight, mid, shadow] = colors ?? defaultMatcapColors()
  const angle = (angleDegrees * Math.PI) / 180
  const centre = size / 2
  const highlightX = centre + centre * 0.55 * Math.cos(angle)
  const highlightY = centre + centre * 0.55 * Math.sin(angle)
  const gradient = context.createRadialGradient(highlightX, highlightY, size * 0.02, centre, centre, size * 0.75)
  gradient.addColorStop(0, highlight)
  gradient.addColorStop(0.45, mid)
  gradient.addColorStop(1, shadow)
  context.clearRect(0, 0, size, size)
  context.fillStyle = gradient
  context.beginPath()
  context.arc(centre, centre, centre, 0, Math.PI * 2)
  context.fill()
}

const MATCAP_TEXTURE_SIZE = 128

export function createMatcapTexture(angleDegrees, colors) {
  const canvas = document.createElement('canvas')
  canvas.width = MATCAP_TEXTURE_SIZE
  canvas.height = MATCAP_TEXTURE_SIZE
  drawMatcapPattern(canvas.getContext('2d'), MATCAP_TEXTURE_SIZE, angleDegrees, colors)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}
