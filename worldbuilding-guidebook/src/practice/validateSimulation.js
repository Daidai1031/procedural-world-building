export function validateSimulation(value, previous) {
  if (value?.size !== previous.size || !Number.isInteger(value.iteration) || value.iteration < 0) throw new Error('Return a simulation with the same size and a valid iteration')
  for (const field of ['height', 'water', 'sediment']) {
    if (!value[field] || value[field].length !== previous.size ** 2 || Array.from(value[field]).some((number) => !Number.isFinite(number))) throw new Error(`Return a finite ${field} grid with the original size`)
  }
  return value
}
