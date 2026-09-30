let overrides = Object.create(null)

export function setFunctionOverrides(table) {
  overrides = table
}

export function resolveFunction(name, original) {
  return overrides[name] ?? original
}

export function withFunctionOverrides(table, callback) {
  const previous = overrides
  overrides = table
  try { return callback() }
  finally { overrides = previous }
}
