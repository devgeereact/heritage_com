/* ============================================================
   Herit Clothing — public-site section blueprints
   Layout patterns borrowed from the Oxybuild construction template
   (hero slider, stat counter, team/testimonial carousels, brand
   strip, working-process step cards, services & lookbook sliders)
   and rebuilt in the amber-heritage brand. All styling lives in
   site.css under the "oxybuild-derived sections" banner.
   ============================================================ */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Autoplay, EffectFade, Navigation, Pagination } from 'swiper/modules';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

/* ---------- section header (eyebrow + title + optional lead) ---------- */
export const SectionHead = ({ kicker, title, lead, center, light, children }) => (
  <div className={`hc-head ${center ? 'hc-head--center' : ''}`} style={light ? { } : undefined}>
    {kicker && <div className="hc-kicker">{kicker}</div>}
    <h2 className="hc-h2" style={light ? { color: '#fff' } : undefined}>{title}</h2>
    {lead && <p className="hc-lead">{lead}</p>}
    {children}
  </div>
);

/* ---------- count-up number, animates once on scroll ---------- */
const useCountUp = (end, duration = 1600) => {
  const ref = useRef(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === 'undefined' ||
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setVal(end);
      return undefined;
    }
    let raf;
    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - p) ** 3; // easeOutCubic
        setVal(Math.round(end * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { io.unobserve(node); run(); } });
    }, { threshold: 0.4 });
    io.observe(node);
    // Safety net: if the observer never fires (already in view on load, an
    // environment that doesn't compute intersection, etc.) animate anyway so
    // the number is never stranded at 0.
    const safety = setTimeout(run, 2500);
    return () => { io.disconnect(); clearTimeout(safety); if (raf) cancelAnimationFrame(raf); };
  }, [end, duration]);
  return [ref, val];
};

const CounterStat = ({ value, suffix = '', prefix = '', label }) => {
  const [ref, val] = useCountUp(value);
  return (
    <div className="hc-counter-item" ref={ref}>
      <div className="hc-counter-n">{prefix}{val.toLocaleString()}{suffix}</div>
      <div className="hc-counter-l">{label}</div>
    </div>
  );
};

/* ---------- COUNTER band (4-up animated stats) — oxybuild "counter" ---------- */
export const CounterBand = ({ stats }) => (
  <section className="hc-section--tight hc-section--dark hc-counter">
    <div className="hc-container">
      <div className="hc-counter-grid">
        {stats.map((s) => <CounterStat key={s.label} {...s} />)}
      </div>
    </div>
  </section>
);

/* ---------- slider header with prev/next arrows — oxybuild section nav ---------- */
const SliderNav = ({ prevClass, nextClass, light }) => (
  <div className={`hc-slider-nav ${light ? 'hc-slider-nav--light' : ''}`}>
    <button type="button" className={`hc-slider-arrow ${prevClass}`} aria-label="Previous">
      <IconifyIcon icon="solar:arrow-left-linear" />
    </button>
    <button type="button" className={`hc-slider-arrow ${nextClass}`} aria-label="Next">
      <IconifyIcon icon="solar:arrow-right-linear" />
    </button>
  </div>
);

/* ---------- LOOKBOOK carousel — oxybuild "latest project" slider.
   Wired to the live storefront catalogue: each slide is a real published
   piece (name, fabric, price) rendered with its own fabric-motif tile and
   linking to its real /shop/:slug page — same card as the Shop grid. ---------- */
export const Lookbook = ({ kicker, title, products, formatNgn }) => (
  <section className="hc-section">
    <div className="hc-container">
      <div className="hc-slider-head">
        <div>
          <div className="hc-kicker">{kicker}</div>
          <h2 className="hc-h2 hc-mt-2">{title}</h2>
        </div>
        <div className="hc-flex" style={{ alignItems: 'center', gap: '1.25rem' }}>
          <Link to="/shop" className="hc-card-link" style={{ marginTop: 0 }}>
            View all <IconifyIcon icon="solar:arrow-right-linear" />
          </Link>
          <SliderNav prevClass="hc-look-prev" nextClass="hc-look-next" />
        </div>
      </div>
      <Swiper
        modules={[A11y, Navigation]}
        navigation={{ prevEl: '.hc-look-prev', nextEl: '.hc-look-next' }}
        spaceBetween={20}
        slidesPerView={1.15}
        breakpoints={{ 576: { slidesPerView: 2 }, 768: { slidesPerView: 3 }, 1100: { slidesPerView: 4 } }}
        className="hc-look-swiper"
      >
        {products.map((p) => (
          <SwiperSlide key={p.slug}>
            <Link to={`/shop/${p.slug}`} className="hc-product hc-look-product">
              <div className={`hc-tile ${p.tile} hc-product-media`}>
                {p.premium && <span className="hc-tile-tag">Premium</span>}
              </div>
              <div className="hc-product-body">
                <span className="hc-product-fab">{p.fabric}</span>
                <span className="hc-product-name">{p.name}</span>
                <span className="hc-product-price">
                  {formatNgn(p.priceNgn)}{p.priceUsd ? <small> · ${p.priceUsd}</small> : null}
                </span>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  </section>
);

/* ---------- SERVICES carousel — oxybuild "homepage services" ---------- */
export const ServicesCarousel = ({ kicker, title, lead, items }) => (
  <section className="hc-section hc-section--paper">
    <div className="hc-container">
      <div className="hc-slider-head">
        <div className="hc-head" style={{ marginBottom: 0 }}>
          <div className="hc-kicker">{kicker}</div>
          <h2 className="hc-h2 hc-mt-2">{title}</h2>
          {lead && <p className="hc-lead hc-mt-2">{lead}</p>}
        </div>
        <SliderNav prevClass="hc-serv-prev" nextClass="hc-serv-next" />
      </div>
      <Swiper
        modules={[A11y, Navigation]}
        navigation={{ prevEl: '.hc-serv-prev', nextEl: '.hc-serv-next' }}
        spaceBetween={24}
        slidesPerView={1.1}
        breakpoints={{ 640: { slidesPerView: 2 }, 992: { slidesPerView: 3 } }}
        className="hc-serv-swiper"
      >
        {items.map((s) => (
          <SwiperSlide key={s.title}>
            <div className="hc-card hc-serv-card">
              <span className="hc-card-ico"><IconifyIcon icon={s.icon} /></span>
              <h3>{s.title}</h3>
              <p className="hc-card-desc">{s.desc}</p>
              <Link to={s.to || '/shop'} className="hc-card-link">
                {s.cta || 'Explore'} <IconifyIcon icon="solar:arrow-right-linear" />
              </Link>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  </section>
);

/* ---------- WORKING PROCESS — oxybuild 4-up numbered step cards ---------- */
export const ProcessSteps = ({ kicker, title, lead, steps, dark }) => (
  <section className={`hc-section ${dark ? 'hc-section--dark' : ''}`}>
    <div className="hc-container">
      <div className="hc-head hc-head--center">
        <div className="hc-kicker">{kicker}</div>
        <h2 className="hc-h2" style={dark ? { color: '#fff' } : undefined}>{title}</h2>
        {lead && <p className="hc-lead" style={{ margin: '1rem auto 0' }}>{lead}</p>}
      </div>
      <div className="hc-proc-grid">
        {steps.map((s, i) => (
          <div key={s.title} className="hc-proc-card">
            <span className="hc-proc-n">{String(i + 1).padStart(2, '0')}</span>
            <span className="hc-proc-ico"><IconifyIcon icon={s.icon} /></span>
            <h4>{s.title}</h4>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ---------- TEAM carousel — oxybuild team cards w/ social hover ---------- */
const initials = (name) => name.split(' ').map((p) => p[0]).slice(0, 2).join('');
export const TeamCarousel = ({ kicker, title, lead, members }) => (
  <section className="hc-section">
    <div className="hc-container">
      <div className="hc-slider-head">
        <div className="hc-head" style={{ marginBottom: 0 }}>
          <div className="hc-kicker">{kicker}</div>
          <h2 className="hc-h2 hc-mt-2">{title}</h2>
          {lead && <p className="hc-lead hc-mt-2">{lead}</p>}
        </div>
        <SliderNav prevClass="hc-team-prev" nextClass="hc-team-next" />
      </div>
      <Swiper
        modules={[A11y, Navigation]}
        navigation={{ prevEl: '.hc-team-prev', nextEl: '.hc-team-next' }}
        spaceBetween={24}
        slidesPerView={1.2}
        breakpoints={{ 576: { slidesPerView: 2 }, 992: { slidesPerView: 3 }, 1200: { slidesPerView: 4 } }}
      >
        {members.map((m) => (
          <SwiperSlide key={m.name}>
            <div className="hc-team-card">
              <div className={`hc-team-photo ${m.tile}`}>
                <span className="hc-team-initials">{initials(m.name)}</span>
                <div className="hc-team-social">
                  <a href="https://instagram.com" aria-label="Instagram"><IconifyIcon icon="mdi:instagram" /></a>
                  <a href="https://wa.me/234" aria-label="WhatsApp"><IconifyIcon icon="mdi:whatsapp" /></a>
                  <a href="mailto:hello@heritclothing.com" aria-label="Email"><IconifyIcon icon="solar:letter-bold" /></a>
                </div>
              </div>
              <div className="hc-team-meta">
                <h4>{m.name}</h4>
                <span>{m.role}</span>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  </section>
);

/* ---------- TESTIMONIALS — oxybuild asymmetric text + quote carousel ---------- */
export const Testimonials = ({ kicker, title, lead, ctaTo, ctaLabel, quotes }) => (
  <section className="hc-section hc-section--paper">
    <div className="hc-container">
      <div className="hc-testi-grid">
        <div className="hc-testi-aside">
          <div className="hc-kicker">{kicker}</div>
          <h2 className="hc-h2 hc-mt-2">{title}</h2>
          {lead && <p className="hc-lead hc-mt-3">{lead}</p>}
          {ctaTo && (
            <Link to={ctaTo} className="hc-btn hc-btn--primary hc-mt-4">
              {ctaLabel || 'Read more'} <IconifyIcon icon="solar:arrow-right-linear" />
            </Link>
          )}
          <SliderNav prevClass="hc-testi-prev" nextClass="hc-testi-next" />
        </div>
        <div className="hc-testi-rail">
          <Swiper
            modules={[A11y, Navigation, Pagination]}
            navigation={{ prevEl: '.hc-testi-prev', nextEl: '.hc-testi-next' }}
            pagination={{ clickable: true, el: '.hc-testi-dots' }}
            spaceBetween={20}
            slidesPerView={1}
            breakpoints={{ 768: { slidesPerView: 2 } }}
          >
            {quotes.map((q) => (
              <SwiperSlide key={q.name}>
                <figure className="hc-testi-card">
                  <span className="hc-testi-mark">”</span>
                  <blockquote>{q.text}</blockquote>
                  <figcaption>
                    <span className={`hc-testi-avatar ${q.tile}`}>{initials(q.name)}</span>
                    <span>
                      <strong>{q.name}</strong>
                      <small>{q.role}</small>
                    </span>
                  </figcaption>
                </figure>
              </SwiperSlide>
            ))}
          </Swiper>
          <div className="hc-testi-dots" />
        </div>
      </div>
    </div>
  </section>
);

/* ---------- STOCKIST / BRAND strip — oxybuild logo carousel ---------- */
export const BrandStrip = ({ label, brands }) => (
  <section className="hc-section--tight hc-strip hc-brandstrip">
    <div className="hc-container">
      {label && <div className="hc-brandstrip-label">{label}</div>}
      <div className="hc-brandstrip-row">
        {brands.map((b) => (
          <span key={b} className="hc-brandstrip-logo">{b}</span>
        ))}
      </div>
    </div>
  </section>
);

/* ---------- JOURNAL slider — oxybuild "latest blog" ---------- */
export const JournalCarousel = ({ kicker, title, lead, posts }) => (
  <section className="hc-section">
    <div className="hc-container">
      <div className="hc-slider-head">
        <div className="hc-head" style={{ marginBottom: 0 }}>
          <div className="hc-kicker">{kicker}</div>
          <h2 className="hc-h2 hc-mt-2">{title}</h2>
          {lead && <p className="hc-lead hc-mt-2">{lead}</p>}
        </div>
        <SliderNav prevClass="hc-journal-prev" nextClass="hc-journal-next" />
      </div>
      <Swiper
        modules={[A11y, Navigation]}
        navigation={{ prevEl: '.hc-journal-prev', nextEl: '.hc-journal-next' }}
        spaceBetween={24}
        slidesPerView={1.1}
        breakpoints={{ 640: { slidesPerView: 2 }, 992: { slidesPerView: 3 } }}
      >
        {posts.map((p) => (
          <SwiperSlide key={p.title}>
            <article className="hc-journal-card">
              <Link to={p.to || '/'} className={`hc-journal-media ${p.tile}`}>
                <span className="hc-journal-cat">{p.cat}</span>
              </Link>
              <div className="hc-journal-body">
                <span className="hc-journal-date">{p.date}</span>
                <h4><Link to={p.to || '/'}>{p.title}</Link></h4>
                <p>{p.excerpt}</p>
                <Link to={p.to || '/'} className="hc-card-link">
                  Read more <IconifyIcon icon="solar:arrow-right-linear" />
                </Link>
              </div>
            </article>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  </section>
);

/* ---------- HERO slider — oxybuild swiper hero ---------- */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const HeroSlider = ({ slides }) => {
  // Honour reduced-motion: no autoplay, and a clean (non-fading) swap.
  const reduce = prefersReducedMotion();
  return (
  <section className="hc-hero hc-hero--bold hc-hero--slider" aria-roledescription="carousel" aria-label="Herit collections">
    <div className="hc-hero-weave" aria-hidden="true" />
    <div className="hc-hero-glow" aria-hidden="true" />
    <span className="hc-hero-vlabel" aria-hidden="true">Est. 2024 — Wear your heritage</span>
    <Swiper
      modules={[A11y, Autoplay, EffectFade, Pagination]}
      effect={reduce ? 'slide' : 'fade'}
      fadeEffect={{ crossFade: true }}
      speed={reduce ? 0 : 600}
      autoplay={reduce ? false : { delay: 5500, disableOnInteraction: false, pauseOnMouseEnter: true }}
      pagination={{ clickable: true, el: '.hc-hero-dots' }}
      loop
      className="hc-hero-swiper"
    >
      {slides.map((s) => (
        <SwiperSlide key={s.title}>
          <div className="hc-container">
            <div className="hc-hero-grid">
              <div className="hc-hero-left">
                <div className="hc-hero-eyebrow">
                  <span className="hc-hero-pulse" /> {s.eyebrow}
                </div>
                <h1 className="hc-hero-title">
                  {s.title}
                  <span className="hc-hero-em">{s.em}</span>
                </h1>
                <p className="hc-hero-sub">{s.sub}</p>
                <div className="hc-hero-actions">
                  <Link to={s.primaryTo} className="hc-btn hc-btn--gold hc-hero-cta">
                    <IconifyIcon icon={s.primaryIcon || 'solar:bag-4-bold'} /> {s.primaryLabel}
                  </Link>
                  <Link to={s.secondaryTo} className="hc-btn hc-btn--glass">
                    <IconifyIcon icon={s.secondaryIcon || 'solar:play-circle-bold'} /> {s.secondaryLabel}
                  </Link>
                </div>
              </div>
              <div className="hc-hero-right">
                <div className="hc-fabric-stack">
                  {s.fabrics.map((f, i) => (
                    <div key={f.name} className={`hc-fabric-card ${f.tile}`} style={{ '--i': i }}>
                      <span className="hc-fabric-tag">{f.tag}</span>
                      <div className="hc-fabric-meta"><strong>{f.name}</strong><small>{f.sub}</small></div>
                      {f.price && <span className="hc-fabric-price">{f.price}</span>}
                    </div>
                  ))}
                </div>
                <div className="hc-hero-place">
                  <IconifyIcon icon="solar:map-point-bold" /> Ajuwon Market · Lagos, Nigeria
                </div>
              </div>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
    <div className="hc-container hc-hero-foot">
      <div className="hc-hero-dots" />
      <span className="hc-hero-scroll" aria-hidden="true">
        Scroll <IconifyIcon icon="solar:alt-arrow-down-linear" />
      </span>
    </div>
  </section>
  );
};
