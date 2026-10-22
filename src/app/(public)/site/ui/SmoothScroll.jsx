import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ReactLenis } from 'lenis/react'
import 'lenis/dist/lenis.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const reducedQuery = '(prefers-reduced-motion: reduce)'

/**
 * Smooth wheel scrolling for the public site (D-027). GSAP's ticker drives
 * Lenis, so there is one animation loop and ScrollTrigger stays in step with
 * the smoothed position. Touch scrolling stays native. Under reduced motion
 * nothing is mounted and the page scrolls natively. Hash links keep their
 * native jump (`anchors` off) so the skip link still moves focus.
 *
 * On each new path the scroll goes back to the top at once, so the reveal hook
 * measures from the top as before.
 */
const SmoothScroll = () => {
  const lenisRef = useRef(null)
  const { pathname } = useLocation()
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(reducedQuery).matches)

  useEffect(() => {
    const mq = window.matchMedia?.(reducedQuery)
    if (!mq) return undefined
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reduced) return undefined
    const update = (time) => lenisRef.current?.lenis?.raf(time * 1000)
    const sync = () => ScrollTrigger.update()
    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)
    // ReactLenis is a child, so its instance exists before this effect runs.
    const unsubscribe = lenisRef.current?.lenis?.on('scroll', sync)
    return () => {
      gsap.ticker.remove(update)
      gsap.ticker.lagSmoothing(500, 33)
      unsubscribe?.()
    }
  }, [reduced])

  useEffect(() => {
    lenisRef.current?.lenis?.scrollTo(0, { immediate: true, force: true })
  }, [pathname])

  if (reduced) return null
  return <ReactLenis root ref={lenisRef} options={{ autoRaf: false, lerp: 0.1, smoothWheel: true, syncTouch: false }} />
}

export default SmoothScroll
