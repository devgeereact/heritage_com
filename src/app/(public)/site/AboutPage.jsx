import { Link } from 'react-router-dom';
import SiteLayout from './SiteLayout';
import { useTestimonials } from './content';
import { useBookingEnabled } from './bookingConfig';
import { Section, SectionHead } from './ui/Section';
import { Card } from './ui/Card';
import { ProcessSteps, Testimonials, ClosingAction } from './sections';

// Interim copy until the owner's approved story is published through the CMS
// (docs/CONTENT.md). No staff names, dates, counts or reach claims (A07).
const STANDS = [
  { t: 'Heritage with intent', d: 'Tradition is our starting point, never a costume. We name each fabric and where it comes from.' },
  { t: 'Made for now', d: 'Cultural roots, contemporary cuts: pieces built for real, modern wardrobes.' },
  { t: 'Proudly Lagos', d: 'Made in Lagos, and our roots stay put as we grow.' },
  { t: 'Craft you can feel', d: 'Honest tailoring, fabrics chosen with care, finishing you can feel in the hand.' },
];

const PROCESS = [
  { title: 'Source with respect', desc: 'We choose heritage fabrics with care and respect for their origin and meaning.' },
  { title: 'Design for now', desc: 'Contemporary cuts, with each pattern tailored for a modern, everyday fit.' },
  { title: 'Make and fit', desc: 'Each piece is cut, sewn and fitted, then finished by hand.' },
  { title: 'Hand over with care', desc: 'Collected or delivered in considered packaging, with the story of its fabric.' },
];

const AboutPage = () => {
  const quotes = useTestimonials();
  const bookOn = useBookingEnabled();
  return (
    <SiteLayout title="About">
      <section className="hc-pagehead">
        <div className="hc-container">
          <div className="hc-crumb"><Link to="/">Home</Link> / <span>About</span></div>
          <h1 className="hc-h1">Heritage, tailored for now.</h1>
          <p>Who we are, what we make and how we work.</p>
        </div>
      </section>

      <Section>
        <div className="hc-split">
          <SectionHead eyebrow="Our story" title="Heritage cloth belongs in everyday life." />
          <div data-reveal="">
            <p className="hc-lead">
              Herit Clothing started in Lagos with a simple frustration: the fabrics and prints we grew
              up with, Ankara, Adire and Aso-Oke, were too often saved for special occasions, or treated
              as costume rather than culture.
            </p>
            <p className="hc-mt-3">
              So we make contemporary pieces from traditional cloth, honouring where each fabric comes
              from and tailoring it for a modern fit. We sell online and in person.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="alt">
        <div className="hc-grid hc-grid--2">
          <Card title="Our mission">
            To celebrate African heritage through clothing, fusing traditional fabrics and prints with
            contemporary style.
          </Card>
          <Card title="Our vision">
            Heritage worn with pride every day, by people who want their clothes to carry a story.
          </Card>
        </div>
      </Section>

      <ProcessSteps eyebrow="How we work" title="Roots first, every step." steps={PROCESS} />

      <Section tone="alt">
        <SectionHead eyebrow="What we stand for" title="Four things we do not compromise on." />
        <div className="hc-grid hc-grid--2">
          {STANDS.map((s) => (
            <div key={s.t} className="hc-pillar" data-reveal="">
              <h3 className="hc-h4">{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Testimonials eyebrow="In their words" title="What clients say." quotes={quotes} />

      <ClosingAction
        title="Tell us what you want to make."
        primary={bookOn ? { to: '/book', label: 'Book an appointment' } : { to: '/contact', label: 'Request an appointment' }}
        secondary={bookOn ? { to: '/contact', label: 'Contact us' } : { to: '/track', label: 'Track your job' }}
      />
    </SiteLayout>
  );
};

export default AboutPage;
