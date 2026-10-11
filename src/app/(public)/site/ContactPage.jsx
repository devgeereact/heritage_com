import { Link } from 'react-router-dom';
import SiteLayout from './SiteLayout';
import SiteContactForm from './SiteContactForm';
import { useBusiness } from './business';
import { Section } from './ui/Section';
import Icon from './ui/Icon';

const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;

// Channels, hours and area come from the business details (store config now,
// the CMS profile later); anything not set is not shown. The invented map,
// shipping table and FAQ answers are gone until the owner confirms the real
// location and policies (A07).
const ContactPage = () => {
  const b = useBusiness();
  const channels = [
    b.phone && { icon: 'phone', label: 'Phone', value: b.phone, href: telHref(b.phone) },
    b.whatsapp && { icon: 'whatsapp', label: 'WhatsApp', value: 'Message us on WhatsApp', href: b.whatsapp, external: true },
    b.email && { icon: 'mail', label: 'Email', value: b.email, href: `mailto:${b.email}` },
    b.area && { icon: 'map-pin', label: 'Where we work', value: b.area },
    b.hours && { icon: 'clock', label: 'Hours', value: b.hours },
  ].filter(Boolean);

  return (
    <SiteLayout title="Contact">
      <section className="hc-pagehead">
        <div className="hc-container">
          <div className="hc-crumb"><Link to="/">Home</Link> / <span>Contact</span></div>
          <h1 className="hc-h1">Tell us what you need.</h1>
          <p>A question about a piece, a fitting or a group order? Send a short note and we will reply with the next step.</p>
        </div>
      </section>

      <Section>
        <div className={channels.length ? 'hc-split' : ''}>
          {channels.length > 0 && (
            <div data-reveal="">
              <p className="hc-eyebrow">Other ways to reach us</p>
              <ul className="hc-contact-list">
                {channels.map((c) => (
                  <li key={c.label}>
                    <span className="hc-contact-ico"><Icon name={c.icon} /></span>
                    <span>
                      <b>{c.label}</b>
                      {c.href
                        ? <a href={c.href} {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{c.value}</a>
                        : c.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="hc-form-card" style={channels.length ? undefined : { maxWidth: '44rem' }}>
            <h2 className="hc-h3">Send an enquiry</h2>
            <div className="hc-mt-3"><SiteContactForm defaultType="general" /></div>
          </div>
        </div>
      </Section>
    </SiteLayout>
  );
};

export default ContactPage;
