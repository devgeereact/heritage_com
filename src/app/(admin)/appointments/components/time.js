import { lagosLocal } from '@/helpers/format';

// Shared by the appointment forms: clash labels, the chooser's empty state and
// the request fields it produces.
export const PROBLEM_LABELS = {
  outside_hours: 'It is outside working hours.',
  blocked: 'It falls in blocked time (closed or leave).',
  conflict: 'It clashes with another appointment, including the gap between appointments.',
};

/** Empty chooser state. */
export const emptyTime = (mode = 'slot') => ({ mode, slot: null, date: '', time: '' });

/** Request fields for the chosen time, or an error message. */
export const timeBody = (t) => {
  if (t.mode === 'slot') return t.slot ? { start: lagosLocal(t.slot.start) } : { error: 'Choose a free time, or enter one by hand' };
  if (t.mode === 'all_day') return t.date ? { all_day: true, date: t.date } : { error: 'Choose a date' };
  if (!t.date || !t.time) return { error: 'Enter a date and a time' };
  return { start: `${t.date}T${t.time}` };
};
