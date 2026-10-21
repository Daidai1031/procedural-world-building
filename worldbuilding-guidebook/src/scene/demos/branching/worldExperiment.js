// A small rule experiment, not the game's resident system. A robot's work makes
// noise that fades with distance. A resident that has been bothered for long
// enough walks to a quieter pocket if one has room and can be reached; if not,
// it waits where it is. Nothing here is random, so the same start and the same
// work spot always give the same run.
//
// '#' rock, '.' floor, 'a' and 'b' the cells of two quiet pockets.
export const WORLD_MAP = [
  '#############',
  '##aa####bb###',
  '##..####..###',
  '#...........#',
  '#...........#',
  '#...........#',
  '#############',
]

export const RESIDENT_STARTS = [[2, 4], [4, 5], [5, 3]]
export const WORK_SPOTS = { 'Near the residents': [3, 4], Middle: [7, 4], 'Far end': [11, 3] }
export const WORLD_A_SPOT = 'Far end'

export const NOISE_RADIUS = 6
export const NOISE_THRESHOLD = 0.3
export const EXPOSURE_DELAY = 3
export const IMPROVEMENT = 0.15
export const COOLDOWN = 8
export const WALK_SPEED = 1.5
export const LEVEL_RISE = 0.5
export const LEVEL_FALL = 0.25
export const TIME_STEP = 1 / 30
const MAX_FRAME = 0.25

export const cellKey = ([x, y]) => `${x},${y}`
const symbolAt = ([x, y]) => WORLD_MAP[y]?.[x] ?? '#'
export const isWalkable = (cell) => symbolAt(cell) !== '#'
export const isPocket = (cell) => symbolAt(cell) === 'a' || symbolAt(cell) === 'b'
export const pocketName = (cell) => symbolAt(cell).toUpperCase()

export const POCKET_CELLS = WORLD_MAP.flatMap((row, y) => Array.from(row).flatMap((symbol, x) => (symbol === 'a' || symbol === 'b' ? [[x, y]] : [])))

// Each run is built fresh from this immutable description, so two runs never
// share a resident, a log or a number.
export function createWorld({ workSpot, shelter = 'Open', working = true }) {
  return {
    time: 0,
    level: 0,
    working,
    work: WORK_SPOTS[workSpot],
    capacity: shelter === 'Open' ? 1 : 0,
    log: [],
    residents: RESIDENT_STARTS.map((cell, index) => ({
      id: index + 1, cell: [...cell], path: [], progress: 0, target: null,
      exposure: 0, cooldown: 0, noisy: false, blocked: '', reason: 'quiet here',
    })),
  }
}

// Noise at a cell: the work level, falling in a straight line to nothing at
// NOISE_RADIUS. It is a distance proxy, not a sound simulation.
export function noiseAt(world, cell) {
  const distance = Math.hypot(cell[0] - world.work[0], cell[1] - world.work[1])
  return world.level * Math.max(0, 1 - distance / NOISE_RADIUS)
}

// Shortest walk over floor and pocket cells, four directions. Returns the cells
// after the start, or null when there is no way through.
export function findPath(from, to) {
  const goal = cellKey(to)
  const came = new Map([[cellKey(from), null]])
  const queue = [from]
  for (let head = 0; head < queue.length; head += 1) {
    const cell = queue[head]
    if (cellKey(cell) === goal) {
      const path = []
      for (let step = cell; step && cellKey(step) !== cellKey(from); step = came.get(cellKey(step))) path.unshift(step)
      return path
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = [cell[0] + dx, cell[1] + dy]
      if (!isWalkable(next) || came.has(cellKey(next))) continue
      came.set(cellKey(next), cell)
      queue.push(next)
    }
  }
  return null
}

function occupied(world, cell) {
  return world.residents.filter((resident) => cellKey(resident.target ?? resident.cell) === cellKey(cell)).length
}

// The quietest pocket cell that has room, can be reached, is quiet in its own
// right, and is quieter than here by enough to be worth the walk.
export function chooseShelter(world, resident, here) {
  const open = POCKET_CELLS.filter((cell) => occupied(world, cell) < world.capacity)
  if (open.length === 0) return { target: null, reason: 'no pocket has room' }
  const better = open
    .filter((cell) => noiseAt(world, cell) <= NOISE_THRESHOLD && here - noiseAt(world, cell) >= IMPROVEMENT)
    .sort((first, second) => noiseAt(world, first) - noiseAt(world, second))
  if (better.length === 0) return { target: null, reason: 'no pocket is quiet enough' }
  for (const cell of better) {
    const path = findPath(resident.cell, cell)
    if (path) return { target: cell, path, reason: 'set off' }
  }
  return { target: null, reason: 'no route to a quiet pocket' }
}

function note(world, text) {
  world.log.push({ time: Number(world.time.toFixed(2)), text })
}

function walk(world, resident, dt) {
  resident.progress += WALK_SPEED * dt
  while (resident.progress >= 1 && resident.path.length > 0) {
    resident.cell = resident.path.shift()
    resident.progress -= 1
  }
  if (resident.path.length > 0) return
  resident.progress = 0
  resident.cooldown = COOLDOWN
  resident.exposure = 0
  resident.noisy = false
  resident.blocked = ''
  resident.reason = 'settled'
  note(world, `Resident ${resident.id} reaches pocket ${pocketName(resident.cell)}.`)
  resident.target = null
}

function stepResident(world, resident, dt) {
  if (resident.path.length > 0) { walk(world, resident, dt); return }
  const here = noiseAt(world, resident.cell)
  resident.cooldown = Math.max(0, resident.cooldown - dt)
  if (here <= NOISE_THRESHOLD) {
    resident.exposure = Math.max(0, resident.exposure - dt)
    if (resident.noisy) note(world, `Resident ${resident.id} is quiet again.`)
    resident.noisy = false
    resident.blocked = ''
    resident.reason = 'quiet here'
    return
  }
  resident.exposure += dt
  if (!resident.noisy) {
    resident.noisy = true
    note(world, `Resident ${resident.id} starts to be bothered by the noise.`)
  }
  // #region sustained-exposure
  const ready = resident.exposure >= EXPOSURE_DELAY && resident.cooldown <= 0
  // #endregion
  if (!ready) {
    resident.reason = resident.cooldown > 0 ? 'cooling down' : 'waiting it out'
    return
  }
  const choice = chooseShelter(world, resident, here)
  if (choice.target === null) {
    resident.reason = choice.reason
    if (resident.blocked !== choice.reason) {
      resident.blocked = choice.reason
      note(world, `Resident ${resident.id} stays: ${choice.reason}.`)
    }
    return
  }
  resident.target = choice.target
  resident.path = choice.path
  resident.progress = 0
  resident.reason = 'walking to a quieter pocket'
  note(world, `Resident ${resident.id} sets off for pocket ${pocketName(choice.target)}: noise there ${noiseAt(world, choice.target).toFixed(2)}, here ${here.toFixed(2)}.`)
}

export function stepWorld(world, dt) {
  const goal = world.working ? 1 : 0
  const rate = world.working ? LEVEL_RISE : LEVEL_FALL
  world.level = world.level < goal ? Math.min(goal, world.level + rate * dt) : Math.max(goal, world.level - rate * dt)
  world.time += dt
  for (const resident of world.residents) stepResident(world, resident, dt)
}

export function statusOf(world, resident) {
  if (resident.path.length > 0) return 'walking'
  if (noiseAt(world, resident.cell) > NOISE_THRESHOLD) return resident.blocked ? 'staying put' : 'bothered'
  return isPocket(resident.cell) ? 'in a pocket' : 'calm'
}

// Where a resident is drawn: between its cell and the next one while walking.
export function residentPosition(resident) {
  const next = resident.path[0]
  if (!next) return resident.cell
  return [resident.cell[0] + (next[0] - resident.cell[0]) * resident.progress, resident.cell[1] + (next[1] - resident.cell[1]) * resident.progress]
}

// Fixed steps, however often frames arrive: a 30 Hz and a 144 Hz screen run
// the same number of steps for the same time.
export function advanceFixed(worlds, clock, delta) {
  clock.accumulator += Math.min(delta, MAX_FRAME)
  let steps = 0
  while (clock.accumulator >= TIME_STEP) {
    for (const world of worlds) stepWorld(world, TIME_STEP)
    clock.accumulator -= TIME_STEP
    steps += 1
  }
  return steps
}

export function snapshot(world) {
  return JSON.stringify({
    level: Number(world.level.toFixed(6)),
    residents: world.residents.map((resident) => [resident.cell, resident.path.length, Number(resident.exposure.toFixed(6)), resident.reason]),
    log: world.log,
  })
}
