import { Link } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import SiteLayout from './SiteLayout';

const valueProps = [
  {
    icon: 'solar:book-bookmark-bold',
    badge: 'Heritage with a story',
    title: 'Every print has a past',
    desc: 'Ankara, Adire and Aso-Oke each carry meaning. We honour the origin of every fabric at the source — and tell you what it is, so you wear it forward with pride.',
  },
  {
    icon: 'solar:scissors-square-bold',
    badge: 'Craft you can feel',
    title: 'Hand-chosen, made to last',
    desc: 'Honest tailoring and considered finishing. Fabrics chosen by hand, hand-cut, lined and finished to be lived in — not saved for one occasion a year.',
    feature: true,
  },
  {
    icon: 'solar:global-bold',
    badge: 'Lagos to the world',
    title: 'From Ajuwon Market, shipped near & far',
    desc: 'Proudly made in our corner of Lagos. We deliver across the city, throughout Nigeria and worldwide — tracked, with branded packaging and roots intact.',
  },
];

const pillars = [
  { t: 'Heritage', d: 'Tradition is our starting point, never a costume. We name the fabric and its origin.' },
  { t: 'Craft', d: 'Considered tailoring and finishing, with fabric chosen and tracked by the metre.' },
  { t: 'Modern fit', d: 'Cultural roots, contemporary cut — pieces built for real, everyday wardrobes.' },
  { t: 'Lagos to world', d: 'A brand from Lagos dressing customers across the globe without losing its roots.' },
];

const fabrics = [
  { c: 'hc-tile-ankara', s: 'Ankara', l: 'Bold wax prints', tag: 'Everyday' },
  { c: 'hc-tile-adire', s: 'Adire', l: 'Hand-dyed indigo', tag: 'Signature' },
  { c: 'hc-tile-asooke', s: 'Aso-Oke', l: 'Woven, ceremonial', tag: 'Premium' },
  { c: 'hc-tile-mixed', s: 'Mixed & trims', l: 'Headwraps, ties', tag: 'Accessory' },
];

const HomePage = () => (
  <SiteLayout title="Wear your heritage">
    {/* announcement marquee */}
    <div className="hc-marquee">
      <span>★ The Founders&apos; Drop is live</span>
      <span>★ Free Lagos delivery over ₦25,000</span>
      <span>★ Ships worldwide, tracked</span>
      <span>★ 10% off your first piece — code HERIT10</span>
      <span>★ #WearYourHeritage</span>
    </div>

    {/* hero */}
    <section className="hc-hero">
      <div className="hc-container">
        <div className="hc-hero-grid">
          <div className="hc-hero-left">
            <div className="hc-hero-tagline">Contemporary African Fashion · Est. Lagos</div>
            <h1 className="hc-h1">Wear your <em>heritage</em>.</h1>
            <p className="hc-lead hc-mt-3">
              Contemporary African fashion, rooted in real heritage fabrics. We take traditional
              prints and patterns and tailor them for now — so you can wear your culture with
              pride, wherever you are. Made in Lagos, for the world.
            </p>
            <div className="hc-hero-actions">
              <Link to="/shop" className="hc-btn hc-btn--primary">
                <IconifyIcon icon="solar:bag-4-bold" /> Shop the collection
              </Link>
              <Link to="/about" className="hc-btn hc-btn--ghost">
                <IconifyIcon icon="solar:book-bookmark-linear" /> Our story
              </Link>
            </div>
            <div className="hc-hero-strip">
              <div><div className="hc-stat-n">3</div><div className="hc-stat-l">Heritage fabrics</div></div>
              <div><div className="hc-stat-n">100%</div><div className="hc-stat-l">Made in Lagos</div></div>
              <div><div className="hc-stat-n">Worldwide</div><div className="hc-stat-l">Tracked shipping</div></div>
              <div><div className="hc-stat-n">14-day</div><div className="hc-stat-l">Returns</div></div>
            </div>
          </div>

          <div className="hc-hero-right">
            <div>
              <div className="hc-swatch-row">
                <div className="hc-swatch" style={{ background: '#b71c1c' }} />
                <div className="hc-swatch" style={{ background: '#556b2f' }} />
                <div className="hc-swatch" style={{ background: '#4682b4' }} />
                <div className="hc-swatch" style={{ background: '#ff6f00' }} />
                <div className="hc-swatch" style={{ background: '#8d6e63' }} />
              </div>
              <p className="hc-hero-quote">
                Heritage that doesn&apos;t stay in the wardrobe for special occasions — it lives
                with you, every day.
              </p>
            </div>
            <div className="hc-hero-place">
              <IconifyIcon icon="solar:map-point-bold" /> Ajuwon Market, Lagos, Nigeria
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* intro strip */}
    <section className="hc-section--tight" style={{ background: '#d6d6d6', borderBottom: '2px solid #1f1f1f' }}>
      <div className="hc-container hc-text-center">
        <p style={{ fontSize: '1.35rem', fontWeight: 700, maxWidth: '52rem', margin: '0 auto', lineHeight: 1.4 }}>
          Herit Clothing celebrates African heritage through clothing. We take traditional fabrics,
          prints and patterns and tailor them for now — so you can wear your culture with pride,
          wherever you are.
        </p>
      </div>
    </section>

    {/* value props */}
    <section className="hc-section">
      <div className="hc-container">
        <div className="hc-head hc-head--center">
          <div className="hc-kicker">Why Herit</div>
          <h2 className="hc-h2">Heritage, tailored for now.</h2>
          <p className="hc-lead" style={{ margin: '1rem auto 0' }}>
            Three things shape everything we make. Roots you can name, craft you can feel,
            and a reach from Lagos to the world.
          </p>
        </div>
        <div className="hc-grid hc-grid--3">
          {valueProps.map((v) => (
            <div key={v.title} className={`hc-card ${v.feature ? 'hc-card--feature' : ''}`}>
              <span className="hc-card-ico"><IconifyIcon icon={v.icon} /></span>
              <span className="hc-card-badge">{v.badge}</span>
              <h3>{v.title}</h3>
              <p className="hc-card-desc">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* featured collection */}
    <section className="hc-section hc-section--dark">
      <div className="hc-container">
        <div className="hc-grid hc-grid--2" style={{ alignItems: 'center', gap: '3rem' }}>
          <div>
            <div className="hc-kicker">Featured collection</div>
            <h2 className="hc-h2 hc-mt-2" style={{ color: '#fff' }}>The Founders&apos; Drop</h2>
            <p className="hc-lead hc-mt-3">
              Our first collection — limited pieces in bold Ankara and hand-dyed Adire. Each one
              cut for modern life and made to be lived in. Once they&apos;re gone, they&apos;re gone.
            </p>
            <ul className="hc-check">
              <li><IconifyIcon icon="solar:check-circle-bold" /> Limited run, numbered pieces</li>
              <li><IconifyIcon icon="solar:check-circle-bold" /> Hand-dyed Adire — no two exactly alike</li>
              <li><IconifyIcon icon="solar:check-circle-bold" /> Each piece ships with the story of its fabric</li>
            </ul>
            <Link to="/shop" className="hc-btn hc-btn--primary hc-mt-4">
              Shop the drop <IconifyIcon icon="solar:arrow-right-linear" />
            </Link>
          </div>
          <div className="hc-grid hc-grid--2" style={{ gap: '1rem' }}>
            {fabrics.slice(0, 4).map((f) => (
              <div key={f.s} className={`hc-tile ${f.c}`}>
                <span className="hc-tile-tag">{f.tag}</span>
                <span>{f.s}</span>
                <small>{f.l}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* fabrics / shop by cloth */}
    <section className="hc-section">
      <div className="hc-container">
        <div className="hc-head">
          <div className="hc-kicker">Shop by fabric</div>
          <h2 className="hc-h2">The story is in the cloth.</h2>
          <p className="hc-lead">
            Browse contemporary pieces by heritage fabric — each one made to last and worn with pride.
          </p>
        </div>
        <div className="hc-grid hc-grid--4">
          {fabrics.map((f) => (
            <Link to="/shop" key={f.s} className={`hc-tile ${f.c}`}>
              <span className="hc-tile-tag">{f.tag}</span>
              <span>{f.s}</span>
              <small>{f.l}</small>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* pillars */}
    <section className="hc-section hc-section--paper">
      <div className="hc-container">
        <div className="hc-head hc-head--center">
          <div className="hc-kicker">What we stand for</div>
          <h2 className="hc-h2">Four pillars, one promise.</h2>
        </div>
        <div className="hc-grid hc-grid--4">
          {pillars.map((p) => (
            <div key={p.t} className="hc-pillar">
              <h4>{p.t}</h4>
              <p>{p.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* story teaser */}
    <section className="hc-section">
      <div className="hc-container">
        <div className="hc-grid hc-grid--2" style={{ alignItems: 'center', gap: '3rem' }}>
          <div className="hc-quote">
            <p>“From a stall in Ajuwon Market to wardrobes around the world. We believe heritage
              belongs in everyday life.”</p>
            <cite>— The Herit Clothing story</cite>
          </div>
          <div>
            <div className="hc-kicker">Our story</div>
            <h2 className="hc-h2 hc-mt-2">Rooted in Lagos. Made for everywhere.</h2>
            <p className="hc-lead hc-mt-3">
              Herit Clothing started with a simple frustration: the fabrics we grew up with were
              saved for special occasions, or treated abroad as costume rather than culture. We
              believed they deserved a place in everyday life — cut for the way people actually
              dress today.
            </p>
            <Link to="/about" className="hc-btn hc-btn--dark hc-mt-4">
              Read our story <IconifyIcon icon="solar:arrow-right-linear" />
            </Link>
          </div>
        </div>
      </div>
    </section>

    {/* market proof band */}
    <section className="hc-section--tight hc-section--olive">
      <div className="hc-container">
        <div className="hc-grid hc-grid--4" style={{ textAlign: 'center' }}>
          {[
            { n: '$10.5bn', l: "Nigeria e-commerce, 2026 forecast" },
            { n: '~39%', l: 'Of online orders from Greater Lagos' },
            { n: '80%+', l: 'Of orders placed on mobile' },
            { n: 'Resurgent', l: 'Demand for Ankara & Adire at home and abroad' },
          ].map((s) => (
            <div key={s.l}>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: '2rem', color: '#fff' }}>{s.n}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.85)', marginTop: '0.3rem' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* email capture / CTA */}
    <section className="hc-section hc-section--crimson">
      <div className="hc-container hc-cta-band">
        <div className="hc-kicker">Join the family</div>
        <h2 className="hc-h2 hc-mt-2">Be first to new drops — and get 10% off.</h2>
        <p>Our pieces are made in limited runs. Join the family to hear first when the cutting
          table fills up, and get 10% off your first piece with code HERIT10.</p>
        <div className="hc-cta-actions">
          <Link to="/shop" className="hc-btn hc-btn--light">
            <IconifyIcon icon="solar:bag-4-bold" /> Shop the collection
          </Link>
          <Link to="/contact" className="hc-btn hc-btn--onfill">
            <IconifyIcon icon="solar:letter-linear" /> Talk to us
          </Link>
        </div>
      </div>
    </section>
  </SiteLayout>
);

export default HomePage;
