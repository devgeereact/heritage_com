import { useEffect, useRef } from 'react';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Staggered fade-up for content as it first scrolls into view, once.
 *
 * Mark elements with `data-reveal`. Only elements that start below the fold
 * are hidden (`data-reveal="pending"`), so nothing on screen at load ever
 * flashes, and with no JavaScript, no IntersectionObserver or reduced motion
 * nothing is hidden at all. Revealed items get `data-reveal="in"`; up to four
 * entering together are staggered 60ms apart through `--hc-reveal-delay`.
 * A 3s safety net reveals anything already passed that the observer missed.
 *
 * Returns a ref for the container to scan (defaults to the whole document).
 * Pass `deps` (for example the pathname) to rescan after navigation.
 */
export default function useReveal(deps = []) {
  const ref = useRef(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || reducedMotion()) return undefined;
    const root = ref.current || document;
    const fold = window.innerHeight * 0.92;
    const pending = Array.from(root.querySelectorAll('[data-reveal]'))
      .filter((el) => !el.getAttribute('data-reveal') && el.getBoundingClientRect().top > fold);
    if (!pending.length) return undefined;

    const show = (el, i = 0) => {
      el.style.setProperty('--hc-reveal-delay', `${Math.min(i, 3) * 60}ms`);
      el.setAttribute('data-reveal', 'in');
    };
    pending.forEach((el) => el.setAttribute('data-reveal', 'pending'));

    const io = new IntersectionObserver((entries) => {
      entries
        .filter((e) => e.isIntersecting)
        .forEach((e, i) => { show(e.target, i); io.unobserve(e.target); });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    pending.forEach((el) => io.observe(el));

    const safety = window.setTimeout(() => {
      pending.forEach((el) => {
        if (el.getAttribute('data-reveal') === 'pending' && el.getBoundingClientRect().top < window.innerHeight) show(el);
      });
    }, 3000);

    return () => {
      io.disconnect();
      window.clearTimeout(safety);
      pending.forEach((el) => { if (el.getAttribute('data-reveal') === 'pending') el.setAttribute('data-reveal', ''); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
