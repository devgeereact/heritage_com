/**
 * Storefront content: the public Blog (Journal) and curated Testimonials.
 * Live source: store.php (published rows). There is no static fallback: empty
 * or unreachable means an empty list, and the page hides the section (A07).
 */
import { useEffect, useState } from 'react';
import heritApi from '@/helpers/heritApi';

const withTo = (p) => ({ ...p, to: `/journal/${p.slug}` });

let POSTS_CACHE = null;
let TESTI_CACHE = null;

/** React hook: live published posts; empty until (and unless) the API returns some. */
export function useBlog(limit = 24) {
  const [posts, setPosts] = useState(POSTS_CACHE || []);
  useEffect(() => {
    let live = true;
    heritApi.store.blog(limit)
      .then((r) => {
        const list = Array.isArray(r?.posts) ? r.posts : [];
        const next = list.map(withTo);
        POSTS_CACHE = next;
        if (live) setPosts(next);
      })
      .catch(() => {});
    return () => { live = false; };
  }, [limit]);
  return posts;
}

/** React hook: a single published post by slug; null when missing. */
export function useBlogPost(slug) {
  const [state, setState] = useState({ post: null, ready: false });
  useEffect(() => {
    let live = true;
    heritApi.store.blogPost(slug)
      .then((r) => { if (live) setState({ post: r?.post || null, ready: true }); })
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
