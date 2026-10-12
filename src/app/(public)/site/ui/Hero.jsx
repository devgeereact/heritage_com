import Button from './Button'
import HcImage from './HcImage'
import Icon from './Icon'

/** Apple-inspired editorial hero (D-026): one message and one CMS image.
 * Content stays readable without an image; there is no autoplay or pointer motion.
 */
const Hero = ({ eyebrow, title, lead, primary, secondary, image, note }) => (
  <section className="hc-hero" aria-labelledby="home-hero-title">
    <div className="hc-container">
      <div className={`hc-hero-card ${image?.src ? 'hc-hero-card--media' : ''}`.trim()}>
        <div className="hc-hero-copy">
          {eyebrow && <p className="hc-hero-eyebrow">{eyebrow}</p>}
          <h1 id="home-hero-title" className="hc-hero-title">{title}</h1>
          {lead && <p className="hc-hero-lead">{lead}</p>}
          <div className="hc-hero-actions hc-actions">
            {primary && <Button to={primary.to}>{primary.label}</Button>}
            {secondary && <Button to={secondary.to} variant="secondary">{secondary.label}</Button>}
          </div>
          {note && <p className="hc-hero-place"><Icon name="map-pin" size="1rem" /> {note}</p>}
        </div>
        {image?.src && (
          <div className="hc-hero-media">
            <HcImage {...image} priority ratio="4 / 5" sizes="(min-width: 1024px) 50vw, 100vw" />
          </div>
        )}
      </div>
    </div>
  </section>
)

export default Hero
