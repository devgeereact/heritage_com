import { useState } from 'react';
import { Link } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import SiteLayout from './SiteLayout';
import SiteContactForm from './SiteContactForm';

const channels = [
  { icon: 'solar:letter-bold', label: 'Email', value: 'hello@heritclothing.com' },
  { icon: 'mdi:whatsapp', label: 'WhatsApp', value: '+234 ...' },
  { icon: 'solar:map-point-bold', label: 'Visit', value: 'Ajuwon Market, Lagos, Nigeria' },
  { icon: 'mdi:instagram', label: 'Social', value: '@heritclothing' },
];

const shipping = [
  ['Lagos', '1–3 days', 'Free over ₦25,000, else ₦2,500'],
  ['Other Nigerian states', '2–5 days', '₦3,500–5,000'],
  ['West Africa', '5–10 days', 'From $18'],
  ['UK / Europe', '7–14 days', 'From $30'],
  ['US / Canada', '7–14 days', 'From $35'],
  ['Rest of world', '10–21 days', 'From $40'],
];

const faqs = [
  { q: 'How do I know my size?', a: 'Each product page lists fit notes and what the model wears. Unsure between sizes? Message us on WhatsApp before you order and we&apos;ll guide you.' },
  { q: 'What are your returns?', a: '14 days for unworn items in original condition. Made-to-measure pieces are non-returnable unless faulty. See the full Returns Policy for details.' },
  { q: 'Do you ship internationally?', a: 'Yes — worldwide, tracked. International prices exclude import duties and taxes, which are payable on delivery.' },
  { q: 'Can I order matching aso-ebi?', a: 'Yes. We offer tiered discounts on six or more matching pieces. Send us your occasion, sizes and timing for a quote.' },
  { q: 'How do payments work?', a: 'Cards, bank transfer and supported wallets. Naira for local orders; international billed in USD at checkout. Made-to-measure requires a 50% deposit.' },
];

const Faq = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`hc-faq ${open ? 'is-open' : ''}`}>
      <button type="button" className="hc-faq-q" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span>{q}</span>
        <IconifyIcon icon={open ? 'solar:minus-circle-linear' : 'solar:add-circle-linear'} />
      </button>
      {open && <p className="hc-faq-a" dangerouslySetInnerHTML={{ __html: a }} />}
    </div>
  );
};

const ContactPage = () => (
  <SiteLayout title="Contact">
    <section className="hc-pagehead">
      <div className="hc-container">
        <div className="hc-crumb"><Link to="/">Home</Link> / <span>Contact</span></div>
        <h1 className="hc-h1">We&apos;d love to hear from you.</h1>
        <p>Questions about a piece, your order, or a custom request? Reach us any way that suits
          you — we aim to reply within one business day.</p>
      </div>
    </section>

    {/* channels + form */}
    <section className="hc-section">
      <div className="hc-container">
        <div className="hc-grid hc-grid--2" style={{ gap: '3rem', alignItems: 'start' }}>
          <div>
            <div className="hc-kicker">Reach us</div>
            <h2 className="hc-h2 hc-mt-2">Any way that suits you.</h2>
            <ul className="hc-contact-list">
              {channels.map((c) => (
                <li key={c.label}>
                  <span className="hc-contact-ico"><IconifyIcon icon={c.icon} /></span>
                  <span><b>{c.label}</b>{c.value}</span>
                </li>
              ))}
            </ul>
            <div className="hc-quote hc-mt-4">
              <p style={{ fontSize: '1.1rem' }}>“From our corner of Lagos to your doorstep, anywhere.”</p>
              <cite>Open for orders, custom requests &amp; stockist enquiries</cite>
            </div>
          </div>
          <div className="hc-form-card">
            <SiteContactForm defaultType="general" />
          </div>
        </div>
      </div>
    </section>

    {/* map */}
    <section className="hc-section--tight hc-section--paper">
      <div className="hc-container">
        <div className="hc-head" style={{ marginBottom: '1.5rem' }}>
          <div className="hc-kicker">Find us</div>
          <h2 className="hc-h2 hc-mt-2">Ajuwon Market, Lagos.</h2>
        </div>
        <div className="hc-map">
          <iframe
            title="Herit Clothing — Ajuwon Market, Lagos"
            src="https://www.google.com/maps?q=Ajuwon%20Market%2C%20Lagos%2C%20Nigeria&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>

    {/* shipping table */}
    <section className="hc-section">
      <div className="hc-container">
        <div className="hc-head">
          <div className="hc-kicker">Shipping &amp; delivery</div>
          <h2 className="hc-h2">Tracked, near and far.</h2>
          <p className="hc-lead">All parcels are tracked. International prices exclude import
            duties and taxes, which are the customer&apos;s responsibility on delivery.</p>
        </div>
        <table className="hc-table">
          <thead>
            <tr><th>Destination</th><th>Time</th><th>Price</th></tr>
          </thead>
          <tbody>
            {shipping.map((r) => (
              <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td><span className="hc-price">{r[2]}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    {/* FAQ accordion */}
    <section className="hc-section hc-section--paper">
      <div className="hc-container">
        <div className="hc-head hc-head--center">
          <div className="hc-kicker">Good to know</div>
          <h2 className="hc-h2">Frequently asked.</h2>
        </div>
        <div className="hc-faq-list">
          {faqs.map((f) => <Faq key={f.q} {...f} />)}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="hc-section--tight hc-section--crimson">
      <div className="hc-container hc-cta-band">
        <h2 className="hc-h2">Ready to wear your heritage?</h2>
        <div className="hc-cta-actions">
          <Link to="/shop" className="hc-btn hc-btn--light"><IconifyIcon icon="solar:bag-4-bold" /> Shop the collection</Link>
          <Link to="/gifting" className="hc-btn hc-btn--onfill"><IconifyIcon icon="solar:gift-linear" /> Explore gifting</Link>
        </div>
      </div>
    </section>
  </SiteLayout>
);

export default ContactPage;
