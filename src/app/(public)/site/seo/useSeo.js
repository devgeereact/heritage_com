import { useEffect } from 'react';
import { DEFAULT_PAGE_TITLE } from '@/context/constants';

const SUFFIX = ' | Herit Clothing';
export const HOME_TITLE = "Herit Clothing | Men's tailoring in Lagos";

/** Create or update a <meta>/<link> in <head>; remembers the earlier value so it can be restored. */
const upsert = (tag, attr, key, valueAttr, value, restore) => {
  let el = document.head.querySelector(`${tag}[${attr}="${key}"]`);
  if (!el) {
    if (!value) return;
    el = document.createElement(tag);
    el.setAttribute(attr, key);
    el.setAttribute('data-hc-seo', '');
    document.head.appendChild(el);
    const created = el;
    restore.push(() => created.remove());
  } else if (!el.hasAttribute('data-hc-seo')) {
    const before = el.getAttribute(valueAttr);
    const existing = el;
    restore.push(() => {
      if (!existing.isConnected) document.head.appendChild(existing);
      if (before === null) existing.removeAttribute(valueAttr); else existing.setAttribute(valueAttr, before);
    });
  }
  if (value) el.setAttribute(valueAttr, value);
  else el.remove();
};

/**
 * Page metadata without a dependency: title, description, canonical, Open
 * Graph, Twitter card, robots and one JSON-LD block. Restores the defaults on
 * unmount. `title` is the page name ("Services"); Home passes `home: true`.
 * `path` is the route path (no query); the canonical needs `siteUrl`.
 */
export default function useSeo({ title, home, description, path, siteUrl, image, type = 'website', noindex, jsonld } = {}) {
  const ld = jsonld ? JSON.stringify(jsonld) : '';
  useEffect(() => {
    const restore = [];
    const fullTitle = home ? HOME_TITLE : title ? `${title}${SUFFIX}` : 'Herit Clothing';
    document.title = fullTitle;
    const site = String(siteUrl || '').replace(/\/$/, '');
    const canonical = site && path ? `${site}${path}` : '';
    // og:image must be absolute; site.php images are root-relative in production.
    const ogImage = image && image.startsWith('/') ? (site ? `${site}${image}` : '') : image;
    upsert('meta', 'name', 'description', 'content', description, restore);
    upsert('link', 'rel', 'canonical', 'href', canonical, restore);
    upsert('meta', 'property', 'og:title', 'content', fullTitle, restore);
    upsert('meta', 'property', 'og:description', 'content', description, restore);
    upsert('meta', 'property', 'og:url', 'content', canonical, restore);
    upsert('meta', 'property', 'og:type', 'content', type, restore);
    upsert('meta', 'property', 'og:image', 'content', ogImage, restore);
    upsert('meta', 'name', 'twitter:card', 'content', ogImage ? 'summary_large_image' : 'summary', restore);
    upsert('meta', 'name', 'robots', 'content', noindex ? 'noindex' : '', restore);

    let script = null;
    if (ld) {
      document.getElementById('hc-jsonld')?.remove();
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'hc-jsonld';
      script.textContent = ld.replace(/</g, '\\u003c');
      document.head.appendChild(script);
    }
    return () => {
      document.title = DEFAULT_PAGE_TITLE;
      script?.remove();
      restore.reverse().forEach((fn) => fn());
    };
  }, [title, home, description, path, siteUrl, image, type, noindex, ld]);
}
