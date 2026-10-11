import { Link } from 'react-router-dom';
import Icon from './Icon';
import HcImage from './HcImage';

/** Flat card on the light-ash surface. No shadows. */
export const Card = ({ title, children, to, linkLabel, as: H = 'h3', className = '' }) => (
  <div className={`hc-card ${className}`.trim()} data-reveal="">
    {title && <H className="hc-card-title">{title}</H>}
    {children && <div className="hc-card-desc">{children}</div>}
    {to && linkLabel && (
      <Link to={to} className="hc-card-link">{linkLabel} <Icon name="arrow-right" /></Link>
    )}
  </div>
);

/** Service: 3:2 image, serif title, summary, quiet "View service" link. */
export const ServiceCard = ({ image, title, summary, to, linkLabel = 'View service' }) => (
  <article className="hc-service-card" data-reveal="">
    {image && <HcImage {...image} ratio="3 / 2" className="hc-service-card-media" />}
    <h3 className="hc-service-card-title">{title}</h3>
    {summary && <p>{summary}</p>}
    {to && <Link to={to} className="hc-card-link">{linkLabel} <Icon name="arrow-right" /></Link>}
  </article>
);

/** Finished work: 4:5 image, title, muted fabric or fit line. The whole card is one link. */
export const WorkCard = ({ image, title, meta, to }) => (
  <Link to={to} className="hc-work-card" data-reveal="">
    {image && <HcImage {...image} ratio="4 / 5" className="hc-work-card-media" />}
    <span className="hc-work-card-title">{title}</span>
    {meta && <span className="hc-work-card-meta">{meta}</span>}
  </Link>
);

export default Card;
