import { Link } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import SiteLayout from './SiteLayout';
import { useCatalogue, formatNgn } from './products';
import {
  HeroSlider, CounterBand, Lookbook, ServicesCarousel,
  TeamCarousel, Testimonials, BrandStrip, JournalCarousel,
} from './sections';

const heroSlides = [
  {
    eyebrow: "The Founders' Drop is live",
    title: 'Your culture,',
    em: 'cut for now.',
    sub: 'Bold Ankara. Hand-dyed Adire. Woven Aso-Oke. Reworked into pieces you’ll actually live in — made by hand in Ajuwon Market, Lagos, and shipped worldwide.',
    primaryTo: '/shop', primaryLabel: 'Shop the collection', primaryIcon: 'solar:bag-4-bold',
    secondaryTo: '/about', secondaryLabel: 'Our story', secondaryIcon: 'solar:play-circle-bold',
    fabrics: [
      { name: 'Aso-Oke', sub: 'Woven, ceremonial', tag: 'Premium', tile: 'hc-tile-asooke' },
      { name: 'Ankara', sub: 'Bold wax prints', tag: 'Bestseller', tile: 'hc-tile-ankara', price: 'from ₦18,500' },
      { name: 'Adire', sub: 'Hand-dyed indigo', tag: 'Signature', tile: 'hc-tile-adire' },
    ],
  },
  {
    eyebrow: 'Heritage, tailored for now',
    title: 'The story is',
    em: 'in the cloth.',
    sub: 'Every print has a past. We name each fabric and where it comes from, then tailor it for a modern, everyday fit — so you wear your heritage forward with pride.',
    primaryTo: '/shop', primaryLabel: 'Shop by fabric', primaryIcon: 'solar:scissors-square-bold',
    secondaryTo: '/gifting', secondaryLabel: 'Explore gifting', secondaryIcon: 'solar:gift-bold',
    fabrics: [
      { name: 'Adire', sub: 'Hand-dyed indigo', tag: 'Signature', tile: 'hc-tile-adire' },
      { name: 'Aso-Oke', sub: 'Woven strip cloth', tag: 'Premium', tile: 'hc-tile-asooke' },
      { name: 'Mixed', sub: 'Headwraps & trims', tag: 'Accessory', tile: 'hc-tile-mixed' },
    ],
  },
  {
    eyebrow: 'Lagos to the world',
    title: 'Made in Lagos,',
    em: 'worn everywhere.',
    sub: 'Proudly made in our corner of Lagos. We deliver across the city, throughout Nigeria and worldwide — tracked, in branded packaging, with roots intact.',
    primaryTo: '/shop', primaryLabel: 'Start shopping', primaryIcon: 'solar:bag-4-bold',
    secondaryTo: '/contact', secondaryLabel: 'Talk to us', secondaryIcon: 'solar:letter-bold',
    fabrics: [
      { name: 'Ankara', sub: 'Bold wax prints', tag: 'Bestseller', tile: 'hc-tile-ankara', price: 'from ₦18,500' },
      { name: 'Aso-Oke', sub: 'Woven, ceremonial', tag: 'Premium', tile: 'hc-tile-asooke' },
      { name: 'Mixed', sub: 'Headwraps & ties', tag: 'Accessory', tile: 'hc-tile-mixed' },
    ],
  },
];

const promises = [
  { icon: 'solar:book-bookmark-bold', badge: 'Heritage with a story', title: 'Every print has a past', desc: 'Ankara, Adire and Aso-Oke each carry meaning. We honour the origin of every fabric at the source — and tell you what it is, so you wear it forward with pride.' },
  { icon: 'solar:scissors-square-bold', badge: 'Craft you can feel', title: 'Hand-chosen, made to last', desc: 'Honest tailoring and considered finishing. Fabrics chosen by hand, hand-cut, lined and finished to be lived in — not saved for one occasion a year.', feature: true },
  { icon: 'solar:global-bold', badge: 'Lagos to the world', title: 'Shipped near & far', desc: 'Proudly made in our corner of Lagos. We deliver across the city, throughout Nigeria and worldwide — tracked, with branded packaging and roots intact.' },
];

const services = [
  { icon: 'solar:hanger-2-bold', title: 'Ready-to-wear', desc: 'Contemporary pieces in heritage cloth — cut for modern life and ready to ship today.', to: '/shop', cta: 'Shop ready-to-wear' },
  { icon: 'solar:ruler-pen-bold', title: 'Made-to-measure', desc: 'Your fabric, your measurements. Bespoke tailoring for occasions that deserve it.', to: '/contact', cta: 'Request a fitting' },
  { icon: 'solar:users-group-rounded-bold', title: 'Aso-ebi & groups', desc: 'Matching pieces for weddings and celebrations, with tiered pricing on six or more.', to: '/contact', cta: 'Get a group quote' },
  { icon: 'solar:gift-bold', title: 'Gifting', desc: 'Meaningful pieces with presentation that matches the meaning — gift notes included.', to: '/gifting', cta: 'Explore gifting' },
];

const stats = [
  { value: 1200, suffix: '+', label: 'Pieces delivered' },
  { value: 18, suffix: '', label: 'Countries shipped to' },
  { value: 3, suffix: '', label: 'Heritage fabrics, sourced at origin' },
  { value: 98, suffix: '%', label: 'Would order again' },
];

const team = [
  { name: 'Amara Okafor', role: 'Founder & Creative Director', tile: 'hc-tile-adire' },
  { name: 'Tunde Bello', role: 'Head of Tailoring', tile: 'hc-tile-asooke' },
  { name: 'Zainab Yusuf', role: 'Fabric Sourcing', tile: 'hc-tile-ankara' },
  { name: 'Chidi Eze', role: 'Customer Care', tile: 'hc-tile-mixed' },
];

const quotes = [
  { name: 'Funmi A.', role: 'Lagos, Nigeria', tile: 'hc-tile-ankara', text: 'The Adire dress arrived better than the photos — the indigo is so deep. I’ve had three people stop me to ask where it’s from.' },
  { name: 'David O.', role: 'London, UK', tile: 'hc-tile-asooke', text: 'Shipping to the UK was tracked the whole way and the packaging was beautiful. It finally feels like wearing home, properly tailored.' },
  { name: 'Ngozi M.', role: 'Toronto, Canada', tile: 'hc-tile-adire', text: 'Ordered matching aso-ebi for six of us. The fit notes made sizing easy and every piece was consistent. Will be back for the next drop.' },
  { name: 'Kemi T.', role: 'Abuja, Nigeria', tile: 'hc-tile-mixed', text: 'I love that they tell you the story of the fabric. It’s not costume — it’s something you actually want to live in.' },
];

const journal = [
  { cat: 'Heritage', date: 'June 2026', title: 'Reading Adire: the language of indigo', excerpt: 'Every resist pattern in hand-dyed Adire carries meaning. Here’s how to read the cloth before you wear it.', tile: 'hc-tile-adire', to: '/about' },
  { cat: 'Craft', date: 'May 2026', title: 'Why we cut for now, not for one occasion', excerpt: 'Heritage fabric belongs in everyday life. A look at how we tailor traditional cloth for modern wardrobes.', tile: 'hc-tile-asooke', to: '/about' },
  { cat: 'Behind the seams', date: 'April 2026', title: 'From Ajuwon Market to your doorstep', excerpt: 'How a piece travels from the fabric stall to a tracked parcel anywhere in the world.', tile: 'hc-tile-ankara', to: '/about' },
];

const HomePage = () => {
  const { products } = useCatalogue();
  // Lead with premium pieces, then the rest — real published catalogue.
  const featured = [...products].sort((a, b) => (b.premium ? 1 : 0) - (a.premium ? 1 : 0)).slice(0, 8);

  return (
    <SiteLayout title="Wear your heritage">
    {/* announcement marquee — two identical tracks for a seamless loop */}
    <div className="hc-marquee">
      {[0, 1].map((k) => (
        <div className="hc-marquee-track" key={k} aria-hidden={k === 1}>
          <span>★ The Founders&apos; Drop is live</span>
          <span>★ Free Lagos delivery over ₦25,000</span>
          <span>★ Ships worldwide, tracked</span>
          <span>★ 10% off your first piece — code HERIT10</span>
          <span>★ #WearYourHeritage</span>
        </div>
      ))}
    </div>

    {/* hero — multi-slide heritage canvas */}
    <HeroSlider slides={heroSlides} />

    {/* promise strip — 3-up value props */}
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
          {promises.map((v) => (
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

    {/* about split — visual + experience badge + checklist (oxybuild about-one) */}
    <section className="hc-section hc-section--paper">
      <div className="hc-container">
        <div className="hc-about-split">
          <div className="hc-about-visual">
            <div className="hc-about-figure hc-tile hc-tile-adire" />
            <div className="hc-about-exp">
              <strong>2024</strong>
              <span>Founded in Ajuwon Market, Lagos</span>
            </div>
          </div>
          <div>
            <div className="hc-kicker">Our story</div>
            <h2 className="hc-h2 hc-mt-2">Rooted in Lagos. Made for everywhere.</h2>
            <p className="hc-lead hc-mt-3">
              Herit Clothing started with a simple frustration: the fabrics we grew up with were
              saved for special occasions, or treated abroad as costume rather than culture. We
              believe they deserve a place in everyday life — cut for the way people actually dress.
            </p>
            <ul className="hc-check">
              <li><IconifyIcon icon="solar:check-circle-bold" /> Heritage fabrics named and sourced at origin</li>
              <li><IconifyIcon icon="solar:check-circle-bold" /> Hand-cut, lined and finished to last</li>
              <li><IconifyIcon icon="solar:check-circle-bold" /> Each piece ships with the story of its fabric</li>
            </ul>
            <Link to="/about" className="hc-btn hc-btn--primary hc-mt-4">
              Read our story <IconifyIcon icon="solar:arrow-right-linear" />
            </Link>
          </div>
        </div>
      </div>
    </section>

    {/* lookbook — live catalogue: real pieces, real prices, real product links */}
    <Lookbook
      kicker="The collection"
      title="Fresh off the cutting table."
      products={featured}
      formatNgn={formatNgn}
    />

    {/* stockist / press strip */}
    <BrandStrip
      label="Worn and stocked from Lagos to London"
      brands={['VOGUE NG', 'BellaNaija', 'GUARDIAN Life', 'ThisDay Style', 'OkayAfrica']}
    />

    {/* services carousel */}
    <ServicesCarousel
      kicker="What we offer"
      title="More than ready-to-wear."
      lead="From the rail to a full bespoke fitting — heritage cloth, however you want to wear it."
      items={services}
    />

    {/* animated stat counter */}
    <CounterBand stats={stats} />

    {/* team carousel */}
    <TeamCarousel
      kicker="The makers"
      title="The hands behind every piece."
      lead="A small Lagos team that sources, cuts and finishes everything we sell."
      members={team}
    />

    {/* testimonials */}
    <Testimonials
      kicker="Loved across Lagos & beyond"
      title="Worn with pride, worldwide."
      lead="Real words from customers in Lagos, London, Toronto and beyond — wearing heritage every day."
      ctaTo="/shop"
      ctaLabel="Shop the collection"
      quotes={quotes}
    />

    {/* journal */}
    <JournalCarousel
      kicker="The journal"
      title="Stories from the cutting table."
      lead="Heritage, craft and what goes on behind the seams."
      posts={journal}
    />

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
};

export default HomePage;
