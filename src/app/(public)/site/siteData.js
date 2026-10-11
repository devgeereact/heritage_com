/**
 * Public website data from site.php (published content only).
 *
 * - useSiteConfig(): business facts, verified socials, navigation flags,
 *   booking switch, JSON-LD and site URL; fetched once per page load.
 * - useSiteResource(load, previewLoad, deps): one public answer with a status
 *   ('loading', 'ready', 'notfound', 'error'). With `?preview=1` and a staff
 *   session it calls previewLoad instead, which reads the draft through
 *   cms.php (the public API never returns drafts).
 * - toImage(media): site.php image -> HcImage props.
 *
 * Nothing here invents content: a failed or empty answer means the section
 * that needs it is not rendered (A07).
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { API_BASE } from '@/context/constants';
import heritApi from '@/helpers/heritApi';

/** Image URLs from site.php are root-relative (/uploads/site/...); in development prefix the API host. */
export const mediaUrl = (u) => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_BASE}${u}`;
};

/** site.php image ({url, srcset, width, height, alt}) -> HcImage props, or null. */
export const toImage = (m, extra = {}) => {
  if (!m?.url) return null;
  const webp = Array.isArray(m.srcset) && m.srcset.length
    ? m.srcset.map((s) => `${mediaUrl(s.url)} ${s.width}w`).join(', ')
    : undefined;
  return { src: mediaUrl(m.url), webp, alt: m.alt || '', width: m.width || undefined, height: m.height || undefined, ...extra };
};

/* ---- Site config (cached per page load) ------------------------------------ */

const EMPTY_CONFIG = {
  business: {}, socials: [], nav: { contact: true }, pages: [], booking_enabled: false,
  site_url: '', jsonld: null, failed: true,
};

let configCache = null;
let configPending = null;

export const loadSiteConfig = () => {
  if (configCache) return Promise.resolve(configCache);
  if (!configPending) {
    configPending = heritApi.site.config()
      .then((c) => { configCache = { ...EMPTY_CONFIG, ...(c || {}), failed: false }; return configCache; })
      .catch(() => { configCache = EMPTY_CONFIG; return configCache; });
  }
  return configPending;
};

/** Site config, or null while it loads. */
export const useSiteConfig = () => {
  const [cfg, setCfg] = useState(configCache);
  useEffect(() => {
    if (configCache) return undefined;
    let live = true;
    loadSiteConfig().then((c) => { if (live) setCfg(c); });
    return () => { live = false; };
  }, []);
  return cfg;
};

/** Navigation flags; every flag is false until the config arrives. */
export const useSiteNav = () => useSiteConfig()?.nav || {};

/* ---- Preview ---------------------------------------------------------------- */

const staffSignedIn = () => typeof document !== 'undefined' && /(?:^|;\s*)_LARKON_AUTH_KEY_=/.test(document.cookie);

/** True on `?preview=1` with a staff session. Without a session the page renders the published copy. */
export const usePreviewMode = () => {
  const { search } = useLocation();
  return new URLSearchParams(search).get('preview') === '1' && staffSignedIn();
};

/**
 * The draft of one CMS item in its public shape (cms.php preview), found by
 * page/policy key or by slug. Resolves null when the item does not exist.
 */
export const previewItem = async (entity, { key, slug }) => {
  let id = null;
  if (key) {
    const r = await heritApi.cms.get(entity, { key }).catch((e) => { if (e.status === 404) return null; throw e; });
    id = r?.item?.id ?? null;
  } else if (slug) {
    const r = await heritApi.cms.list(entity);
    id = (r?.items || []).find((i) => i.slug === slug)?.id ?? null;
  }
  if (!id) return null;
  const p = await heritApi.cms.preview(entity, id);
  return p?.preview || null;
};

/* ---- One public resource ------------------------------------------------------ */

/**
 * Load one public answer. `load` returns a promise of the site.php answer;
 * `previewLoad` (optional) the same shape built from drafts. A 404, or a
 * preview that resolves null, gives status 'notfound'.
 */
export const useSiteResource = (load, previewLoad, deps = []) => {
  const preview = usePreviewMode();
  const [state, setState] = useState({ data: null, status: 'loading' });

  useEffect(() => {
    let live = true;
    setState({ data: null, status: 'loading' });
    const run = preview && previewLoad ? previewLoad : load;
    Promise.resolve()
      .then(run)
      .then((data) => { if (live) setState(data == null ? { data: null, status: 'notfound' } : { data, status: 'ready' }); })
      .catch((e) => { if (live) setState({ data: null, status: e?.status === 404 ? 'notfound' : 'error' }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, ...deps]);

  return { ...state, preview };
};

/** Plain text cut at a word boundary before `max` characters (for meta descriptions). */
export const clip = (text, max = 155) => {
  const s = String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > 60 ? cut.slice(0, at) : cut).replace(/[,.;:\s]+$/, '')}…`;
};
