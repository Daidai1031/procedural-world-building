// D-064: writes docs/drifter/the-quiet-drifter.glb, the Drifter with every clip baked to keyframes, for Blender,
// other engines or a quick look in any glTF viewer. Run with `npm run export:drifter`.
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { bakeDrifterClips, createDrifter, drifterPose } from '../src/render/models/drifter'

// GLTFExporter reads blobs through FileReader, which Node does not have.
class NodeFileReader {
  result: ArrayBuffer | string | null = null
  onloadend: (() => void) | null = null
  readAsArrayBuffer(blob: Blob) { blob.arrayBuffer().then((buffer) => { this.result = buffer; this.onloadend?.() }) }
  readAsDataURL(blob: Blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`
      this.onloadend?.()
    })
  }
}
;(globalThis as unknown as { FileReader: unknown }).FileReader ??= NodeFileReader

const drifter = createDrifter()
// Export in the neutral standing pose, so a viewer that ignores animation still shows the turnaround stance.
const neutral = drifterPose('idle', 0)
neutral.joints.neck = [0, 0, 0]
neutral.gaze = [0, 0]
drifter.apply(neutral)
drifter.object.updateMatrixWorld(true)
const clips = bakeDrifterClips(drifter)
const glb = await new GLTFExporter().parseAsync(drifter.object, { binary: true, animations: clips }) as ArrayBuffer
const out = fileURLToPath(new URL('../docs/drifter/the-quiet-drifter.glb', import.meta.url))
await mkdir(fileURLToPath(new URL('../docs/drifter/', import.meta.url)), { recursive: true })
await writeFile(out, Buffer.from(glb))
console.log(`wrote ${out} (${(glb.byteLength / 1024).toFixed(0)} KB, ${clips.length} clips: ${clips.map((clip) => clip.name).join(', ')})`)
drifter.dispose()
