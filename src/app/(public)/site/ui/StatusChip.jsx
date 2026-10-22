import Icon from './Icon';

const TONE_ICON = { success: 'check-circle', warning: 'clock', danger: 'alert', pending: 'circle' };

/** Status as text plus icon on its tint pair, never colour alone. */
const StatusChip = ({ tone = 'pending', icon, children }) => (
  <span className={`hc-status hc-status--${tone}`}>
    <Icon name={icon || TONE_ICON[tone] || 'circle'} size="1em" />
    <span>{children}</span>
  </span>
);

export default StatusChip;
