import MatcapLegendPreview from './demos/shaders/MatcapLegendPreview.jsx'

// A legend item's `preview` names a key here instead of a static swatch, for
// the rare item that needs to show something live (redrawn as a control
// changes) rather than a fixed colour. Legend words still live in content;
// this only supplies the one picture content cannot draw itself.
export const legendPreviewRegistry = {
  'matcap-photo': MatcapLegendPreview,
}

export function getLegendPreview(previewKey) {
  return previewKey ? (legendPreviewRegistry[previewKey] ?? null) : null
}
