// DBG-01, GEN-07: preserve explicit seeds, including an empty seed.
export function readStartup(search: string) {
  const params = new URLSearchParams(search)
  return {
    seed: params.get('seed') ?? crypto.randomUUID(),
    debug: params.get('debug') === '1',
  }
}
