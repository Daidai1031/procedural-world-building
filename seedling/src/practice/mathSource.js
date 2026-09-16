import noiseSource from '../scene/demos/proceduralMaps/noiseMath.js?raw'
import simulationSource from '../scene/demos/proceduralMaps/simulationMath.js?raw'

function moduleBody(source) {
  return source.replace(/^import [^\n]*\n/gm, '').replace(/\bexport /g, '')
}

const mathSource = `${moduleBody(noiseSource)}\n${moduleBody(simulationSource)}`

export function sourceWithOverrides(overrides) {
  return `const overrides = Object.create(null)
function resolveFunction(name, original) { return overrides[name] ?? original }
${mathSource}
${Object.entries(overrides).map(([name, entry]) => `overrides[${JSON.stringify(name)}] = (() => { ${entry.source}\nreturn ${name} })()`).join('\n')}
function evaluateMap(x, y, settings) { return sampleProceduralMap(x, y, settings) }`
}

export function sourceWithMath(source, name) {
  return `${sourceWithOverrides({ [name]: { source } })}
function evaluate(...args) { return overrides[${JSON.stringify(name)}](...args) }`
}
