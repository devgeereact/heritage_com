import { useCallback, useEffect, useState } from 'react';
import { Button, Col, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';
import { fmtDate, fmtUtc, naira, GARMENT_LABELS, METHOD_LABELS, ENQUIRY_LABELS, daysFromToday } from '@/helpers/format';
import LoadError from '@/components/herit/LoadError';
import StatusChip, { StageChip } from '@/components/herit/StatusChip';
import NewEnquiryModal from '@/app/(admin)/enquiries/components/NewEnquiryModal';
import NewOrderModal from '@/app/(admin)/tailoring/components/NewOrderModal';
import TodayBlock from './components/TodayBlock';

const garment = (j) => `${GARMENT_LABELS[j.garment_type] || j.garment_type || 'Job'}${j.quantity > 1 ? ` × ${j.quantity}` : ''}`;
const jobRow = (j, extra = {}) => ({
  key: `j${j.id}`,
  to: `/jobs/${j.id}`,
  title: `${j.client_name} · ${garment(j)}`,
  sub: j.code,
  ...extra,
});
const ago = (ymd) => {
  const d = daysFromToday(ymd);
  if (d === null) return '';
  if (d === 0) return 'today';
  if (d < 0) return `${-d} day${d === -1 ? '' : 's'} late`;
  return `in ${d} day${d === 1 ? '' : 's'}`;
};

const TodayPage = () => {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [showJob, setShowJob] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setState((s) => (s === 'ready' ? s : 'loading'));
    try {
      setData(await heritApi.today());
      setState('ready');
    } catch (e) {
      setError(e);
      setState('error');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const b = (k) => data?.[k] || { count: 0, items: [] };

  const blocks = data ? [
    {
      id: 'overdue', title: 'Overdue', icon: 'solar:danger-triangle-bold', tone: 'bad', seeAll: '/jobs?due=overdue',
      empty: 'Nothing is late. Check jobs due soon below.',
      ...b('overdue'),
      rows: b('overdue').items.map((j) => jobRow(j, { right: <StatusChip tone="bad">{ago(j.due_date)}</StatusChip> })),
    },
    {
      id: 'appointments', title: 'Fittings today', icon: 'solar:calendar-bold', seeAll: '/jobs',
      empty: 'No fittings today. Set a fitting date on a job to see it here.',
      ...b('appointments_today'),
      rows: b('appointments_today').items.map((j) => jobRow(j, { right: <StageChip stage={j.job_stage} label={j.stage_label} /> })),
    },
    {
      id: 'next', title: 'Next actions due', icon: 'solar:checklist-minimalistic-bold', seeAll: '/jobs?next=due',
      empty: 'No follow-ups due. Add a next action on a job when you promise something.',
      ...b('next_actions'),
      rows: b('next_actions').items.map((j) => jobRow(j, { sub: `${j.next_action || 'Next action'} · ${fmtDate(j.next_action_date)}` })),
    },
    {
      id: 'ready', title: 'Ready to hand over', icon: 'solar:bag-check-bold', seeAll: '/jobs?stage=ready',
      empty: 'Nothing waiting for collection.',
      ...b('ready'),
      rows: b('ready').items.map((j) => jobRow(j, {
        right: j.handed_over_qty > 0 ? <span className="small text-muted">{j.handed_over_qty} of {j.quantity} out</span> : null,
      })),
    },
    {
      id: 'due', title: 'Due in the next 7 days', icon: 'solar:clock-circle-bold', seeAll: '/jobs?due=week',
      empty: 'No promised dates this week.',
      ...b('due_soon'),
      rows: b('due_soon').items.map((j) => jobRow(j, { right: <span className="small">{fmtDate(j.due_date, { withYear: false })}</span> })),
    },
    {
      id: 'enquiries', title: 'Enquiries to answer', icon: 'solar:inbox-line-bold', seeAll: '/enquiries',
      empty: 'No new enquiries. Add one when someone calls or messages.',
      ...b('enquiries'),
      rows: b('enquiries').items.map((e) => ({
        key: `e${e.id}`, to: `/enquiries/${e.id}`, title: e.name,
        sub: e.status === 'new' ? `New · ${fmtUtc(e.created_at, { time: false })}` : `${ENQUIRY_LABELS[e.status] || e.status} · follow up ${fmtDate(e.next_follow_up)}`,
      })),
    },
    {
      id: 'stage_review', title: 'Old jobs to confirm', icon: 'solar:question-circle-bold', seeAll: '/jobs?review=1',
      empty: 'No old jobs need checking.',
      ...b('stage_review'),
      rows: b('stage_review').items.map((j) => jobRow(j, { sub: `${j.code} · was marked done. Ready or collected?` })),
    },
    {
      id: 'measurements', title: 'Measurements to approve', icon: 'solar:ruler-bold',
      empty: 'No measurements waiting.',
      ...b('measurements_pending'),
      rows: b('measurements_pending').items.map((s) => ({
        key: `m${s.id}`, to: `/clients/${s.customer_id}?tab=measurements`, title: s.client_name,
        sub: `${s.template_key} · ${s.source === 'customer' ? 'sent by the client' : 'entered in the workshop'}`,
      })),
    },
    {
      id: 'unverified', title: 'Payments to verify', icon: 'solar:shield-check-bold', seeAll: '/payments?tab=verify',
      empty: 'All recorded payments are verified.',
      total: data.unverified_payments?.count ? naira(data.unverified_payments.total_unverified) : null,
      ...b('unverified_payments'),
      rows: b('unverified_payments').items.map((p) => ({
        key: `p${p.id}`, to: `/jobs/${p.job_id}?tab=payments`, title: `${p.client_name} · ${naira(p.amount)}`,
        sub: `${METHOD_LABELS[p.method] || p.method}${p.external_ref ? ` · ${p.external_ref}` : ''} · ${fmtDate(p.received_on)}`,
      })),
    },
    {
      id: 'balances', title: 'Balances to collect', icon: 'solar:wallet-money-bold', seeAll: '/payments',
      empty: 'No balances outstanding.',
      total: data.balances?.count ? naira(data.balances.total_balance) : null,
      ...b('balances'),
      rows: b('balances').items.map((j) => jobRow(j, { right: <span className="money">{naira(j.balance)}</span> })),
    },
    {
      id: 'credits', title: 'Credit or refund due', icon: 'solar:hand-money-bold', seeAll: '/payments?tab=credits',
      empty: 'No client has paid more than the price.',
      total: data.credits?.count ? naira(data.credits.total_credit) : null,
      ...b('credits'),
      rows: b('credits').items.map((j) => jobRow(j, { right: <span className="money">{naira(j.credit)}</span> })),
    },
  ] : [];

  // Blocks with work come first; empty ones keep their place after.
  const ordered = [...blocks.filter((x) => x.count > 0), ...blocks.filter((x) => x.count === 0)];
  const nothing = data && blocks.every((x) => x.count === 0);

  return (
    <div className="hd">
      <PageTitle title="Today" />
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <h1 className="hd-title">Today</h1>
          <div className="text-muted">{data ? fmtDate(data.date) : ' '}{data ? ' · Lagos' : ''}</div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Button variant="outline-secondary" onClick={() => setShowEnquiry(true)}>
            <IconifyIcon icon="solar:inbox-in-bold" className="me-1" aria-hidden="true" /> Add enquiry
          </Button>
          <Button variant="primary" onClick={() => setShowJob(true)}>
            <IconifyIcon icon="solar:add-circle-bold" className="me-1" aria-hidden="true" /> Add job
          </Button>
        </div>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner role="status" /><div className="visually-hidden">Loading</div></div>}
      {state === 'error' && <LoadError what="today's list" error={error} onRetry={load} />}

      {state === 'ready' && nothing && (
        <div className="hd-card border rounded p-4 mb-3">
          <h2 className="h5">You are all caught up.</h2>
          <p className="mb-0 text-muted">When a client gets in touch, add the enquiry so it shows here.</p>
        </div>
      )}

      {state === 'ready' && (
        <Row className="g-3">
          {ordered.map((blk) => (
            <Col key={blk.id} xs={12} lg={6}>
              <TodayBlock {...blk} />
            </Col>
          ))}
        </Row>
      )}

      <NewEnquiryModal
        show={showEnquiry}
        onHide={() => setShowEnquiry(false)}
        onCreated={(id) => navigate(`/enquiries/${id}`)}
      />
      <NewOrderModal show={showJob} onHide={() => setShowJob(false)} onCreated={(r) => (r?.id ? navigate(`/jobs/${r.id}`) : load())} />
    </div>
  );
};

export default TodayPage;
