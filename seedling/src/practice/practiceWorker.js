import { parse } from 'acorn'

const compile = Function
function unavailable() { throw new Error('Dynamic code generation is unavailable') }
for (const constructor of [Function, (async function () {}).constructor, (function* () {}).constructor, (async function* () {}).constructor]) {
  Object.defineProperty(constructor.prototype, 'constructor', { value: unavailable, configurable: false, writable: false })
}
globalThis.Function = unavailable
Object.defineProperty(globalThis, 'eval', { value: unavailable })
const send = globalThis.postMessage.bind(globalThis)

// Remove capabilities on the global itself, so constructor/globalThis escapes
// cannot recover a network API. The harness retains only its reply channel.
for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'WebTransport', 'EventSource', 'Worker', 'SharedWorker', 'importScripts', 'BroadcastChannel', 'indexedDB', 'caches', 'navigator', 'postMessage', 'setTimeout', 'setInterval']) {
  for (let scope = globalThis; scope; scope = Object.getPrototypeOf(scope)) {
    if (scope === globalThis || Object.hasOwn(scope, name)) Object.defineProperty(scope, name, { value: undefined, configurable: false, writable: false })
  }
}

globalThis.onmessage = async ({ data }) => {
  try {
    const { source, name, inputs, bindings } = data
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) throw new Error('Invalid function name')
    // Dynamic imports are network capabilities too. Reject them before compiling.
    function check(node) {
      if (node.type === 'ImportExpression' || node.type === 'ImportDeclaration') throw new Error('Imports are unavailable in practice')
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) { for (const child of value) if (child?.type) check(child) }
        else if (value?.type) check(value)
      }
    }
    check(parse(source, { ecmaVersion: 'latest', sourceType: 'script' }))
    const keys = Object.keys(bindings)
    if (keys.some((key) => !/^[A-Za-z_$][\w$]*$/.test(key))) throw new Error('Invalid binding')
    const fn = new compile(...keys, '"use strict"\n' + source + '\nreturn ' + name)(...Object.values(bindings))
    const values = []
    for (const args of inputs) values.push(await fn(...args))
    send({ values })
  } catch (error) {
    send({ error: error.message || String(error) })
  }
}
