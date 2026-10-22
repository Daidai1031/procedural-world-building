// 12×12 pixel glyphs for the toolbar buttons, drawn in currentColor so they follow the button's ink.
const glyphs = {
  // A landing pin standing in a ground ring.
  map: [
    '....####....',
    '...######...',
    '..###..###..',
    '..###..###..',
    '...######...',
    '....####....',
    '.....##.....',
    '.....##.....',
    '..##.##.##..',
    '.#........#.',
    '..########..',
    '............',
  ],
  // A sun, its orbit, and one world on the ring.
  system: [
    '....###.....',
    '..##....###.',
    '.#......###.',
    '.#......###.',
    '#....##.....',
    '#...####...#',
    '#...####...#',
    '#....##....#',
    '.#........#.',
    '.#........#.',
    '..##....##..',
    '....####....',
  ],
  // A rocket lifting off, for the climb back to orbit.
  orbit: [
    '.....##.....',
    '....####....',
    '....#..#....',
    '....#..#....',
    '....####....',
    '....####....',
    '...######...',
    '..##.##.##..',
    '..#..##..#..',
    '.....##.....',
    '....#..#....',
    '............',
  ],
}

export type PixelGlyph = keyof typeof glyphs

const paths = Object.fromEntries(Object.entries(glyphs).map(([name, rows]) => [name,
  rows.flatMap((row, y) => [...row].map((cell, x) => cell === '#' ? `M${x} ${y}h1v1h-1z` : '')).join('')])) as Record<PixelGlyph, string>

/** 24 px keeps every glyph pixel a whole 2×2 block of screen pixels. */
export function PixelIcon({ glyph }: { glyph: PixelGlyph }) {
  return (
    <svg className="pixel-icon" viewBox="0 0 12 12" width={24} height={24} shapeRendering="crispEdges" aria-hidden="true">
      <path d={paths[glyph]} fill="currentColor" />
    </svg>
  )
}
