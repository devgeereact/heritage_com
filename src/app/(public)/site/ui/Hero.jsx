import { useEffect, useState } from 'react';
import Button, { Actions } from './Button';
import HcImage from './HcImage';

const SEEN_KEY = 'hc_hero_seen';

const firstViewThisSession = () => {
  try { return !window.sessionStorage.getItem(SEEN_KEY); } catch { return true; }
};

/**
 * Home hero. Text sits beside the photograph on wide screens and above it on
 * narrow ones, never on top of it, so no scrim is needed.
 *
 * Motion (CSS only, ui.css): the headline rises word by word out of a mask,
 * the eyebrow, lead, actions and note fade up behind it, and the photograph
 * settles from 1.04 to 1 while a light-ash curtain lifts. It runs on the
 * first home view of the session; later views, `animate={false}` and reduced
 * motion are static. The photograph is painted from the first frame.
 *
 * `title` is plain text and stays one readable string for screen readers.
 */
const Hero = ({ eyebrow, title, lead, primary, secondary, note, image, animate = true }) => {
  const [run] = useState(() => animate && typeof window !== 'undefined' && firstViewThisSession());

  useEffect(() => {
    if (!run) return;
    try { window.sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode */ }
  }, [run]);

  const words = String(title || '').split(/\s+/).filter(Boolean);

  return (
    <section className={['hc-hero', run && 'hc-hero--animate', image && 'hc-hero--media'].filter(Boolean).join(' ')}>
      <div className="hc-container hc-hero-grid">
        <div className="hc-hero-copy">
          {eyebrow && <p className="hc-eyebrow hc-hero-eyebrow">{eyebrow}</p>}
          <h1 className="hc-hero-title">
            {words.map((w, i) => (
              <span key={`${w}-${i}`}>
                <span className="hc-hero-word">
                  <span style={{ '--hc-i': Math.min(i, 11) }}>{w}</span>
                </span>
                {i < words.length - 1 ? ' ' : ''}
              </span>
            ))}
          </h1>
          {lead && <p className="hc-hero-lead">{lead}</p>}
          {(primary || secondary) && (
            <Actions className="hc-hero-actions">
              {primary && <Button to={primary.to} href={primary.href} variant="primary">{primary.label}</Button>}
              {secondary && <Button to={secondary.to} href={secondary.href} variant="secondary">{secondary.label}</Button>}
            </Actions>
          )}
          {note && <p className="hc-hero-note">{note}</p>}
        </div>
        {image?.src && (
          <div className="hc-hero-media">
            <HcImage {...image} priority sizes="(min-width: 1024px) 58vw, 100vw" ratio="4 / 5" />
          </div>
        )}
      </div>
    </section>
  );
};

export default Hero;
