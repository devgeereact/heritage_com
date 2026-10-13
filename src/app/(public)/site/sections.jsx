/* ============================================================
   Public page sections built from the UI kit (ui/). No counters,
   marquees or logo strips (the home hero slider is the one carousel,
   D-023): every section shows real data or is not rendered at all.
   ============================================================ */
import { Link } from 'react-router-dom';
import { Section, SectionHead } from './ui/Section';
import Button from './ui/Button';
import Icon from './ui/Icon';
import HcImage from './ui/HcImage';

export { SectionHead };

/* Published pieces from the live catalogue (shop only). Hidden when empty. */
export const Lookbook = ({ eyebrow, title, products, formatNgn }) => {
  if (!products?.length) return null;
  return (
    <Section>
      <SectionHead eyebrow={eyebrow} title={title}>
        <p><Link to="/shop" className="hc-card-link">View all pieces <Icon name="arrow-right" /></Link></p>
      </SectionHead>
      <div className="hc-grid hc-grid--4">
        {products.map((p) => (
          <Link key={p.slug} to={`/shop/${p.slug}`} className="hc-product" data-reveal="">
            <div className="hc-tile hc-product-media" />
            <div className="hc-product-body">
              {p.fabric && <span className="hc-product-fab">{p.fabric}</span>}
              <span className="hc-product-name">{p.name}</span>
              <span className="hc-product-price">{formatNgn(p.priceNgn)}</span>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
};

/* Numbered steps with the amber rule that fills as each step is revealed. */
export const ProcessSteps = ({ eyebrow, title, lead, steps, tone }) => (
  <Section tone={tone}>
    <SectionHead eyebrow={eyebrow} title={title} lead={lead} />
    <ol className="hc-steps">
      {steps.map((s) => (
        <li key={s.title} data-reveal="">
          <h3>{s.title}</h3>
          <p>{s.desc}</p>
        </li>
      ))}
    </ol>
  </Section>
);

/* Consented, published testimonials only. Not rendered when there are none. */
export const Testimonials = ({ eyebrow, title, quotes }) => {
  if (!quotes?.length) return null;
  return (
    <Section tone="alt">
      <SectionHead eyebrow={eyebrow} title={title} />
      <div className="hc-grid hc-grid--2">
        {quotes.map((q, i) => (
          <figure key={`${q.name}-${i}`} className="hc-quote" data-reveal="">
            <blockquote>{q.text}</blockquote>
            <figcaption>{[q.name, q.role || q.location].filter(Boolean).join(', ')}</figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
};

/* Published journal posts only. Not rendered when there are none. */
export const JournalGrid = ({ eyebrow, title, posts }) => {
  if (!posts?.length) return null;
  return (
    <Section>
      <SectionHead eyebrow={eyebrow} title={title} />
      <div className="hc-grid hc-grid--3">
        {posts.slice(0, 3).map((p) => (
          <article key={p.slug} className="hc-journal-card" data-reveal="">
            {p.cat && <span className="hc-journal-date">{p.cat}</span>}
            <div className="hc-journal-body">
              {p.date && <span className="hc-journal-date">{p.date}</span>}
              <h3 className="hc-h4"><Link to={p.to || `/journal/${p.slug}`}>{p.title}</Link></h3>
              {p.excerpt && <p>{p.excerpt}</p>}
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
};

/* Closing action: one primary, one secondary, over an optional dimmed photograph. */
export const ClosingAction = ({ eyebrow, title, text, primary, secondary, image }) => (
  <Section className={`hc-section--closing${image?.src ? ' hc-section--closing-media' : ''}`}>
    {image?.src && (
      <div className="hc-closing-media" aria-hidden="true">
        <HcImage {...image} alt="" sizes="100vw" />
      </div>
    )}
    <div className="hc-cta-band" data-reveal="">
      {eyebrow && <p className="hc-eyebrow">{eyebrow}</p>}
      <h2 className="hc-h2">{title}</h2>
      {text && <p>{text}</p>}
      <div className="hc-cta-actions">
        {primary && <Button to={primary.to} iconEnd="arrow-right">{primary.label}</Button>}
        {secondary && <Button to={secondary.to} variant="secondary">{secondary.label}</Button>}
      </div>
    </div>
  </Section>
);
