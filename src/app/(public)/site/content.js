/**
 * Storefront content — the public Blog (Journal) and curated Testimonials.
 * Live source: store.php (published rows). These static sets are the guaranteed
 * FALLBACK, used until the API resolves or if it's unreachable / empty, so the
 * site is never bare before the content tables are deployed and filled.
 */
import { useEffect, useState } from 'react';
import heritApi from '@/helpers/heritApi';

export const FALLBACK_POSTS = [
  {
    slug: 'reading-adire-the-language-of-indigo',
    cat: 'Heritage', category: 'Heritage', date: 'June 2026', tile: 'hc-tile-adire',
    title: 'Reading Adire: the language of indigo',
    excerpt: 'Every resist pattern in hand-dyed Adire carries meaning. Here’s how to read the cloth before you wear it.',
    body: '<p>Adire is not just a fabric — it is a record. Each pattern is made by resisting the indigo dye, with starch, stitching or tied raffia, so the cloth keeps a memory of the hands that made it.</p><p>Before you wear a piece, look closely: the depth of the indigo tells you how many times it was dipped, and the motifs often carry proverbs and blessings. No two lengths are ever identical, which is exactly the point.</p><p>At Herit, we name the fabric and where it comes from, so what you wear carries its story forward.</p>',
  },
  {
    slug: 'why-we-cut-for-now',
    cat: 'Craft', category: 'Craft', date: 'May 2026', tile: 'hc-tile-asooke',
    title: 'Why we cut for now, not for one occasion',
    excerpt: 'Heritage fabric belongs in everyday life. A look at how we tailor traditional cloth for modern wardrobes.',
    body: '<p>Too often, heritage fabric is saved for one big day a year. We think that’s a waste of something beautiful.</p><p>So we cut for now — contemporary silhouettes, honest tailoring, finishing you can feel — using the same cloth our grandparents wore. The result is a piece you reach for on a Tuesday, not just an owambe.</p><p>Heritage, tailored for now.</p>',
  },
  {
    slug: 'from-ajuwon-market-to-your-doorstep',
    cat: 'Behind the seams', category: 'Behind the seams', date: 'April 2026', tile: 'hc-tile-ankara',
    title: 'From Ajuwon Market to your doorstep',
    excerpt: 'How a piece travels from the fabric stall to a tracked parcel anywhere in the world.',
    body: '<p>It starts at the fabric stalls of Ajuwon Market, where we choose cloth by hand. From there it’s cut, lined and finished in our workroom, then packed in branded wrap with the story of its fabric tucked inside.</p><p>Every parcel is tracked — across Lagos, throughout Nigeria, and worldwide — so a brand from Lagos can dress you wherever you are, without losing its roots.</p>',
  },
];

export const FALLBACK_TESTIMONIALS = [
  { name: 'Funmi A.', role: 'Lagos, Nigeria', location: 'Lagos, Nigeria', tile: 'hc-tile-ankara', rating: 5, text: 'The Adire dress arrived better than the photos — the indigo is so deep. I’ve had three people stop me to ask where it’s from.' },
  { name: 'David O.', role: 'London, UK', location: 'London, UK', tile: 'hc-tile-asooke', rating: 5, text: 'Shipping to the UK was tracked the whole way and the packaging was beautiful. It finally feels like wearing home, properly tailored.' },
  { name: 'Ngozi M.', role: 'Toronto, Canada', location: 'Toronto, Canada', tile: 'hc-tile-adire', rating: 5, text: 'Ordered matching aso-ebi for six of us. The fit notes made sizing easy and every piece was consistent. Will be back for the next drop.' },
  { name: 'Kemi T.', role: 'Abuja, Nigeria', location: 'Abuja, Nigeria', tile: 'hc-tile-mixed', rating: 5, text: 'I love that they tell you the story of the fabric. It’s not costume — it’s something you actually want to live in.' },
];

const withTo = (p) => ({ ...p, to: `/journal/${p.slug}` });

let POSTS_CACHE = null;
let TESTI_CACHE = null;

/** React hook: live published posts, static set as the initial/fallback value. */
export function useBlog(limit = 24) {
  const [posts, setPosts] = useState(POSTS_CACHE || FALLBACK_POSTS.map(withTo));
  useEffect(() => {
    let live = true;
    heritApi.store.blog(limit)
      .then((r) => {
        const list = Array.isArray(r?.posts) ? r.posts : [];
        const next = list.length ? list.map(withTo) : FALLBACK_POSTS.map(withTo);
        POSTS_CACHE = next;
        if (live) setPosts(next);
      })
      .catch(() => {});
    return () => { live = false; };
  }, [limit]);
  return posts;
}

/** React hook: a single post by slug, with the static set as fallback. */
export function useBlogPost(slug) {
  const fromFallback = () => FALLBACK_POSTS.find((p) => p.slug === slug) || null;
  const [state, setState] = useState({ post: fromFallback(), ready: false });
  useEffect(() => {
    let live = true;
    heritApi.store.blogPost(slug)
      .then((r) => { if (live) setState({ post: r?.post || fromFallback(), ready: true }); })
      .catch(() => { if (live) setState({ post: fromFallback(), ready: true }); });
    return () => { live = false; };
  }, [slug]);
  return state;
}

/** React hook: live published testimonials, static set as the initial/fallback. */
export function useTestimonials() {
  const [items, setItems] = useState(TESTI_CACHE || FALLBACK_TESTIMONIALS);
  useEffect(() => {
    let live = true;
    heritApi.store.testimonials()
      .then((r) => {
        const list = Array.isArray(r?.testimonials) ? r.testimonials : [];
        const next = list.length ? list : FALLBACK_TESTIMONIALS;
        TESTI_CACHE = next;
        if (live) setItems(next);
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return items;
}
