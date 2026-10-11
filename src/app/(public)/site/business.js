import { createContext, useContext } from 'react';
import { useStoreConfig } from './storeConfig';

/**
 * Public business details for the header, footer and contact page.
 * Every field is optional: an empty field is simply not shown. Today they
 * come from store.php?action=config (store name and the socials saved in
 * Settings); the CMS business profile will provide them through
 * <BusinessContext.Provider value={...}> without changing the components.
 *
 * Social links are shown only when the saved URL is https and on the
 * platform's own domain (no fallbacks to platform home pages, A12).
 */
export const BusinessContext = createContext(null);

const SOCIAL_HOSTS = {
  instagram: { label: 'Instagram', hosts: ['instagram.com'] },
  facebook: { label: 'Facebook', hosts: ['facebook.com', 'fb.com'] },
  tiktok: { label: 'TikTok', hosts: ['tiktok.com'] },
  linkedin: { label: 'LinkedIn', hosts: ['linkedin.com'] },
  youtube: { label: 'YouTube', hosts: ['youtube.com', 'youtu.be'] },
  twitter: { label: 'X', hosts: ['x.com', 'twitter.com'], icon: 'x' },
};

const hostOk = (url, hosts) => {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.replace(/^www\./, '');
    return hosts.some((d) => h === d || h.endsWith(`.${d}`));
  } catch { return false; }
};

/** wa.me link from a WhatsApp URL or number; empty when it is not usable. */
const whatsappUrl = (v) => {
  const s = String(v || '').trim();
  if (!s) return '';
  if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(s)) {
    const digits = s.replace(/\D/g, '');
    return digits.length >= 8 ? s : '';
  }
  const digits = s.replace(/\D/g, '');
  return digits.length >= 8 ? `https://wa.me/${digits}` : '';
};

export const verifiedSocials = (socials) =>
  Object.entries(SOCIAL_HOSTS)
    .map(([key, d]) => ({ key, label: d.label, icon: d.icon || key, url: String(socials?.[key] || '').trim() }))
    .filter((s) => s.url && hostOk(s.url, SOCIAL_HOSTS[s.key].hosts));

export const businessFromConfig = (cfg) => ({
  name: (cfg?.store_name || '').trim() || 'Herit Clothing',
  area: (cfg?.area || '').trim(),
  hours: (cfg?.hours || '').trim(),
  phone: (cfg?.phone || '').trim(),
  whatsapp: whatsappUrl(cfg?.whatsapp || cfg?.socials?.whatsapp),
  email: (cfg?.email || '').trim(),
  socials: verifiedSocials(cfg?.socials),
});

/** Business details from context when provided, else from the store config. */
export const useBusiness = () => {
  const provided = useContext(BusinessContext);
  const cfg = useStoreConfig();
  return provided || businessFromConfig(cfg);
};
