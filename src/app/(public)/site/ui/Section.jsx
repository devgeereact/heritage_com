/**
 * Page section and its heading block. `tone="alt"` uses the light-ash
 * surface. The heading block reveals on first view and draws the 48px amber
 * measure line under the eyebrow.
 */
export const Section = ({ tone, tight, id, className = '', labelledBy, children, ...rest }) => (
  <section
    id={id}
    aria-labelledby={labelledBy}
    className={['hc-section', tone === 'alt' && 'hc-section--alt', tight && 'hc-section--tight', className].filter(Boolean).join(' ')}
    {...rest}
  >
    <div className="hc-container">{children}</div>
  </section>
);

export const SectionHead = ({ eyebrow, title, lead, center, as: H = 'h2', id, children }) => (
  <div className={`hc-head ${center ? 'hc-head--center' : ''}`} data-reveal="">
    {eyebrow && <p className="hc-eyebrow">{eyebrow}</p>}
    <H id={id} className={H === 'h1' ? 'hc-h1' : 'hc-h2'}>{title}</H>
    {lead && <p className="hc-lead">{lead}</p>}
    {children}
  </div>
);

export default Section;
