import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { APPT_STATUS_LABELS, CHANGE_STATUS_LABELS, ENQUIRY_LABELS, PAYMENT_STATE_LABELS, STAGE_LABELS } from '@/helpers/format';

const ICONS = {
  ok: 'solar:check-circle-bold',
  warn: 'solar:clock-circle-bold',
  bad: 'solar:danger-triangle-bold',
  neutral: 'solar:record-circle-linear',
  ink: 'solar:arrow-right-bold',
};

/** A status as text plus icon plus colour (never colour alone). */
const StatusChip = ({ tone = 'neutral', icon, children, className = '' }) => (
  <span className={`hd-chip hd-chip--${tone} ${className}`}>
    <IconifyIcon icon={icon || ICONS[tone]} aria-hidden="true" />
    <span>{children}</span>
  </span>
);

const STAGE_TONE = {
  quote: 'neutral', confirmed: 'ink', measurements_approved: 'ink', in_production: 'warn', fitting: 'warn',
  quality_check: 'warn', ready: 'ok', handed_over: 'ok', cancelled: 'neutral',
};
export const StageChip = ({ stage, label }) => (
  <StatusChip tone={STAGE_TONE[stage] || 'neutral'}>{label || STAGE_LABELS[stage] || stage}</StatusChip>
);

const PAY_TONE = { unpriced: 'neutral', unpaid: 'bad', part_paid: 'warn', paid: 'ok', credit: 'warn', refunded: 'neutral' };
export const PaymentChip = ({ state }) =>
  state ? <StatusChip tone={PAY_TONE[state] || 'neutral'}>{PAYMENT_STATE_LABELS[state] || state}</StatusChip> : null;

const ENQ_TONE = { new: 'ink', awaiting_reply: 'warn', quote_sent: 'warn', accepted: 'ok', closed: 'neutral' };
export const EnquiryChip = ({ status }) => (
  <StatusChip tone={ENQ_TONE[status] || 'neutral'}>{ENQUIRY_LABELS[status] || status}</StatusChip>
);

const SET_TONE = { approved: 'ok', pending: 'warn', imported_unverified: 'warn', superseded: 'neutral', rejected: 'bad' };
const SET_LABEL = {
  approved: 'Approved', pending: 'Waiting for approval', imported_unverified: 'Imported, unverified',
  superseded: 'Replaced by a newer set', rejected: 'Rejected',
};
export const SetChip = ({ status }) => <StatusChip tone={SET_TONE[status] || 'neutral'}>{SET_LABEL[status] || status}</StatusChip>;

const APPT_TONE = { requested: 'warn', confirmed: 'ok', completed: 'neutral', cancelled: 'neutral', no_show: 'bad', expired: 'neutral' };
export const ApptChip = ({ status }) => (
  <StatusChip tone={APPT_TONE[status] || 'neutral'}>{APPT_STATUS_LABELS[status] || status}</StatusChip>
);

const CHANGE_TONE = { open: 'warn', approved: 'ok', declined: 'bad', withdrawn: 'neutral' };
export const ChangeChip = ({ status }) => (
  <StatusChip tone={CHANGE_TONE[status] || 'neutral'}>{CHANGE_STATUS_LABELS[status] || status}</StatusChip>
);

export default StatusChip;
