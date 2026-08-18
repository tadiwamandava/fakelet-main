import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface TipState {
  text: string
  x: number
  y: number
  placement: 'top' | 'bottom'
}

/**
 * A single global tooltip layer. It watches for hover/focus on any element that
 * carries a `title` attribute, suppresses the slow native tooltip, and shows a
 * styled bubble immediately. Rendered in a portal so it is never clipped by a
 * card's `overflow-hidden`, and it works for keyboard users too.
 */
export default function Tooltips() {
  const [tip, setTip] = useState<TipState | null>(null)
  const currentEl = useRef<HTMLElement | null>(null)
  const savedTitle = useRef<string>('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function show(el: HTMLElement) {
      const text = el.getAttribute('title')
      if (!text) return
      currentEl.current = el
      savedTitle.current = text
      el.setAttribute('title', '') // suppress the browser's native tooltip
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        const rect = el.getBoundingClientRect()
        const placement: 'top' | 'bottom' = rect.top < 48 ? 'bottom' : 'top'
        setTip({
          text,
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(placement === 'top' ? rect.top - 8 : rect.bottom + 8),
          placement,
        })
      }, 120)
    }

    function hide() {
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
      }
      if (currentEl.current) currentEl.current.setAttribute('title', savedTitle.current)
      currentEl.current = null
      setTip(null)
    }

    function targetFrom(e: Event): HTMLElement | null {
      const node = e.target as HTMLElement | null
      return node?.closest?.('[title]') as HTMLElement | null
    }

    function onOver(e: PointerEvent) {
      const el = targetFrom(e)
      if (!el) {
        if (currentEl.current) hide()
        return
      }
      if (el !== currentEl.current) {
        if (currentEl.current) hide()
        show(el)
      }
    }

    function onFocusIn(e: FocusEvent) {
      const el = targetFrom(e)
      if (el && el !== currentEl.current) {
        if (currentEl.current) hide()
        show(el)
      }
    }

    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointerdown', hide)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', hide)
    window.addEventListener('scroll', hide, true)

    return () => {
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerdown', hide)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', hide)
      window.removeEventListener('scroll', hide, true)
      if (currentEl.current) currentEl.current.setAttribute('title', savedTitle.current)
    }
  }, [])

  if (!tip) return null

  return createPortal(
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        left: tip.x,
        top: tip.y,
        transform: tip.placement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
        zIndex: 9999,
      }}
      className="pointer-events-none rounded-md bg-ink text-white text-[11px] font-medium leading-none px-2 py-1.5 shadow-lg whitespace-nowrap max-w-[16rem] truncate"
    >
      {tip.text}
    </div>,
    document.body
  )
}
