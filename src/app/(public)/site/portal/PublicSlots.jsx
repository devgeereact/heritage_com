import { useCallback, useEffect, useState } from 'react';
import { addDays, fmtDay, fmtTime, groupSlotsByDay, lagosToday } from '@/helpers/format';

/**
 * Free times grouped by day, in Lagos time, for the public booking page and the
 * portal. `load(from, days)` returns {slots}. `max` limits how far ahead to page.
 */
const PublicSlots = ({ load, value, onPick, days = 7, maxDays = 60, idPrefix = 'ps' }) => {
  const [from, setFrom] = useState(lagosToday());
  const [slots, setSlots] = useState(null);
  const [error, setError] = useState('');

  const fetchSlots = useCallback(async () => {
    setSlots(null); setError('');
    try { setSlots((await load(from, days)).slots || []); }
    catch (e) { setError(e.message || 'We could not load free times. Please try again.'); }
  }, [load, from, days]);
  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const groups = groupSlotsByDay(slots || []);
  const end = addDays(lagosToday(), maxDays);
  return (
    <div>
      <p className="hp-help">All times are Lagos time (WAT). Showing {fmtDay(from)} to {fmtDay(addDays(from, days - 1))}.</p>
      {!slots && !error && <p className="hp-help" role="status">Loading free times…</p>}
      {error && <p className="hp-error" role="alert">{error} <button type="button" className="hp-link" onClick={fetchSlots}>Try again</button></p>}
      {slots && groups.length === 0 && <p className="hp-help">No free times in these days. Try later dates.</p>}
      {groups.map((g) => (
        <fieldset key={g.day} style={{ border: 0, padding: 0, margin: '0 0 1rem' }}>
          <legend className="hp-label" style={{ fontSize: '1rem', marginBottom: '.5rem' }}>{fmtDay(g.day)}</legend>
          <div className="hp-slots">
            {g.slots.map((s) => (
              <button key={s.start} type="button" className="hp-slot" aria-pressed={value === s.start} onClick={() => onPick(s)}
                id={`${idPrefix}-${s.start}`} aria-label={`${fmtDay(g.day)} at ${fmtTime(s.start)}`}>
                {fmtTime(s.start)}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        {from > lagosToday() && <button type="button" className="hp-btn" onClick={() => setFrom(addDays(from, -days))}>Earlier times</button>}
        {addDays(from, days) < end && <button type="button" className="hp-btn" onClick={() => setFrom(addDays(from, days))}>Later times</button>}
      </div>
    </div>
  );
};

export default PublicSlots;
