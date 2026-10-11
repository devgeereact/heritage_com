import { useCallback, useEffect, useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import { addDays, fmtDay, fmtTime, groupSlotsByDay, lagosToday } from '@/helpers/format';

/**
 * Free times for one appointment type, grouped by Lagos day, from
 * appointments.php?action=slots (the same rules clients get). Picking a time
 * calls onPick(slot). Times are always shown in Lagos time.
 */
const SlotPicker = ({ type, value, onPick, days = 7 }) => {
  const [from, setFrom] = useState(lagosToday());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setData(null); setError('');
    try { setData(await heritApi.appointments.slots(type, from, days)); }
    catch (e) { setError(e.message || 'Could not load free times'); }
  }, [type, from, days]);
  useEffect(() => { load(); }, [load]);

  const groups = groupSlotsByDay(data?.slots || []);
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center gap-2 mb-2 flex-wrap">
        <span className="small text-muted">Free times, Lagos time · {fmtDay(from)} to {fmtDay(addDays(from, days - 1))}</span>
        <span className="d-flex gap-2">
          <Button size="sm" variant="outline-secondary" disabled={from <= lagosToday()} onClick={() => setFrom(addDays(from, -days))}>Earlier</Button>
          <Button size="sm" variant="outline-secondary" onClick={() => setFrom(addDays(from, days))}>Later</Button>
        </span>
      </div>
      {!data && !error && <div className="py-3 text-center"><Spinner size="sm" role="status" /><span className="visually-hidden">Loading free times</span></div>}
      {error && <div className="text-danger small" role="alert">{error} <Button size="sm" variant="link" onClick={load}>Retry</Button></div>}
      {data && data.ready === false && (
        <p className="small text-muted mb-1">Working hours or a duration for this type are not set, so no free times can be suggested. Set them in Settings, or enter a time by hand.</p>
      )}
      {data && data.ready !== false && groups.length === 0 && <p className="small text-muted mb-1">No free times in these days. Try later dates, or enter a time by hand.</p>}
      <div className="hd-slots">
        {groups.map((g) => (
          <div key={g.day} className="mb-2">
            <div className="fw-semibold small mb-1">{fmtDay(g.day)}</div>
            <div className="d-flex flex-wrap gap-2">
              {g.slots.map((s) => (
                <Button key={s.start} size="sm" variant={value === s.start ? 'primary' : 'outline-secondary'} aria-pressed={value === s.start}
                  onClick={() => onPick(s)}>
                  {fmtTime(s.start)}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SlotPicker;
