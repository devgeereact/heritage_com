import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { getMenuItems } from '@/helpers/Manu'
import { canAccessPath, filterMenuByRole } from '@/helpers/roles'
import { useAuthContext } from '@/context/useAuthContext'
import { HOME_SECTIONS } from '@/app/(public)/site/homeMap'

/** Every place the signed-in role can open: menu screens, Website screens and each Home section. */
const usePlaces = (role) =>
  useMemo(() => {
    const flat = (items) => items.flatMap((i) => (i.children ? flat(i.children) : i.isTitle ? [] : [{ label: i.label, to: i.url, icon: i.icon, hint: 'Screen' }]))
    const website = [
      ['Home page studio', '/website/home'],
      ['Hero slides', '/website/slides'],
      ['Pages', '/website/pages'],
      ['Services', '/website/services'],
      ['Our work', '/website/work'],
      ['Questions', '/website/faqs'],
      ['Images', '/website/media'],
      ['Business details', '/website/profile'],
    ].map(([label, to]) => ({ label, to, icon: 'solar:global-linear', hint: 'Website' }))
    const sections = HOME_SECTIONS.map((s) => ({ label: `Home · ${s.label}`, to: `/website/home#${s.key}`, icon: 'solar:widget-4-linear', hint: 'Home section' }))
    return [...flat(filterMenuByRole(getMenuItems(), role)), ...website, ...sections].filter((p) => !role || canAccessPath(role, p.to))
  }, [role])

/**
 * Jump-to search (⌘K or Ctrl+K, D-031): type part of a screen, a Website
 * screen or a Home section and press Enter. It replaces the old topbar search
 * box, which did nothing. Arrow keys move, Escape closes and returns focus.
 */
const CommandPalette = () => {
  const { user } = useAuthContext()
  const navigate = useNavigate()
  const places = usePlaces(user?.role)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const openerRef = useRef(null)
  const boxRef = useRef(null)
  const inputRef = useRef(null)

  const items = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (s ? places.filter((p) => p.label.toLowerCase().includes(s) || p.hint.toLowerCase().includes(s)) : places).slice(0, 12)
  }, [q, places])

  const close = useCallback(() => {
    setOpen(false)
    setQ('')
    setIdx(0)
    openerRef.current?.focus()
  }, [])
  const go = (p) => {
    if (!p) return
    close()
    navigate(p.to)
  }

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && boxRef.current)
      gsap.fromTo(boxRef.current, { y: -12, autoAlpha: 0, scale: 0.98 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.28, ease: 'power3.out' })
  }, [open])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIdx((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(items[idx])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  return (
    <>
      <button ref={openerRef} type="button" className="hd-cmd d-none d-md-flex ms-2" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <IconifyIcon icon="solar:magnifer-linear" aria-hidden="true" />
        <span>Jump to a screen or section</span>
        <kbd>⌘K</kbd>
      </button>
      <button type="button" className="topbar-button d-md-none" onClick={() => setOpen(true)} aria-label="Jump to a screen or section">
        <IconifyIcon icon="solar:magnifer-linear" className="fs-22 align-middle" />
      </button>
      {open && (
        <div className="hd-pal-back" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div ref={boxRef} className="hd-pal" role="dialog" aria-modal="true" aria-label="Jump to a screen or section" data-lenis-prevent="">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setIdx(0)
              }}
              onKeyDown={onKeyDown}
              placeholder="Type a screen, page or Home section"
              aria-label="Search screens and sections"
              aria-controls="hd-pal-list"
              aria-activedescendant={items[idx] ? `hd-pal-${idx}` : undefined}
              role="combobox"
              aria-expanded="true"
              autoComplete="off"
            />
            <ul id="hd-pal-list" role="listbox">
              {items.map((p, i) => (
                <li
                  key={`${p.to}-${p.label}`}
                  id={`hd-pal-${i}`}
                  role="option"
                  aria-selected={i === idx}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => go(p)}>
                  <IconifyIcon icon={p.icon || 'solar:arrow-right-linear'} aria-hidden="true" />
                  <span>{p.label}</span>
                  <small>{p.hint}</small>
                </li>
              ))}
              {!items.length && <li className="hd-pal-none">Nothing matches. Try another word.</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}

export default CommandPalette
