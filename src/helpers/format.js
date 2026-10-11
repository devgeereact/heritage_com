// Display helpers shared by the daily-records screens: Naira amounts, Lagos
// dates and plain labels for stages and statuses. Formatting only; the server
// owns every rule.
import { currency } from '@/context/constants';

export const TZ = 'Africa/Lagos';

/** ₦18,500 (kobo shown only when present). Accepts decimal strings from the API. */
export const naira = (v) => {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return `${currency}0`;
  const hasKobo = Math.round(n * 100) % 100 !== 0;
  return `${n < 0 ? '−' : ''}${currency}${Math.abs(n).toLocaleString('en-NG', {
    minimumFractionDigits: hasKobo ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
};

/** Today's date in Lagos as YYYY-MM-DD. */
export const lagosToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

/** A calendar date (YYYY-MM-DD) as "12 May 2026". No timezone shift: it is a date, not a moment. */
export const fmtDate = (ymd, { withYear = true } = {}) => {
  if (!ymd) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd));
  if (!m) return String(ymd);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' });
};

/**
 * A UTC DATETIME from the Phase 2 endpoints ("2026-10-10 14:05:00") shown in
 * Lagos time. The API sends no zone, so "Z" is appended (API-SPEC).
 */
export const fmtUtc = (dt, { time = true } = {}) => {
  if (!dt) return '';
  const iso = String(dt).replace(' ', 'T');
  const d = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return String(dt);
  return d.toLocaleString('en-GB', {
    timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric',
    ...(time ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

/** Whole days from Lagos today to a date (negative when past). */
export const daysFromToday = (ymd) => {
  if (!ymd) return null;
  const a = Date.parse(`${lagosToday()}T00:00:00Z`);
  const b = Date.parse(`${String(ymd).slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
};

export const STAGE_LABELS = {
  quote: 'Quote', confirmed: 'Confirmed', measurements_approved: 'Measurements approved',
  in_production: 'Cutting and sewing', fitting: 'Fitting or adjustment', quality_check: 'Quality check',
  ready: 'Ready', handed_over: 'Collected or delivered', cancelled: 'Cancelled',
};

export const ENQUIRY_LABELS = {
  new: 'New', awaiting_reply: 'Awaiting reply', quote_sent: 'Quote sent', accepted: 'Accepted', closed: 'Closed',
};

/** Mirrors ENQUIRY_TRANSITIONS in php-api/_domain.php; the server's 409 `allowed` list wins. */
export const ENQUIRY_NEXT = {
  new: ['awaiting_reply', 'quote_sent', 'accepted', 'closed'],
  awaiting_reply: ['new', 'quote_sent', 'accepted', 'closed'],
  quote_sent: ['awaiting_reply', 'accepted', 'closed'],
  accepted: ['closed'],
  closed: ['new', 'awaiting_reply'],
};

export const PAYMENT_STATE_LABELS = {
  unpriced: 'No price yet', unpaid: 'Unpaid', part_paid: 'Part paid', paid: 'Paid',
  credit: 'Credit due', refunded: 'Refunded',
};

export const METHOD_LABELS = {
  cash: 'Cash', transfer: 'Bank transfer', pos_card: 'POS or card', gateway: 'Online payment', other: 'Other', unknown: 'Not recorded',
};

export const CHANNEL_LABELS = {
  in_person: 'In person', whatsapp: 'WhatsApp', email: 'Email', phone: 'Phone call', portal: 'Client portal',
};

export const GARMENT_LABELS = {
  agbada: 'Agbada', kaftan: 'Kaftan', senator: 'Senator', suit: 'Suit', shirt: 'Shirt', trouser: 'Trousers', other: 'Other',
};

export const titleCase = (s) => String(s || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** wa.me link from a Nigerian or international phone number. */
export const waLink = (phone) => {
  let d = String(phone || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('0')) d = `234${d.slice(1)}`;
  return `https://wa.me/${d}`;
};

/* ---- Phase 3: appointments, messages, change requests ---------------------- */

export const APPT_TYPE_LABELS = { consultation: 'Consultation', fitting: 'Fitting', collection: 'Collection' };
export const APPT_STATUS_LABELS = {
  requested: 'Requested', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show', expired: 'Expired',
};
export const CHANGE_KIND_LABELS = {
  reschedule: 'Move an appointment', address: 'Delivery address', measurement: 'Measurements', garment: 'Garment change', other: 'Other',
};
export const CHANGE_STATUS_LABELS = { open: 'Waiting for a decision', approved: 'Approved', declined: 'Declined', withdrawn: 'Withdrawn' };
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const WEEKDAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

/** Parse an ISO time with an offset ("2026-10-12T10:00:00+01:00"); null when invalid. */
const parseIso = (iso) => {
  if (!iso) return null;
  const d = new Date(String(iso).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Lagos calendar date (YYYY-MM-DD) of an ISO moment. */
export const lagosYmd = (iso) => {
  const d = parseIso(iso);
  return d ? new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d) : '';
};

/** "10:00" in Lagos time. */
export const fmtTime = (iso) => {
  const d = parseIso(iso);
  return d ? d.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) : '';
};

/** "Mon 12 Oct" (or with the year) for a YYYY-MM-DD date. */
export const fmtDay = (ymd, { withYear = false } = {}) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ''));
  if (!m) return '';
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' });
};

/** "Mon 12 Oct, 10:00" in Lagos time. */
export const fmtWhen = (iso, { allDay = false } = {}) => {
  const ymd = lagosYmd(iso);
  if (!ymd) return '';
  return allDay ? `${fmtDay(ymd)}, all day` : `${fmtDay(ymd)}, ${fmtTime(iso)}`;
};

/** Add whole days to a YYYY-MM-DD date. */
export const addDays = (ymd, n) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd));
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n));
  return d.toISOString().slice(0, 10);
};

/** Monday of the week containing a YYYY-MM-DD date. */
export const weekStart = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd));
  const dow = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay(); // 0 Sunday
  return addDays(ymd, -((dow + 6) % 7));
};

/** Lagos local "YYYY-MM-DDTHH:MM" from an ISO slot start (what the API accepts as `start`). */
export const lagosLocal = (iso) => (lagosYmd(iso) ? `${lagosYmd(iso)}T${fmtTime(iso)}` : '');

/** Group slots [{start, end}] by Lagos day: [{day, slots}] in order. */
export const groupSlotsByDay = (slots = []) => {
  const out = [];
  slots.forEach((s) => {
    const day = lagosYmd(s.start);
    const last = out[out.length - 1];
    if (last && last.day === day) last.slots.push(s);
    else out.push({ day, slots: [s] });
  });
  return out;
};
