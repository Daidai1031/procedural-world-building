import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource-variable/ibm-plex-sans'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Mesh } from 'three'
import '../../src/styles/tokens.css'
import '../../src/index.css'
import '../../src/app/layout.css'
import Practice from '../../src/practice/Practice.jsx'
import EditableCode from '../../src/practice/EditableCode.jsx'
import SceneHost from '../../src/scene/SceneHost.jsx'
import InsetCard from '../../src/components/InsetCard.jsx'
import ControlStrip from '../../src/components/ControlStrip.jsx'
import { useSceneStore } from '../../src/store/sceneStore.js'
import { useProgressStore } from '../../src/store/progressStore.js'
import { runSandbox } from '../../src/practice/sandbox.js'
import { evaluateOverride } from '../../src/practice/overrides.js'
import { useSimulationState } from '../../src/scene/demos/proceduralMaps/simulationState.js'
import snippet from './phase4a-snippet.json'

window.phase4a = { scene: useSceneStore, progress: useProgressStore, runSandbox, evaluateOverride, simulation: useSimulationState }
Mesh.prototype.onBeforeRender = function (_renderer, _scene, _camera, geometry, material) {
  if (!material.vertexColors) return
  const positions = geometry.attributes.position
  window.phase4a.heights = Array.from({ length: positions.count }, (_, i) => positions.getY(i))
}
const state = useSceneStore.getState()
state.setStep('fixture/edit')
state.setDemoKey('noise-terrain')
state.setInsetKey('noise-map')
state.setUnlocked(['mapFrequency', 'mapShaping', 'mapResolution'])
const reference = { file: snippet.file, fn: 'shapeValue' }
const tasks = {
  match: { kind: 'match', prompt: 'Match the frequency.', target: { frequency: 0.5 }, compare: ['frequency'], tolerance: 0.001 },
  fill: { kind: 'fill', from: reference, blanks: [{ line: 2, answer: '1 - Math.abs(value * 2 - 1)', options: ['value', '1 - Math.abs(value * 2 - 1)'], hint: 'Fold the value around the midpoint.' }, { line: 7, answer: 'value', hint: 'Keep the original value.' }] },
  implement: { kind: 'implement', signature: 'shapeValue(value, shaping)', brief: 'Implement shaping.', starter: 'function shapeValue(value, shaping) { return value }', reference, cases: [{ args: [0.3, 'ridged'] }, { args: [0.8, 'normal'] }], tolerance: 0.000001, visual: true, visualSettings: { shaping: 'ridged' } },
}
export default function Fixture() {
  return <div className="app"><SceneHost /><InsetCard /><ControlStrip />
    <main style={{ position: 'fixed', top: 20, left: 20, bottom: 150, width: 660, overflow: 'auto', zIndex: 30, background: 'var(--paper)' }}>
      <EditableCode stepId="fixture/edit" reference={reference} snippet={snippet} />
      {Object.entries(tasks).map(([kind, task]) => <Practice key={kind} stepId={`fixture/${kind}`} task={task} snippet={snippet} />)}
      <button onClick={() => state.setStep('fixture/next')}>Next fixture step</button>
    </main>
  </div>
}
createRoot(document.getElementById('root')).render(<Fixture />)
