export type PlayMode = 'auto' | 'manual'

const options: { mode: PlayMode; title: string }[] = [
  { mode: 'auto', title: 'Auto' },
  { mode: 'manual', title: 'Manual' },
]

// Auto (robots follow rules, with optional Autopilot) and Manual (the player edits terrain) are the two main modes.
export function ModeSwitch({ mode, onChange }: { mode: PlayMode; onChange: (mode: PlayMode) => void }) {
  return (
    <div className="mode-switch" role="radiogroup" aria-label="Play mode" data-mode={mode}>
      <span className="mode-thumb" aria-hidden="true" />
      {options.map((option) => (
        <button key={option.mode} type="button" role="radio" aria-checked={mode === option.mode}
          onClick={(event) => { onChange(option.mode); event.currentTarget.blur() }}>
          <strong>{option.title}</strong>
        </button>
      ))}
    </div>
  )
}
