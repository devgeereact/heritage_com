import { Link } from 'react-router-dom';
import Icon from './Icon';

/**
 * Public button. Variants: primary (amber, ink text), secondary (light ash,
 * ink text), quiet (ink text link). Renders a router Link with `to`, an anchor
 * with `href`, otherwise a <button>. 48px tall, colour-only hover, a short
 * press. Disabled uses aria-disabled so it stays focusable and announced.
 */
const Button = ({ to, href, variant = 'primary', icon, iconEnd, block, disabled, className = '', children, type, onClick, ...rest }) => {
  const cls = ['hc-btn', `hc-btn--${variant}`, block && 'hc-btn--block', className].filter(Boolean).join(' ');
  const body = (
    <>
      {icon && <Icon name={icon} />}
      <span>{children}</span>
      {iconEnd && <Icon name={iconEnd} />}
    </>
  );
  const guard = disabled ? (e) => e.preventDefault() : onClick;
  const a11y = disabled ? { 'aria-disabled': true } : {};
  if (to) return <Link to={to} className={cls} onClick={guard} {...a11y} {...rest}>{body}</Link>;
  if (href) return <a href={href} className={cls} onClick={guard} {...a11y} {...rest}>{body}</a>;
  return <button type={type || 'button'} className={cls} onClick={guard} {...a11y} {...rest}>{body}</button>;
};

/** Up to two actions; stacked full width below 600px. */
export const Actions = ({ center, className = '', children }) => (
  <div className={`hc-actions ${center ? 'hc-actions--center' : ''} ${className}`.trim()}>{children}</div>
);

export default Button;
