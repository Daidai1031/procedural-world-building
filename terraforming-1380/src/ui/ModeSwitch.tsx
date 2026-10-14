export type PlayMode = 'auto' | 'manual'

const options: { mode: PlayMode; title: string; hint: string }[] = [
  { mode: 'auto', title: 'Auto', hint: 'the crew digs for you' },
  { mode: 'manual', title: 'Manual', hint: 'you do the digging' },
]

// Auto (robots follow rules) and Manual (the player edits terrain) are separate modes with separate panels.
export function ModeSwitch({ mode, onChange }: { mode: PlayMode; onChange: (mode: PlayMode) => void }) {
  return (
    <div className="mode-switch" role="radiogroup" aria-label="Play mode" data-mode={mode}>
      <span className="mode-thumb" aria-hidden="true" />
      {options.map((option) => (
        <button key={option.mode} type="button" role="radio" aria-checked={mode === option.mode}
          onClick={(event) => { onChange(option.mode); event.currentTarget.blur() }}>
          <strong>{option.title}</strong><small>{option.hint}</small>
        </button>
      ))}
    </div>
  )
}
