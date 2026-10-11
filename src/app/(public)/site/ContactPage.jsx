import { useLocation } from 'react-router-dom';
import heritApi from '@/helpers/heritApi';
import SiteLayout from './SiteLayout';
import SiteContactForm from './SiteContactForm';
import { useBusiness } from './business';
import { useShopEnabled } from './storeConfig';
import { useSiteConfig, useSiteResource, previewItem, clip, loadSiteConfig } from './siteData';
import { Section } from './ui/Section';
import Icon from './ui/Icon';
import { PageHead, Rich } from './cmsBlocks';

const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;

// ?type= values the site links use, mapped to form choices.
const TYPE_PARAM = { fitting: 'fitting', company: 'company', general: 'general', bespoke: 'bespoke', order: 'order', gifting: 'gifting' };

const load = async (preview, serviceSlug) => {
  const cfg = await loadSiteConfig();
  const [page, service] = await Promise.all([
    preview ? previewItem('page', { key: 'contact' })
      : (cfg.pages || []).includes('contact') ? heritApi.site.page('contact').then((r) => r?.page || null).catch(() => null) : null,
    serviceSlug ? heritApi.site.service(serviceSlug).then((r) => r?.service || null).catch(() => null) : null,
  ]);
  return { page, service };
};

/**
 * Contact (BUILD-SPEC 4.7). The owner's contact page when published (else a
 * plain heading), each channel only when set in the Website profile, and the
 * enquiry form, which always works. `?type=fitting|company|general` preselects
 * the subject; `?service=<slug>` names the service in the form.
 */
const ContactPage = () => {
  const { search } = useLocation();
  const q = new URLSearchParams(search);
  const type = TYPE_PARAM[q.get('type')] || 'general';
  const serviceSlug = q.get('service') || '';
  const b = useBusiness();
  const cfg = useSiteConfig();
  const shopOn = useShopEnabled();
  const res = useSiteResource(() => load(false, serviceSlug), () => load(true, serviceSlug), [serviceSlug]);
  const page = res.data?.page;
  const service = res.data?.service;

  const channels = [
    b.phone && { icon: 'phone', label: 'Phone', value: b.phone, href: telHref(b.phone) },
    b.whatsapp && { icon: 'whatsapp', label: 'WhatsApp', value: 'Send a WhatsApp message', href: b.whatsapp, external: true },
    b.email && { icon: 'mail', label: 'Email', value: b.email, href: `mailto:${b.email}` },
    b.address && { icon: 'map-pin', label: 'Address', value: b.address },
    !b.address && b.area && { icon: 'map-pin', label: 'Where I work', value: b.area },
    b.hours && { icon: 'clock', label: 'Hours', value: b.hours },
  ].filter(Boolean);

  return (
    <SiteLayout
      title={page?.seo_title || 'Contact'}
      seo={{ description: page?.seo_description || clip(page?.intro), jsonld: cfg?.jsonld || undefined }}
    >
      <PageHead
        eyebrow="Contact"
        title={page?.headline || 'Tell me what you need'}
        intro={page?.intro || 'Send a short note about what you want to make and I will reply with the next step.'}
        hero={page?.hero}
      />

      <Section tone="alt">
        <div className={channels.length ? 'hc-split' : ''}>
          {channels.length > 0 && (
            <div data-reveal="">
              <h2 className="hc-h3">Other ways to reach me</h2>
              <ul className="hc-contact-list hc-mt-3">
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
              {page?.body && <div className="hc-mt-3"><Rich html={page.body} /></div>}
            </div>
          )}
          <div className="hc-form-card hc-form-wrap" id="enquiry">
            <h2 className="hc-h3">Send an enquiry</h2>
            <div className="hc-mt-3">
              {res.status === 'loading' && serviceSlug
                ? <p className="hc-state" role="status">Loading…</p>
                : (
                  <SiteContactForm
                    key={`${type}-${service?.slug || ''}`}
                    defaultType={type}
                    defaultInterest={service?.title || ''}
                    shopOn={shopOn}
                  />
                )}
            </div>
          </div>
        </div>
        {!channels.length && page?.body && <div className="hc-mt-3"><Rich html={page.body} /></div>}
      </Section>
    </SiteLayout>
  );
};

export default ContactPage;
