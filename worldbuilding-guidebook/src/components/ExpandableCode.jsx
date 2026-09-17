import { useEffect, useRef } from 'react'
import './CodeBlock.css'

export default function ExpandableCode({ children, className = '', ...props }) {
  const anchor = useRef(null)
  const panel = useRef(null)

  function collapse() {
    const element = panel.current
    if (!element?.hasAttribute('popover')) return
    element.hidePopover()
    element.removeAttribute('popover')
    element.removeAttribute('style')
    anchor.current.style.height = ''
  }

  function expand() {
    const element = panel.current
    if (element.hasAttribute('popover')) return
    const scroller = element.querySelector('.code-block__scroll, .cm-scroller')
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return
    const rect = element.getBoundingClientRect()
    const gutter = 12
    const width = Math.min(scroller.scrollWidth + rect.width - scroller.clientWidth + 2, document.documentElement.clientWidth - gutter * 2)
    if (width <= rect.width) return
    anchor.current.style.height = `${rect.height}px`
    Object.assign(element.style, {
      width: `${width}px`,
      left: `${Math.max(gutter, Math.min(rect.left, document.documentElement.clientWidth - width - gutter))}px`,
      top: `${Math.max(gutter, rect.top)}px`,
      maxHeight: `${window.innerHeight - Math.max(gutter, rect.top) - gutter}px`,
    })
    // The top layer escapes the lesson card's scrolling clip without moving the editor DOM.
    element.setAttribute('popover', 'manual')
    element.showPopover()
    scroller.scrollLeft = 0
  }

  useEffect(() => {
    const onScroll = (event) => {
      if (!panel.current?.contains(event.target)) collapse()
    }
    window.addEventListener('resize', collapse)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', collapse)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [])

  return <div className="code-block-anchor" ref={anchor}>
    <section {...props} ref={panel} className={`code-block ${className}`}
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') expand() }}
      onPointerLeave={collapse}
      onFocus={expand}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) collapse() }}
      onKeyDown={(event) => { if (event.key === 'Escape') collapse() }}>
      {children}
    </section>
  </div>
}
