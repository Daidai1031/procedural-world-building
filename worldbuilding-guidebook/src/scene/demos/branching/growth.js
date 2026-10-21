export const GROWTH_MODES = ['Together', 'From the base']

const clamp01 = (value) => Math.max(0, Math.min(1, value))

// When each segment starts and finishes on a shared 0 to 1 timeline.
// Together: every segment grows for the whole timeline. From the base: a
// segment starts when the segment it hangs from has finished, so siblings start
// together and the last ones finish at time 1.
export function growthSchedule(segments, mode) {
  const startAt = []
  const finishAt = []
  if (mode === 'Together') {
    for (const segment of segments) { startAt[segment.id] = 0; finishAt[segment.id] = 1 }
    return { startAt, finishAt }
  }
  const chain = []
  for (const segment of segments) chain[segment.id] = segment.parentId === null ? 0 : chain[segment.parentId] + 1
  const duration = 1 / (Math.max(...chain) + 1)
  for (const segment of segments) {
    // #region start-after-parent
    startAt[segment.id] = segment.parentId === null ? 0 : finishAt[segment.parentId]
    // #endregion
    finishAt[segment.id] = startAt[segment.id] + duration
  }
  return { startAt, finishAt }
}

// The pieces on screen at a moment in time. Every piece starts at the end its
// parent is showing, so nothing floats loose, and at time 1 the result is the
// full structure. Nothing here is random, so scrubbing back and forth always
// shows the same picture for the same time.
export function growthProgress(segments, mode, time) {
  const { startAt, finishAt } = growthSchedule(segments, mode)
  const shownEnd = []
  return segments.map((segment) => {
    const progress = clamp01((time - startAt[segment.id]) / (finishAt[segment.id] - startAt[segment.id]))
    const from = segment.parentId === null ? segment.from : shownEnd[segment.parentId]
    const to = from.map((component, axis) => component + (segment.to[axis] - segment.from[axis]) * progress)
    shownEnd[segment.id] = to
    return { ...segment, from, to, progress }
  })
}
