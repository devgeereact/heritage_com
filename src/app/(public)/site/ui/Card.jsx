import { Link } from 'react-router-dom'
import Icon from './Icon'
import HcImage from './HcImage'

/** Flat card on the light-ash surface. No shadows. */
export const Card = ({ title, children, to, linkLabel, as = 'h3', className = '' }) => {
  const H = as
  return (
    <div className={`hc-card ${className}`.trim()} data-reveal="">
      {title && <H className="hc-card-title">{title}</H>}
      {children && <div className="hc-card-desc">{children}</div>}
      {to && linkLabel && (
        <Link to={to} className="hc-card-link">
          {linkLabel} <Icon name="arrow-right" />
        </Link>
      )}
    </div>
  )
}

/**
 * Service: 4:5 image on top, serif title, summary and a footer row with the
 * link label and an arrow. The whole card is one link when `to` is given;
 * cards in a row share the same height and footer line.
 */
export const ServiceCard = ({ image, title, summary, to, linkLabel = 'View service' }) => {
  const body = (
    <>
      <span className="hc-service-card-media-wrap">
        {image ? <HcImage {...image} ratio="4 / 5" className="hc-service-card-media" /> : <span className="hc-service-card-media hc-service-card-media--empty" aria-hidden="true" />}
      </span>
      <span className="hc-service-card-body">
        <h3 className="hc-service-card-title">{title}</h3>
        {summary && <p>{summary}</p>}
        {to && (
          <span className="hc-service-card-foot">
            {linkLabel} <Icon name="arrow-right" />
          </span>
        )}
      </span>
    </>
  )
  return to
    ? <Link to={to} className="hc-service-card" data-reveal="">{body}</Link>
    : <article className="hc-service-card" data-reveal="">{body}</article>
}

/** Finished work: 4:5 photograph with the title and the fabric or fit line over a soft scrim. The whole card is one link. */
export const WorkCard = ({ image, title, meta, to }) => (
  <Link to={to} className={`hc-work-card${image ? ' hc-work-card--media' : ''}`} data-reveal="">
    {image && <HcImage {...image} ratio="4 / 5" className="hc-work-card-media" />}
    <span className="hc-work-card-cap">
      {meta && <span className="hc-work-card-meta">{meta}</span>}
      <span className="hc-work-card-title">{title}</span>
    </span>
  </Link>
)

export default Card
