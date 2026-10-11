import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Form, Nav, Spinner } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageHeader from '@/components/herit/PageHeader';
import LoadError from '@/components/herit/LoadError';
import { ApptChip } from '@/components/herit/StatusChip';
import heritApi from '@/helpers/heritApi';
import { useAuthContext } from '@/context/useAuthContext';
import { APPT_TYPE_LABELS, addDays, fmtDay, fmtTime, lagosToday, lagosYmd, weekStart } from '@/helpers/format';
import NewAppointmentModal from './components/NewAppointmentModal';
import AppointmentModal from './components/AppointmentModal';
import RequestsQueue from './components/RequestsQueue';
import BlocksPanel from './components/BlocksPanel';

const OWNER = ['super_admin', 'admin', 'manager'];
const ACTIVE = ['requested', 'confirmed', 'completed', 'no_show'];
const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

/**
 * Appointments: a phone-first day or week list with a week strip, the request
 * queue, and blocked time. Working hours live in Settings. Every time is Lagos.
 */
const AppointmentsPage = () => {
  const { user } = useAuthContext();
  const isOwner = OWNER.includes(user?.role);
  const [params, setParams] = useSearchParams();
  const tabs = ['schedule', ...(isOwner ? ['requests'] : []), 'blocked'];
  const tab = tabs.includes(params.get('tab')) ? params.get('tab') : 'schedule';
  const date = isYmd(params.get('date')) ? params.get('date') : lagosToday();
  const view = params.get('view') === 'week' ? 'week' : 'day';
  const monday = weekStart(date);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);

  const [items, setItems] = useState(null);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(Number(params.get('id')) || null);
  const [notice, setNotice] = useState('');

  const setParam = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    setParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, req] = await Promise.all([
        heritApi.appointments.list({ from: monday, to: addDays(monday, 6) }),
        isOwner ? heritApi.appointments.requests() : Promise.resolve({ items: [] }),
      ]);
      setItems(list.items || []);
      setRequests(req.items || []);
    } catch (e) { setError(e); }
  }, [monday, isOwner]);
  useEffect(() => { load(); }, [load]);

  const changed = (text) => { setNotice(text || ''); load(); };

  const shown = (items || []).filter((a) => showAll || ACTIVE.includes(a.status));
  const byDay = (d) => shown.filter((a) => lagosYmd(a.starts_at_local) === d)
    .sort((x, y) => (y.all_day - x.all_day) || x.starts_at_local.localeCompare(y.starts_at_local));
  const listDays = view === 'week' ? days : [date];
  const today = lagosToday();

  const Row = ({ a }) => (
    <button type="button" className="hd-row w-100 text-start bg-transparent border-0 border-top" onClick={() => setOpenId(a.id)}>
      <span className="tnum fw-semibold flex-none" style={{ minWidth: '4.5rem' }}>{a.all_day ? 'All day' : fmtTime(a.starts_at_local)}</span>
      <span className="hd-row-main">
        <span className="hd-row-title d-block text-truncate">{APPT_TYPE_LABELS[a.type] || a.type}{a.client_name || a.contact_name ? ` · ${a.client_name || a.contact_name}` : ''}</span>
        <span className="hd-row-sub d-block text-truncate">{a.all_day ? 'Whole day' : `until ${fmtTime(a.ends_at_local)}`}{a.job_code ? ` · ${a.job_code}` : ''}</span>
      </span>
      <ApptChip status={a.status} />
      <IconifyIcon icon="solar:alt-arrow-right-linear" aria-hidden="true" className="text-muted flex-none" />
    </button>
  );

  return (
    <div className="hd">
      <PageTitle title="Appointments" />
      <PageHeader
        title="Appointments"
        subtitle={isOwner ? <>Times are Lagos time. Working hours and online requests are set in <Link to="/settings#availability">Settings</Link>.</> : 'Times are Lagos time.'}
        actions={isOwner ? (
          <Button variant="primary" onClick={() => setCreating(true)}>
            <IconifyIcon icon="solar:add-circle-bold" className="me-1" aria-hidden="true" /> Book appointment
          </Button>
        ) : null}
      />
      {notice && <Alert variant="success" role="status" dismissible onClose={() => setNotice('')}>{notice}</Alert>}

      <Nav variant="tabs" className="mb-3" activeKey={tab} onSelect={(k) => setParam({ tab: k === 'schedule' ? null : k })} role="tablist">
        <Nav.Item><Nav.Link eventKey="schedule" role="tab" aria-selected={tab === 'schedule'}>Schedule</Nav.Link></Nav.Item>
        {isOwner && (
          <Nav.Item>
            <Nav.Link eventKey="requests" role="tab" aria-selected={tab === 'requests'}>
              Requests{requests.length ? <span className="hd-count ms-2" aria-label={`${requests.length} waiting`}>{requests.length}</span> : ''}
            </Nav.Link>
          </Nav.Item>
        )}
        <Nav.Item><Nav.Link eventKey="blocked" role="tab" aria-selected={tab === 'blocked'}>Blocked time</Nav.Link></Nav.Item>
      </Nav>

      {error && <LoadError what="appointments" error={error} onRetry={load} />}

      {tab === 'schedule' && (
        <>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <div className="d-flex gap-2">
              <Button variant="outline-secondary" aria-label="Previous week" onClick={() => setParam({ date: addDays(date, -7) })}><IconifyIcon icon="solar:alt-arrow-left-linear" /></Button>
              <Button variant="outline-secondary" onClick={() => setParam({ date: null })} disabled={date === today}>Today</Button>
              <Button variant="outline-secondary" aria-label="Next week" onClick={() => setParam({ date: addDays(date, 7) })}><IconifyIcon icon="solar:alt-arrow-right-linear" /></Button>
            </div>
            <div className="hd-tabs" role="group" aria-label="View">
              <Button variant="outline-secondary" className={view === 'day' ? 'active' : ''} aria-pressed={view === 'day'} onClick={() => setParam({ view: null })}>Day</Button>
              <Button variant="outline-secondary" className={view === 'week' ? 'active' : ''} aria-pressed={view === 'week'} onClick={() => setParam({ view: 'week' })}>Week</Button>
            </div>
          </div>

          <div className="hd-week mb-3" role="group" aria-label="Choose a day">
            {days.map((d) => {
              const n = byDay(d).length;
              const [wd, dd] = fmtDay(d).split(' ');
              return (
                <button key={d} type="button" onClick={() => setParam({ date: d === today ? null : d, view: null })}
                  className={`hd-week-day ${d === date && view === 'day' ? 'is-active' : ''} ${d === today ? 'is-today' : ''}`}
                  aria-pressed={d === date && view === 'day'} aria-label={`${fmtDay(d)}${d === today ? ', today' : ''}, ${n} ${n === 1 ? 'appointment' : 'appointments'}`}>
                  <span className="small">{wd}</span>
                  <span className="fw-bold">{dd}</span>
                  <span className="hd-week-dot small">{n || ''}</span>
                </button>
              );
            })}
          </div>

          <Form.Check type="switch" id="ap-all" className="mb-2" label="Show cancelled and expired" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />

          {!items && !error && <div className="text-center py-5"><Spinner role="status" /></div>}
          {items && listDays.map((d) => {
            const list = byDay(d);
            return (
              <Card key={d} className="hd-card mb-3" as="section" aria-labelledby={`day-${d}`}>
                <Card.Header className="py-2 d-flex justify-content-between align-items-center">
                  <h2 id={`day-${d}`} className="h6 mb-0">{fmtDay(d, { withYear: view === 'day' })}{d === today ? ' · Today' : ''}</h2>
                  <span className="hd-count" aria-label={`${list.length} appointments`}>{list.length}</span>
                </Card.Header>
                {list.length === 0 ? (
                  <Card.Body className="text-muted py-3">
                    Nothing booked.{isOwner && view === 'day' && <> <Button variant="link" className="p-0 align-baseline" onClick={() => setCreating(true)}>Book an appointment</Button>.</>}
                  </Card.Body>
                ) : list.map((a) => <Row key={a.id} a={a} />)}
              </Card>
            );
          })}
        </>
      )}

      {tab === 'requests' && isOwner && items && <RequestsQueue items={requests} onOpen={setOpenId} onChanged={changed} />}
      {tab === 'blocked' && <BlocksPanel isOwner={isOwner} />}

      <NewAppointmentModal show={creating} onHide={() => setCreating(false)}
        onCreated={(a) => { changed('Appointment booked'); if (a?.starts_at_local) setParam({ date: lagosYmd(a.starts_at_local), tab: null, view: null }); }} />
      <AppointmentModal id={openId} show={!!openId} isOwner={isOwner} onHide={() => { setOpenId(null); setParam({ id: null }); }} onChanged={changed} />
    </div>
  );
};

export default AppointmentsPage;
