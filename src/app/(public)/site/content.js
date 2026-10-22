/**
 * Storefront content: the public Journal and curated testimonials.
 * Journal: site.php (published posts, and only while journal_enabled is on).
 * Testimonials: store.php (published rows). There is no static fallback: empty
 * or unreachable means an empty list, and the page hides the section (A07).
 */
import { useEffect, useState } from 'react';
import heritApi from '@/helpers/heritApi';

const dateText = (iso) => {
  if (!iso) return '';
  const d = new Date(String(iso).replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
};

/** site.php journal post -> the shape the journal pages use. */
const toPost = (p) => ({
  slug: p.slug, title: p.title, excerpt: p.excerpt || '', body: p.body,
  cat: p.category || '', author: p.author || '', date: dateText(p.published_at), print: p.print || '',
  iso: p.published_at ? String(p.published_at).slice(0, 10) : '', to: `/journal/${p.slug}`,
});

let POSTS_CACHE = null;
let TESTI_CACHE = null;

/** React hook: published posts ({posts, ready, enabled}); empty while the journal is off. */
export function useJournal(limit = 24) {
  const [state, setState] = useState(POSTS_CACHE ? { ...POSTS_CACHE, ready: true } : { posts: [], enabled: false, ready: false });
  useEffect(() => {
    let live = true;
    heritApi.site.journal()
      .then((r) => {
        const next = { posts: (Array.isArray(r?.items) ? r.items : []).map(toPost), enabled: r?.enabled === true };
        POSTS_CACHE = next;
        if (live) setState({ ...next, ready: true });
      })
      .catch(() => { if (live) setState({ posts: [], enabled: false, ready: true }); });
    return () => { live = false; };
  }, []);
  return { ...state, posts: state.posts.slice(0, limit) };
}

/** React hook: published posts only (the list), for sections that just need posts. */
export function useBlog(limit = 24) {
  return useJournal(limit).posts;
}

/** React hook: a single published post by slug; null when missing or the journal is off. */
export function useBlogPost(slug) {
  const [state, setState] = useState({ post: null, ready: false });
  useEffect(() => {
    let live = true;
    setState({ post: null, ready: false });
    heritApi.site.journalPost(slug)
      .then((r) => { if (live) setState({ post: r?.post ? toPost(r.post) : null, ready: true }); })
      .catch(() => { if (live) setState({ post: null, ready: true }); });
    return () => { live = false; };
  }, [slug]);
  return state;
}

/** React hook: live published testimonials; empty means the section is hidden. */
export function useTestimonials() {
  const [items, setItems] = useState(TESTI_CACHE || []);
  useEffect(() => {
    let live = true;
    heritApi.store.testimonials()
      .then((r) => {
        const list = Array.isArray(r?.testimonials) ? r.testimonials : [];
        const next = list;
        TESTI_CACHE = next;
        if (live) setItems(next);
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return items;
}
