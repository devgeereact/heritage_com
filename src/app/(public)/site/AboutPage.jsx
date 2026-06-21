import { Link } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import SiteLayout from './SiteLayout';
import { CounterBand, ProcessSteps, TeamCarousel, Testimonials } from './sections';
import { useTestimonials } from './content';

const stands = [
  { t: 'Heritage with intent', d: 'Tradition is our starting point, never a costume. We name each fabric and where it comes from.' },
  { t: 'Made for now', d: 'Cultural roots, contemporary cuts — pieces built for real, modern wardrobes.' },
  { t: 'Proudly Lagos', d: 'Built in Ajuwon Market, made for the world. Our roots stay put as we grow.' },
  { t: 'Craft you can feel', d: 'Honest tailoring, fabrics chosen with care, finishing you can feel in the hand.' },
  { t: 'Worn with pride', d: 'We want you to feel seen and connected to your story when you wear Herit.' },
];

const process = [
  { icon: 'solar:leaf-bold', title: 'Source with respect', desc: 'We source heritage fabrics with care and respect for their origin and meaning.' },
  { icon: 'solar:pen-new-square-bold', title: 'Design for now', desc: 'We design contemporary cuts and tailor each pattern for a modern, everyday fit.' },
  { icon: 'solar:shop-bold', title: 'Sell direct, tell the story', desc: 'We sell direct online and in person, telling the story behind every piece.' },
  { icon: 'solar:delivery-bold', title: 'Deliver, near and far', desc: 'We deliver with branded, considered packaging — across Lagos, Nigeria and worldwide.' },
];

const serve = [
  { icon: 'solar:home-2-bold', t: 'Lagos & Nigeria', d: 'The modern African who wants style and identity at a fair price.' },
  { icon: 'solar:global-bold', t: 'The diaspora', d: 'A wearable connection to roots, wherever home now is.' },
  { icon: 'solar:gift-bold', t: 'Gifters', d: 'Meaningful pieces with presentation that matches the meaning.' },
];

const stats = [
  { value: 2024, suffix: '', label: 'Founded in Lagos' },
  { value: 1200, suffix: '+', label: 'Pieces delivered' },
  { value: 18, suffix: '', label: 'Countries shipped to' },
  { value: 3, suffix: '', label: 'Heritage fabrics, sourced at origin' },
];

const team = [
  { name: 'Amara Okafor', role: 'Founder & Creative Director', tile: 'hc-tile-adire' },
  { name: 'Tunde Bello', role: 'Head of Tailoring', tile: 'hc-tile-asooke' },
  { name: 'Zainab Yusuf', role: 'Fabric Sourcing', tile: 'hc-tile-ankara' },
  { name: 'Chidi Eze', role: 'Customer Care', tile: 'hc-tile-mixed' },
];

const AboutPage = () => {
  const quotes = useTestimonials();
  return (
  <SiteLayout title="About">
    <section className="hc-pagehead">
      <div className="hc-container">
        <div className="hc-crumb"><Link to="/">Home</Link> / <span>About</span></div>
        <h1 className="hc-h1">Heritage, tailored for now.</h1>
        <p>Who we are, what we make, and where we&apos;re going — a heritage brand from Lagos,
          dressing the world without losing its roots.</p>
      </div>
    </section>

    {/* story — about split with visual + experience badge */}
    <section className="hc-section">
      <div className="hc-container">
        <div className="hc-about-split">
          <div className="hc-about-visual">
            <div className="hc-about-figure hc-tile hc-tile-asooke" />
            <div className="hc-about-exp">
              <strong>Lagos</strong>
              <span>Ajuwon Market · where it began</span>
            </div>
          </div>
          <div>
            <div className="hc-kicker">Our story</div>
            <h2 className="hc-h2 hc-mt-2">From a stall in Ajuwon Market.</h2>
            <p className="hc-lead hc-mt-3">
              Herit Clothing started in Ajuwon Market, Lagos, with a simple frustration: the
              fabrics and prints we grew up with — Ankara, Adire, Aso-Oke — were too often saved
              for special occasions, or treated abroad as costume rather than culture. We believed
              they deserved a place in everyday life, cut for the way people actually dress today.
            </p>
            <p className="hc-mt-3" style={{ color: 'var(--muted-foreground)' }}>
              So we began making contemporary pieces from traditional cloth — honouring where each
              fabric comes from, then tailoring it for a modern fit. Today we sell online and in
              person, dressing customers in Lagos, across Nigeria and around the world. We&apos;ve
              grown, but our roots haven&apos;t moved.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* mission / vision */}
    <section className="hc-section hc-section--dark">
      <div className="hc-container">
        <div className="hc-grid hc-grid--2" style={{ gap: '2.5rem' }}>
          <div className="hc-card hc-card--feature">
            <span className="hc-card-ico"><IconifyIcon icon="solar:target-bold" /></span>
            <span className="hc-card-badge">Mission</span>
            <h3>Celebrate African heritage through clothing</h3>
            <p className="hc-card-desc">
              To celebrate and promote African heritage through clothing — fusing traditional
              fabrics and prints with contemporary style for the modern African identity.
            </p>
          </div>
          <div className="hc-card hc-card--feature">
            <span className="hc-card-ico"><IconifyIcon icon="solar:global-bold" /></span>
            <span className="hc-card-badge">Vision</span>
            <h3>Heritage worn with pride, everywhere</h3>
            <p className="hc-card-desc">
              A world where African heritage is worn with pride everywhere, and a brand from Lagos
              can dress customers across the globe without losing its roots.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* how we work — numbered process cards */}
    <ProcessSteps
      kicker="How we work"
      title="Roots first, every step."
      lead="From the fabric stall to your doorstep, the same care runs through everything we do."
      steps={process}
    />

    {/* animated stat counter */}
    <CounterBand stats={stats} />

    {/* what we stand for */}
    <section className="hc-section">
      <div className="hc-container">
        <div className="hc-head">
          <div className="hc-kicker">What we stand for</div>
          <h2 className="hc-h2">Five things we don&apos;t compromise on.</h2>
        </div>
        <div className="hc-grid hc-grid--3">
          {stands.map((s) => (
            <div key={s.t} className="hc-pillar">
              <h4>{s.t}</h4>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* who we serve */}
    <section className="hc-section hc-section--paper">
      <div className="hc-container">
        <div className="hc-head hc-head--center">
          <div className="hc-kicker">Who we serve</div>
          <h2 className="hc-h2">Heritage means something different to everyone.</h2>
        </div>
        <div className="hc-grid hc-grid--3">
          {serve.map((s) => (
            <div key={s.t} className="hc-card">
              <span className="hc-card-ico"><IconifyIcon icon={s.icon} /></span>
              <h3>{s.t}</h3>
              <p className="hc-card-desc">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* the makers */}
    <TeamCarousel
      kicker="The makers"
      title="The hands behind every piece."
      lead="A small Lagos team that sources, cuts and finishes everything we sell."
      members={team}
    />

    {/* testimonials */}
    <Testimonials
      kicker="In their words"
      title="Worn with pride, worldwide."
      lead="From Lagos to the diaspora, here’s what wearing Herit means to the people who do."
      ctaTo="/shop"
      ctaLabel="Shop the collection"
      quotes={quotes}
    />

    {/* where we're going / CTA */}
    <section className="hc-section hc-section--crimson">
      <div className="hc-container hc-cta-band">
        <div className="hc-kicker">Where we&apos;re going</div>
        <h2 className="hc-h2 hc-mt-2">A heritage brand from Lagos, dressing the world.</h2>
        <p>Building a loyal community around #WearYourHeritage, growing the online store, and
          expanding the collection while keeping every piece rooted and honest.</p>
        <div className="hc-cta-actions">
          <Link to="/shop" className="hc-btn hc-btn--light"><IconifyIcon icon="solar:bag-4-bold" /> Shop the collection</Link>
          <Link to="/contact" className="hc-btn hc-btn--onfill"><IconifyIcon icon="solar:letter-linear" /> Get in touch</Link>
        </div>
      </div>
    </section>
  </SiteLayout>
  );
};

export default AboutPage;
