import { useCallback, useEffect, useState } from 'react';
import { Alert, Card, Nav, Spinner } from 'react-bootstrap';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';
import { useAuthContext } from '@/context/useAuthContext';
import { fmtDate, fmtUtc, GARMENT_LABELS, STAGE_LABELS, waLink } from '@/helpers/format';
import LoadError from '@/components/herit/LoadError';
import PageHeader from '@/components/herit/PageHeader';
import { PaymentChip, StageChip } from '@/components/herit/StatusChip';
import StagePanel from '../components/StagePanel';
import DatesPanel from '../components/DatesPanel';
import MeasurementsPanel from '../components/MeasurementsPanel';
import QuotePanel from '../components/QuotePanel';
import MoneyPanel from '../components/MoneyPanel';
import HandoverPanel from '../components/HandoverPanel';

const OWNER = ['super_admin', 'admin', 'manager'];

/**
 * One job: stage, dates, measurements, quote, payments, handover, timeline.
 * Money tabs exist only for owner roles; the server strips money for tailors.
 */
const JobDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuthContext();
  const isOwner = OWNER.includes(user?.role);
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const tabs = ['overview', 'measurements', ...(isOwner ? ['quote', 'payments'] : []), 'handover', 'timeline'];
  const tab = tabs.includes(params.get('tab')) ? params.get('tab') : 'overview';
  const [job, setJob] = useState(null);
  const [meta, setMeta] = useState(null);
  const [tailors, setTailors] = useState([]);
  const [state, setState] = useState('loading');
  // Keep the active tab visible when the tab strip scrolls sideways on phones.
  useEffect(() => {
    document.querySelector('.hd .nav-tabs .nav-link.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [tab, state]);
  const [error, setError] = useState(null);
  const notice = location.state?.notice;

  const load = useCallback(async () => {
    try {
      const [j, t] = await Promise.all([heritApi.tailoring.get(id), heritApi.tailoring.tailors().catch(() => [])]);
      setJob(j); setTailors(Array.isArray(t) ? t : []);
      setState('ready');
    } catch (e) {
      setError(e); setState(e.status === 404 ? 'missing' : 'error');
    }
  }, [id]);
  useEffect(() => { heritApi.tailoring.meta().then(setMeta).catch(() => setMeta(null)); }, []);
  useEffect(() => { load(); }, [load]);

  if (state === 'loading') return <div className="hd text-center py-5"><Spinner role="status" /></div>;
  if (state === 'missing') return <div className="hd"><p>This job does not exist. <Link to="/jobs">Back to jobs</Link></p></div>;
  if (state === 'error') return <div className="hd"><LoadError what="this job" error={error} onRetry={() => { setState('loading'); load(); }} /></div>;

  const stages = meta?.stages || Object.keys(STAGE_LABELS).map((k) => ({ key: k, label: STAGE_LABELS[k] }));
  const TAB_LABEL = { overview: 'Overview', measurements: 'Measurements', quote: 'Quote', payments: 'Payments', handover: 'Handover', timeline: 'Timeline' };
  const wa = waLink(job.customer_phone);

  return (
    <div className="hd">
      <PageTitle title={`Job ${job.code}`} />
      <PageHeader
        back={{ to: '/jobs', label: 'Jobs' }}
        title={`${GARMENT_LABELS[job.garment_type] || job.garment_type}${job.quantity > 1 ? ` × ${job.quantity}` : ''} · ${job.code}`}
        subtitle={
          <span className="d-inline-flex flex-wrap gap-2 align-items-center">
            <Link to={`/clients/${job.customer_id}`}>{job.customer_name}</Link>
            {job.client_ref && <span className="small">{job.client_ref}</span>}
            <StageChip stage={job.job_stage} label={job.stage_label} />
            {isOwner && <PaymentChip state={job.payment_state} />}
          </span>
        }
        actions={wa ? <a className="btn btn-outline-secondary" href={wa} target="_blank" rel="noopener noreferrer"><IconifyIcon icon="mdi:whatsapp" className="me-1" aria-hidden="true" />WhatsApp</a> : null}
      />
      {notice && <Alert variant="success" role="status">{notice}</Alert>}
      <p className="small text-muted mb-2">
        {job.due_date ? `Promised ${fmtDate(job.due_date)}` : 'No promised date'}
        {job.event_date ? ` · Event ${fmtDate(job.event_date)}` : ''}
        {job.next_action ? ` · Next: ${job.next_action}${job.next_action_date ? ` (${fmtDate(job.next_action_date)})` : ''}` : ''}
      </p>

      <Nav variant="tabs" className="mb-3" activeKey={tab} onSelect={(k) => setParams({ tab: k })} role="tablist">
        {tabs.map((t) => <Nav.Item key={t}><Nav.Link eventKey={t} role="tab" aria-selected={t === tab}>{TAB_LABEL[t]}</Nav.Link></Nav.Item>)}
      </Nav>

      {tab === 'overview' && (
        <>
          <StagePanel job={job} stages={stages} isOwner={isOwner} onChanged={load} />
          <DatesPanel job={job} tailors={tailors} onSaved={load} onReload={load} />
        </>
      )}
      {tab === 'measurements' && <MeasurementsPanel job={job} onChanged={load} />}
      {tab === 'quote' && isOwner && <QuotePanel job={job} onChanged={load} />}
      {tab === 'payments' && isOwner && <MoneyPanel job={job} verifiedMethods={meta?.verified_methods || ['cash']} onChanged={load} />}
      {tab === 'handover' && <HandoverPanel job={job} isOwner={isOwner} onChanged={load} />}
      {tab === 'timeline' && (
        <Card className="hd-card">
          {(job.events || []).length === 0 ? <Card.Body className="text-muted">Nothing recorded yet.</Card.Body> : job.events.map((ev) => (
            <div key={ev.id} className="hd-row">
              <span className="hd-row-main">
                <span className="hd-row-title d-block" style={{ whiteSpace: 'normal' }}>{ev.note || STAGE_LABELS[ev.stage] || ev.kind}</span>
                <span className="hd-row-sub d-block">{fmtUtc(ev.created_at)}{ev.user_name ? ` · ${ev.user_name}` : ''}</span>
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

export default JobDetailPage;
