import heritApi from '@/helpers/heritApi';
import SiteLayout from './SiteLayout';
import { useSiteResource, previewItem } from './siteData';
import { Section, SectionHead } from './ui/Section';
import { Rich, resourceState } from './cmsBlocks';

const NAMES = { privacy: 'Privacy', terms: 'Terms' };

const dateText = (ymd) => {
  if (!ymd) return '';
  const d = new Date(`${ymd}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? ymd : d.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' });
};

/**
 * Privacy or terms (BUILD-SPEC 4.7): title, effective date in <time> and the
 * body at a readable measure. Publishing is owner-only and refused while any
 * placeholder remains (cms.php). Unpublished: a not-found page and no footer link.
 */
const PolicyPage = ({ policyKey }) => {
  const name = NAMES[policyKey] || 'Policy';
  const res = useSiteResource(
    () => heritApi.site.policy(policyKey).then((r) => r?.policy || null),
    () => previewItem('policy', { key: policyKey }),
    [policyKey],
  );
  const early = resourceState(res, name);
  if (early) return early;
  const p = res.data;

  return (
    <SiteLayout title={p.title || name}>
      <Section>
        <SectionHead as="h1" eyebrow="Policies" title={p.title || name}>
          {p.effective_date && (
            <p className="hc-field-help">Effective from <time dateTime={p.effective_date}>{dateText(p.effective_date)}</time></p>
          )}
        </SectionHead>
        <Rich html={p.body} />
      </Section>
    </SiteLayout>
  );
};

export const PrivacyPage = () => <PolicyPage policyKey="privacy" />;
export const TermsPage = () => <PolicyPage policyKey="terms" />;

export default PolicyPage;
