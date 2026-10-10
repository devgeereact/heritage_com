import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';
import { useAuthContext } from '@/context/useAuthContext';
import { daysFromToday, fmtDate, GARMENT_LABELS, STAGE_LABELS } from '@/helpers/format';
import LoadError from '@/components/herit/LoadError';
import PageHeader from '@/components/herit/PageHeader';
import StatusChip, { PaymentChip, StageChip } from '@/components/herit/StatusChip';
import NewOrderModal from './components/NewOrderModal';

const OWNER = ['super_admin', 'admin', 'manager'];
const OPEN = (j) => !['handed_over', 'cancelled'].includes(j.job_stage);

/** Jobs: active work with promised date, event date and next action. Filters live in the URL. */
const JobsPage = () => {
  const { user } = useAuthContext();
  const isOwner = OWNER.includes(user?.role);
  const [params, setParams] = useSearchParams();
  const stage = params.get('stage') || 'open';
  const due = params.get('due') || 'any';
  const next = params.get('next') === 'due';
  const review = params.get('review') === '1';
  const [q, setQ] = useState('');
  const [jobs, setJobs] = useState([]);
  const [stages, setStages] = useState(Object.keys(STAGE_LABELS).map((k) => ({ key: k, label: STAGE_LABELS[k] })));
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [list, meta] = await Promise.all([heritApi.tailoring.list(), heritApi.tailoring.meta().catch(() => null)]);
      setJobs(Array.isArray(list) ? list : []);
      if (meta?.stages) setStages(meta.stages);
      setState('ready');
    } catch (e) {
      setError(e); setState('error');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const setFilter = (k, v) => {
    const p = new URLSearchParams(params);
    if (v === null || v === '' || v === undefined) p.delete(k); else p.set(k, v);
    setParams(p, { replace: true });
  };

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (stage === 'open' && !OPEN(j)) return false;
      if (stage !== 'open' && stage !== 'all' && j.job_stage !== stage) return false;
      const d = daysFromToday(j.due_date);
      if (due === 'overdue' && !(OPEN(j) && d !== null && d < 0)) return false;
      if (due === 'week' && !(OPEN(j) && d !== null && d >= 0 && d <= 7)) return false;
      if (next) { const n = daysFromToday(j.next_action_date); if (!(OPEN(j) && n !== null && n <= 0)) return false; }
      if (review && !j.stage_review) return false;
      if (needle && !`${j.code} ${j.customer_name} ${j.client_ref || ''} ${j.description || ''} ${j.garment_type}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [jobs, stage, due, next, review, q]);

  const counts = useMemo(() => {
    const c = { open: 0, all: jobs.length };
    jobs.forEach((j) => { c[j.job_stage] = (c[j.job_stage] || 0) + 1; if (OPEN(j)) c.open += 1; });
    return c;
  }, [jobs]);

  return (
    <div className="hd">
      <PageTitle title="Jobs" />
      <PageHeader
        title="Jobs"
        subtitle={state === 'ready' ? `${counts.open} open job${counts.open === 1 ? '' : 's'}` : 'Work in progress'}
        actions={<>
          <Link to="/jobs/groups" className="btn btn-outline-secondary"><IconifyIcon icon="solar:users-group-rounded-bold" className="me-1" aria-hidden="true" />Groups</Link>
          <Button variant="primary" onClick={() => setShowNew(true)}><IconifyIcon icon="solar:add-circle-bold" className="me-1" aria-hidden="true" />Add job</Button>
        </>}
      />

      <Row className="g-2 mb-3 align-items-end">
        <Col xs={12} md={4}>
          <Form.Group controlId="jobs-q">
            <Form.Label>Search</Form.Label>
            <Form.Control type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
            <Form.Text>Client, job code or description.</Form.Text>
          </Form.Group>
        </Col>
        <Col xs={6} md={3}>
          <Form.Group controlId="jobs-stage">
            <Form.Label>Stage</Form.Label>
            <Form.Select value={stage} onChange={(e) => setFilter('stage', e.target.value === 'open' ? null : e.target.value)}>
              <option value="open">All open ({counts.open ?? 0})</option>
              {stages.map((s) => <option key={s.key} value={s.key}>{s.label} ({counts[s.key] || 0})</option>)}
              <option value="all">Everything ({counts.all})</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col xs={6} md={3}>
          <Form.Group controlId="jobs-due">
            <Form.Label>Promised date</Form.Label>
            <Form.Select value={due} onChange={(e) => setFilter('due', e.target.value === 'any' ? null : e.target.value)}>
              <option value="any">Any date</option>
              <option value="overdue">Overdue</option>
              <option value="week">Next 7 days</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col xs={12} md={2}>
          <Form.Check type="checkbox" id="jobs-next" label="Next action due" checked={next} onChange={(e) => setFilter('next', e.target.checked ? 'due' : null)} />
          {review && <Form.Check type="checkbox" id="jobs-review" label="To confirm" checked onChange={() => setFilter('review', null)} />}
        </Col>
      </Row>

      {state === 'loading' && <div className="text-center py-5"><Spinner role="status" /></div>}
      {state === 'error' && <LoadError what="jobs" error={error} onRetry={() => { setState('loading'); load(); }} />}
      {state === 'ready' && (
        <Card className="hd-card">
          {shown.length === 0 ? (
            <Card.Body className="text-muted">
              {jobs.length === 0 ? 'No jobs yet. Add a job, or convert an enquiry.' : 'No job matches these filters.'}
            </Card.Body>
          ) : shown.map((j) => {
            const d = daysFromToday(j.due_date);
            const late = OPEN(j) && d !== null && d < 0;
            const nd = daysFromToday(j.next_action_date);
            return (
              <Link key={j.id} to={`/jobs/${j.id}`} className="hd-row flex-wrap">
                <span className="hd-row-main">
                  <span className="hd-row-title d-block text-truncate">{j.customer_name} · {GARMENT_LABELS[j.garment_type] || j.garment_type}{j.quantity > 1 ? ` × ${j.quantity}` : ''}</span>
                  <span className="hd-row-sub d-block">
                    {j.code}
                    {j.due_date && <> · Promised <span className={late ? 'fw-semibold' : ''}>{fmtDate(j.due_date, { withYear: false })}</span></>}
                    {j.event_date && <> · Event {fmtDate(j.event_date, { withYear: false })}</>}
                  </span>
                  {j.next_action && <span className="hd-row-sub d-block">Next: {j.next_action}{j.next_action_date ? ` (${fmtDate(j.next_action_date, { withYear: false })})` : ''}</span>}
                </span>
                <span className="d-flex gap-2 flex-wrap align-items-center">
                  {late && <StatusChip tone="bad">{-d} day{d === -1 ? '' : 's'} late</StatusChip>}
                  {nd !== null && nd <= 0 && OPEN(j) && <StatusChip tone="warn" icon="solar:bell-bold">Action due</StatusChip>}
                  {j.stage_review ? <StatusChip tone="warn" icon="solar:question-circle-bold">Confirm</StatusChip> : null}
                  <StageChip stage={j.job_stage} label={j.stage_label} />
                  {isOwner && <PaymentChip state={j.payment_state} />}
                </span>
              </Link>
            );
          })}
        </Card>
      )}

      <NewOrderModal show={showNew} onHide={() => setShowNew(false)} onCreated={(r) => (r?.id ? navigate(`/jobs/${r.id}`) : load())} />
    </div>
  );
};

export default JobsPage;
