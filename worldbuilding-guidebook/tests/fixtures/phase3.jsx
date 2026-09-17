import React from 'react'
import { createRoot } from 'react-dom/client'
import { Mesh } from 'three'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource-variable/ibm-plex-sans'
import '../../src/styles/tokens.css'
import '../../src/index.css'
import '../../src/app/layout.css'
import CodeBlock from '../../src/components/CodeBlock.jsx'
import SceneHost from '../../src/scene/SceneHost.jsx'
import InsetCard from '../../src/components/InsetCard.jsx'
import ControlStrip from '../../src/components/ControlStrip.jsx'
import { useSceneStore } from '../../src/store/sceneStore.js'
import { useSimulationState } from '../../src/scene/demos/proceduralMaps/simulationState.js'
import snippet from './snippet.json'

window.phase3 = { scene: useSceneStore, simulation: useSimulationState }
Mesh.prototype.onBeforeRender = function (_renderer, _scene, camera, geometry, material) {
  if (!material.vertexColors || !geometry.attributes.position) return
  const positions = geometry.attributes.position
  let checksum = 0
  for (let index = 0; index < positions.count; index += 1) checksum += positions.getY(index)
  window.phase3.frames ??= []
  window.phase3.frames.push({ time: performance.now(), checksum })
  window.phase3.frames = window.phase3.frames.slice(-120)
  window.phase3.camera = camera
}
useSceneStore.getState().setDemoKey('noise-terrain')
useSceneStore.getState().setInsetKey('noise-map')
useSceneStore.getState().setUnlocked(['mapSeed'])
useSceneStore.getState().setCompare({
  label: 'Perlin versus Worley',
  a: { caption: 'Perlin', params: { mapNoiseType: 'perlin' } },
  b: { caption: 'Worley', params: { mapNoiseType: 'worley' } },
})

export default function Verification() {
  return (
    <div className="app">
      <SceneHost />
      <InsetCard />
      <div style={{ position: 'fixed', top: 'var(--space-5)', left: 'var(--space-5)', width: 'var(--card-max-width)', zIndex: 'var(--z-card)' }}>
        <CodeBlock stepId="verification/shape" reference={{ fn: 'shapeValue', highlight: [2] }} snippet={snippet} />
      </div>
      <ControlStrip />
    </div>
  )
}

createRoot(document.getElementById('root')).render(<Verification />)
