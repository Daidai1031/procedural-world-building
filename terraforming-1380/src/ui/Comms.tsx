import { useEffect, useMemo, useRef, useState } from 'react'
import type { AutoRobot, createRunStore } from '../state/runState'
import { commsMessages, type CommsMessage } from '../systems/comms'
import { sellMinerals } from '../systems/economy'

// A handheld communicator: robot and account problems arrive here with one button to the screen that fixes them.
export function Comms({ useRunStore, onOpenRobot }: {
  useRunStore: ReturnType<typeof createRunStore>
  onOpenRobot: (robot: AutoRobot) => void
}) {
  // The selector returns a string so the component only re-renders when the set of messages changes, not on every tick.
  const signature = useRunStore(state => commsMessages(state).map(m => `${m.id}|${m.text}|${m.action?.label ?? ''}`).join(';'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const messages = useMemo(() => commsMessages(useRunStore.getState()), [signature, useRunStore])
  const [dismissed, setDismissed] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const known = useRef(new Set<string>())
  const active = useMemo(() => messages.filter(m => !dismissed.includes(m.id)), [messages, dismissed])

  useEffect(() => {
    const ids = new Set(messages.map(m => m.id))
    // A resolved message may come back later, so forget it once its cause is gone.
    setDismissed(current => current.some(id => !ids.has(id)) ? current.filter(id => ids.has(id)) : current)
    // A message not seen before pops the communicator open.
    const fresh = messages.some(m => !known.current.has(m.id))
    known.current = ids
    if (fresh) setOpen(true)
  }, [messages])

  const run = (message: CommsMessage) => {
    const action = message.action
    if (!action) return
    if (action.kind === 'sell') sellMinerals(useRunStore)
    else {
      onOpenRobot(action.robot)
      setDismissed(current => [...current, message.id])
    }
    setOpen(false)
  }
  const urgent = active.some(m => m.level === 'alert')

  return <aside className="comms" data-open={open} data-urgent={urgent} aria-label="Communicator">
    {open && <div className="comms-screen" role="log" aria-live="polite">
      {active.length === 0 && <p className="comms-empty">No new messages.</p>}
      {active.map(message => <article className="comms-message" data-level={message.level} key={message.id}>
        <div className="comms-head"><span>{message.from}</span>
          <button className="comms-dismiss" onClick={() => setDismissed(current => [...current, message.id])}
            aria-label={'Dismiss message from ' + message.from}>×</button></div>
        <p>{message.text}</p>
        {message.action && <button className="comms-action" onClick={() => run(message)}>{message.action.label} →</button>}
      </article>)}
    </div>}
    <button className="comms-device" data-has={active.length > 0} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <i className="comms-lamp" aria-hidden="true" />
      <span>Comms</span>
      <strong>{active.length ? active.length + (active.length === 1 ? ' message' : ' messages') : 'Quiet'}</strong>
    </button>
  </aside>
}
