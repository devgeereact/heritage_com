import { Form } from 'react-bootstrap';
import SlotPicker from '@/components/herit/SlotPicker';
import { fmtWhen, lagosLocal } from '@/helpers/format';

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

/**
 * Choose when: a free time from the slot list, a time typed by hand (which may
 * clash and then needs an override reason), or a whole day (fittings).
 */
const TimeChooser = ({ type, value, onChange, idPrefix, error, allowAllDay = true }) => {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <fieldset>
      <legend className="form-label fs-6">When <span className="text-muted fw-normal">(Lagos time)</span></legend>
      <div className="d-flex flex-wrap gap-3 mb-2">
        <Form.Check type="radio" id={`${idPrefix}-m-slot`} name={`${idPrefix}-mode`} label="Free time" checked={value.mode === 'slot'} onChange={() => set({ mode: 'slot' })} />
        <Form.Check type="radio" id={`${idPrefix}-m-manual`} name={`${idPrefix}-mode`} label="Enter a time" checked={value.mode === 'manual'} onChange={() => set({ mode: 'manual' })} />
        {allowAllDay && <Form.Check type="radio" id={`${idPrefix}-m-day`} name={`${idPrefix}-mode`} label="All day" checked={value.mode === 'all_day'} onChange={() => set({ mode: 'all_day' })} />}
      </div>
      {value.mode === 'slot' && (
        <>
          <SlotPicker type={type} value={value.slot?.start} onPick={(slot) => set({ slot })} />
          {value.slot && <div className="small mt-1" role="status">Chosen: <strong>{fmtWhen(value.slot.start)}</strong></div>}
        </>
      )}
      {value.mode !== 'slot' && (
        <div className="d-flex flex-wrap gap-2">
          <Form.Group controlId={`${idPrefix}-date`}>
            <Form.Label>Date</Form.Label>
            <Form.Control type="date" value={value.date} onChange={(e) => set({ date: e.target.value })} isInvalid={!!error} />
          </Form.Group>
          {value.mode === 'manual' && (
            <Form.Group controlId={`${idPrefix}-time`}>
              <Form.Label>Start time</Form.Label>
              <Form.Control type="time" step={900} value={value.time} onChange={(e) => set({ time: e.target.value })} isInvalid={!!error} />
            </Form.Group>
          )}
        </div>
      )}
      {error && <div className="text-danger small mt-1">{error}</div>}
    </fieldset>
  );
};

export default TimeChooser;
