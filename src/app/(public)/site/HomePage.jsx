import SiteLayout from './SiteLayout';
import { useCatalogue, formatNgn } from './products';
import { useBlog, useTestimonials } from './content';
import { useShopEnabled } from './storeConfig';
import { useBookingEnabled } from './bookingConfig';
import Hero from './ui/Hero';
import { Section, SectionHead } from './ui/Section';
import { Card } from './ui/Card';
import { Lookbook, ProcessSteps, Testimonials, JournalGrid, ClosingAction } from './sections';

// Page copy is interim: the CMS and the owner's approved wording replace it
// (docs/CONTENT.md). Nothing here states numbers, people, offers or reach
// that the owner has not confirmed (A07).
const SERVICES = [
  { title: 'Made to measure', desc: 'Your fabric or ours, cut to your measurements and fitted before it is finished.', to: '/contact', cta: 'Request a fitting' },
  { title: 'Group and family orders', desc: 'Matching pieces for weddings and celebrations, planned around your date.', to: '/contact', cta: 'Ask about a group order' },
  { title: 'Ready to wear', desc: 'Pieces in heritage fabrics, when they are in stock.', to: '/shop', cta: 'See the pieces', shop: true },
  { title: 'Gifting', desc: 'A piece chosen and wrapped for someone else.', to: '/gifting', cta: 'Explore gifting', shop: true },
];

const STEPS = [
  { title: 'Discuss', desc: 'Tell us what you want to make, for which occasion and by when.' },
  { title: 'Measure', desc: 'We take your measurements at an agreed appointment.' },
  { title: 'Agree the quote', desc: 'You see the price and the timing before any cutting starts.' },
  { title: 'Sew and fit', desc: 'The piece is made and fitted, with adjustments where needed.' },
  { title: 'Collect or deliver', desc: 'Collect it, or arrange delivery.' },
];

const HomePage = () => {
  const { products } = useCatalogue();
  const shopOn = useShopEnabled();
  const bookOn = useBookingEnabled();
  const quotes = useTestimonials();
  const journal = useBlog(3);
  const featured = [...products].sort((a, b) => (b.premium ? 1 : 0) - (a.premium ? 1 : 0)).slice(0, 4);
  const primary = bookOn
    ? { to: '/book', label: 'Book an appointment' }
    : { to: '/contact', label: 'Request an appointment' };

  return (
    <SiteLayout>
      <Hero
        eyebrow="Herit Clothing, Lagos"
        title="Heritage, tailored for now."
        lead="Clothing in heritage fabrics, cut to fit the way you live. Tell us what you want to make and we will talk through the fabric, fit and finish before any work begins."
        primary={primary}
        secondary={{ to: '/track', label: 'Track your job' }}
      />

      <Section tone="alt">
        <SectionHead eyebrow="What we make" title="Made with care, one piece at a time." />
        <div className="hc-grid hc-grid--2">
          {SERVICES.filter((s) => shopOn || !s.shop).map((s) => (
            <Card key={s.title} title={s.title} to={s.to} linkLabel={s.cta}>{s.desc}</Card>
          ))}
        </div>
      </Section>

      <ProcessSteps
        eyebrow="How it works"
        title="From first conversation to the finished piece."
        steps={STEPS}
      />

      {shopOn && (
        <Lookbook eyebrow="Ready to wear" title="In stock now." products={featured} formatNgn={formatNgn} />
      )}

      <Testimonials eyebrow="In their words" title="What clients say." quotes={quotes} />

      <JournalGrid eyebrow="Journal" title="Notes from the workroom." posts={journal} />

      <ClosingAction
        title="Ready to start?"
        text="Send a short note about what you want to make. We reply with the next step."
        primary={primary}
        secondary={{ to: '/about', label: 'About Herit' }}
      />
    </SiteLayout>
  );
};

export default HomePage;
