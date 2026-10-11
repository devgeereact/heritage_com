import { useStoreConfig } from './storeConfig';
import { useSiteConfig } from './siteData';

/**
 * Public business details for the header, footer and contact page. Every
 * field is optional: an empty field is not shown.
 *
 * Source: the business profile in site.php?action=config (Website > Profile).
 * The server already drops empty facts and re-checks every social link (https
 * on the platform's own host, WhatsApp only as wa.me/<digits>, A12). If the
 * server has no site.php yet, the older store.php config is used with the same
 * checks applied here.
 */
const SOCIALS = {
  instagram: { label: 'Instagram', hosts: ['instagram.com'] },
  facebook: { label: 'Facebook', hosts: ['facebook.com', 'fb.com'] },
  tiktok: { label: 'TikTok', hosts: ['tiktok.com'] },
  x: { label: 'X', hosts: ['x.com', 'twitter.com'] },
  youtube: { label: 'YouTube', hosts: ['youtube.com', 'youtu.be'] },
  linkedin: { label: 'LinkedIn', hosts: ['linkedin.com'] },
  whatsapp: { label: 'WhatsApp', hosts: ['wa.me'] },
};

const hostOk = (url, hosts) => {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.replace(/^www\./, '');
    return hosts.some((d) => h === d || h.endsWith(`.${d}`));
  } catch { return false; }
};

const social = (platform, url) => {
  const d = SOCIALS[platform];
  return d && hostOk(url, d.hosts) ? { key: platform, label: d.label, icon: platform, url } : null;
};

/** wa.me link from a WhatsApp URL or number; empty when it is not usable. */
const whatsappUrl = (v) => {
  const digits = String(v || '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return '';
  return `https://wa.me/${digits}`;
};

/** From site.php config (already checked on the server). */
export const businessFromSite = (cfg) => {
  const b = cfg?.business || {};
  return {
    name: b.name || 'Herit Clothing',
    area: b.area || '',
    hours: b.hours_text || '',
    address: b.address || '',
    phone: b.phone || '',
    whatsapp: b.whatsapp_url || '',
    email: b.email || '',
    socials: (cfg?.socials || []).map((s) => social(s.platform, s.url)).filter(Boolean)
      .filter((s) => s.key !== 'whatsapp' || s.url !== b.whatsapp_url),
  };
};

/** From the older store.php config, with the same link checks. */
export const businessFromStore = (cfg) => {
  const socials = cfg?.socials || {};
  return {
    name: (cfg?.store_name || '').trim() || 'Herit Clothing',
    area: (cfg?.area || '').trim(),
    hours: (cfg?.hours || '').trim(),
    address: '',
    phone: (cfg?.phone || '').trim(),
    whatsapp: whatsappUrl(cfg?.whatsapp || socials.whatsapp),
    email: (cfg?.email || '').trim(),
    socials: Object.keys(SOCIALS).filter((k) => k !== 'whatsapp')
      .map((k) => social(k, String(socials[k] || (k === 'x' ? socials.twitter : '') || '').trim()))
      .filter(Boolean),
  };
};

/** Business details for public pages; empty fields until the config arrives. */
export const useBusiness = () => {
  const site = useSiteConfig();
  const store = useStoreConfig();
  if (site && !site.failed) return businessFromSite(site);
  if (site?.failed && store) return businessFromStore(store);
  return businessFromSite(null);
};
