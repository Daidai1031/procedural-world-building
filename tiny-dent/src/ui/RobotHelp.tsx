import { useId, useState } from 'react'

export function RobotHelp({ name, action }: { name: string; action: string }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return <div className="robot-help" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button type="button" className="info-button" aria-label={'How to use ' + name} aria-describedby={open ? id : undefined}
      aria-expanded={open} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
      onClick={() => setOpen(true)} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }}>i</button>
    {open && <div id={id} role="tooltip" className="robot-help-content"><ol className="steps">
      <li><b>1</b>Click the {name} model, then click the planet</li>
      <li><b>2</b>Size its work area</li>
      <li><b>3</b>{action}</li>
    </ol></div>}
  </div>
}
