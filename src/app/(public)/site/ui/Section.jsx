import EditLink from './EditLink'

/**
 * Page section and its heading block. `tone="alt"` uses the raised ink
 * surface; `tone="paper"` is a warm ivory band (its tokens switch to the
 * light palette). `edit` ({to, label}) adds the staff-only Edit control
 * (EditLink) linking to that section's editor. The heading block reveals on first view and draws the
 * amber measure line beside the eyebrow.
 */
export const Section = ({ tone, tight, id, className = '', labelledBy, edit, children, ...rest }) => (
  <section
    id={id}
    aria-labelledby={labelledBy}
    className={[
      'hc-section',
      tone === 'alt' && 'hc-section--alt',
      tone === 'paper' && 'hc-paper hc-section--ivory',
      tight && 'hc-section--tight',
      edit && 'hc-edit-host',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    {...rest}>
    {edit && <EditLink to={edit.to} label={edit.label} />}
    <div className="hc-container">{children}</div>
  </section>
)

/**
 * Heading block. Section headings (h2) with a lead or links use the split
 * layout from the approved prototype (D-023): eyebrow and title on the left,
 * the lead, links and filters on the right, aligned to the bottom. Page
 * titles (h1), centred heads and `split={false}` stay stacked.
 */
export const SectionHead = ({ eyebrow, title, lead, center, as: H = 'h2', id, split, children }) => {
  const isSplit = split ?? (H !== 'h1' && !center && !!(lead || children))
  const heading = (
    <>
      {eyebrow && <p className="hc-eyebrow">{eyebrow}</p>}
      <H id={id} className={H === 'h1' ? 'hc-h1' : 'hc-h2'}>
        {title}
      </H>
    </>
  )
  if (isSplit) {
    return (
      <div className="hc-head hc-head--split" data-reveal="">
        <div className="hc-head-main">{heading}</div>
        <div className="hc-head-side">
          {lead && <p className="hc-lead">{lead}</p>}
          {children}
        </div>
      </div>
    )
  }
  return (
    <div className={`hc-head ${center ? 'hc-head--center' : ''}`} data-reveal="">
      {heading}
      {lead && <p className="hc-lead">{lead}</p>}
      {children}
    </div>
  )
}

export default Section
