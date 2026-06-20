import { Link } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import SiteLayout from './SiteLayout';
import SiteContactForm from './SiteContactForm';

const features = [
  { icon: 'solar:notes-bold', t: 'Handwritten note', d: 'Add a personal message at checkout — we write it by hand and tuck it in with the piece.' },
  { icon: 'solar:gift-bold', t: 'Branded wrap', d: 'Considered, branded packaging that matches the meaning of the gift inside.' },
  { icon: 'solar:card-bold', t: 'Herit gift card', d: 'Not sure on size? Send a gift card and let them choose the piece that&apos;s theirs.' },
];

const steps = [
  { n: '1', t: 'Choose a piece', d: 'Browse the collection and pick something with a story — or send a gift card.' },
  { n: '2', t: 'Add a note', d: 'Write a personal message and choose branded gift wrap at checkout.' },
  { n: '3', t: 'We present it', d: 'We wrap, pack and ship — beautifully given, near or far.' },
];

const GiftingPage = () => (
  <SiteLayout title="Gifting">
    <section className="hc-pagehead">
      <div className="hc-container">
        <div className="hc-crumb"><Link to="/">Home</Link> / <span>Gifting</span></div>
        <h1 className="hc-h1">Give a piece with a story.</h1>
        <p>Looking for a gift that means something? Every Herit piece comes with the story of its
          fabric — and, if you like, a handwritten note and gift wrap. Heritage, beautifully given.</p>
      </div>
    </section>

    {/* features */}
    <section className="hc-section">
      <div className="hc-container">
        <div className="hc-grid hc-grid--3">
          {features.map((f) => (
            <div key={f.t} className="hc-card">
              <span className="hc-card-ico"><IconifyIcon icon={f.icon} /></span>
              <h3>{f.t}</h3>
              <p className="hc-card-desc" dangerouslySetInnerHTML={{ __html: f.d }} />
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* how it works */}
    <section className="hc-section hc-section--dark">
      <div className="hc-container">
        <div className="hc-grid hc-grid--2" style={{ gap: '3rem', alignItems: 'center' }}>
          <div>
            <div className="hc-kicker">How gifting works</div>
            <h2 className="hc-h2 hc-mt-2" style={{ color: '#fff' }}>Three steps to a meaningful gift.</h2>
            <p className="hc-lead hc-mt-3">
              Whether it&apos;s for a birthday, a wedding, an aso-ebi set or a piece of home for
              someone in the diaspora — we make it easy to give something that lasts.
            </p>
            <Link to="/shop" className="hc-btn hc-btn--primary hc-mt-4">
              Find a gift <IconifyIcon icon="solar:arrow-right-linear" />
            </Link>
          </div>
          <div>
            {steps.map((s) => (
              <div key={s.n} className="hc-step" style={{ borderColor: '#3a3a3a' }}>
                <div className="hc-step-n">{s.n}</div>
                <div>
                  <h4 style={{ color: '#fff' }}>{s.t}</h4>
                  <p style={{ color: '#c4c4c4' }}>{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* occasions */}
    <section className="hc-section">
      <div className="hc-container">
        <div className="hc-head hc-head--center">
          <div className="hc-kicker">Gift for any occasion</div>
          <h2 className="hc-h2">A piece of heritage, for the moments that matter.</h2>
        </div>
        <div className="hc-grid hc-grid--4">
          {[
            { c: 'hc-tile-ankara', s: 'Birthdays', l: 'Bold, joyful Ankara', to: '/shop?fabric=Ankara' },
            { c: 'hc-tile-asooke', s: 'Weddings', l: 'Aso-ebi & Aso-Oke sets', to: '/shop?fabric=Aso-Oke' },
            { c: 'hc-tile-adire', s: 'For the diaspora', l: 'A piece of home', to: '/shop?fabric=Adire' },
            { c: 'hc-tile-mixed', s: 'Just because', l: 'Accessories & gift cards', to: '/shop' },
          ].map((t) => (
            <Link to={t.to} key={t.s} className={`hc-tile ${t.c}`}>
              <span>{t.s}</span>
              <small>{t.l}</small>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* enquiry */}
    <section className="hc-section hc-section--paper">
      <div className="hc-container">
        <div className="hc-grid hc-grid--2" style={{ gap: '3rem', alignItems: 'start' }}>
          <div>
            <div className="hc-kicker">Custom &amp; aso-ebi</div>
            <h2 className="hc-h2 hc-mt-2">Gifting in bulk, or something custom?</h2>
            <p className="hc-lead hc-mt-3">
              Planning matching aso-ebi for six or more, or a bespoke gift? Tell us what you have
              in mind — occasion, sizes, fabric and timing — and we&apos;ll quote and guide you.
            </p>
            <ul className="hc-check">
              <li><IconifyIcon icon="solar:check-circle-bold" /> Tiered discount on 6+ matching pieces</li>
              <li><IconifyIcon icon="solar:check-circle-bold" /> Custom fit from your measurements (+15% of item price)</li>
              <li><IconifyIcon icon="solar:check-circle-bold" /> Bespoke design from ₦75,000</li>
            </ul>
          </div>
          <div className="hc-form-card">
            <SiteContactForm defaultType="gifting" />
          </div>
        </div>
      </div>
    </section>
  </SiteLayout>
);

export default GiftingPage;
