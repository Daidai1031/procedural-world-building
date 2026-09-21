export const DIAGRAM_COLUMNS = 9
export const DIAGRAM_ROWS = 7
export const DIAGRAM_DEPTH = 3

// A height field keeps one number per column: how many cells of ground stand
// on the floor. Everything above that height is air.
const COLUMN_HEIGHTS = [3, 3, 4, 5, 5, 4, 3, 3, 1]

// The same landscape as a voxel volume, top row first. Each cell is solid or
// empty on its own: a chamber, a ledge with a hollow under it, and two cells
// floating in the air, none of which a column height can describe.
const VOLUME_ROWS = [
  '.........',
  'XX.......',
  '...XX....',
  '..XXXX...',
  'XXX..XXX.',
  'XXX..X...',
  'XXXXXXXXX',
]

export function columnHeight(column) {
  return COLUMN_HEIGHTS[column]
}

function isVolumeSolid(column, row) {
  return VOLUME_ROWS[DIAGRAM_ROWS - 1 - row][column] === 'X'
}

// Every cell of the slice, with what each of the two views says about it.
// isCavity marks an empty cell that has solid somewhere above it in the same
// column, which is exactly the case a height field cannot express.
export function buildDiagramCells() {
  const cells = []

  for (let depth = 0; depth < DIAGRAM_DEPTH; depth += 1) {
    for (let column = 0; column < DIAGRAM_COLUMNS; column += 1) {
      let highestSolidRow = -1
      for (let row = 0; row < DIAGRAM_ROWS; row += 1) {
        if (isVolumeSolid(column, row)) highestSolidRow = row
      }

      for (let row = 0; row < DIAGRAM_ROWS; row += 1) {
        const inVolume = isVolumeSolid(column, row)
        cells.push({
          key: `${column}-${row}-${depth}`,
          column,
          row,
          depth,
          inHeightField: row < COLUMN_HEIGHTS[column],
          inVolume,
          isCavity: !inVolume && row < highestSolidRow,
        })
      }
    }
  }

  return cells
}
