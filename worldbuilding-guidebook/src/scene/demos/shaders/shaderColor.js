import { Color } from 'three'
import { readToken } from '../../../styles/readToken.js'

// A raw ShaderMaterial's gl_FragColor goes straight to the screen — none of
// three.js's built-in materials automatically re-encode it the way their own
// fragment shaders do at the end (`#include <colorspace_fragment>`). But
// `new Color(hex)` still converts an sRGB hex string to *linear* values on
// the way in, since that conversion is a property of Color itself, not of
// any particular material. Handing that linear value straight to a uniform
// used as a direct colour makes every tone noticeably darker than its CSS
// value — worst on tones that were already dark. This converts back to sRGB
// so a value read here matches what the token actually looks like.
export function shaderColor(token) {
  return new Color(readToken(token)).convertLinearToSRGB()
}

// Same fix, for a hex string that did not come from a design token — a value
// picked freely from a colour input, for instance.
export function shaderColorFromHex(hex) {
  return new Color(hex).convertLinearToSRGB()
}

// Same fix for colours already built elsewhere (e.g. elevationColors()),
// which are correctly left in linear space for their other use — colouring
// a MeshStandardMaterial's vertices — and must not be changed at the source.
export function toShaderColors(colors) {
  return colors.map((color) => color.clone().convertLinearToSRGB())
}
