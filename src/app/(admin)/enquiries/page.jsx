import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Form, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';
import { ENQUIRY_LABELS, fmtDate, fmtUtc, daysFromToday } from '@/helpers/format';
import LoadError from '@/components/herit/LoadError';
import PageHeader from '@/components/herit/PageHeader';
import StatusChip from '@/components/herit/StatusChip';
import NewEnquiryModal from './components/NewEnquiryModal';

const TABS = ['new', 'awaiting_reply', 'quote_sent', 'accepted', 'closed'];
const TYPE = { fitting: 'Fitting', bespoke: 'Bespoke', wholesale: 'Wholesale', general: 'General' };

const EnquiriesPage = () => {
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('status')) ? params.get('status') : 'new';
  const [q, setQ] = useState('');
  const [data, setData] = useState({ items: [], counts: {} });
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setState('loading');
    try {
      const r = await heritApi.enquiries.list({ status: tab, q: q.trim() });
      setData({ items: r.items || [], counts: r.counts || {} });
      setState('ready');
    } catch (e) {
      setError(e); setState('error');
    }
  }, [tab, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  return (
    <div className="hd">
      <PageTitle title="Enquiries" />
      <PageHeader
        title="Enquiries"
        subtitle="Reply, quote, then turn the enquiry into a client and a job."
        actions={<Button variant="primary" onClick={() => setShowNew(true)}><IconifyIcon icon="solar:add-circle-bold" className="me-1" aria-hidden="true" />Add enquiry</Button>}
      />

      <nav className="hd-tabs mb-3" aria-label="Enquiry status">
        {TABS.map((t) => (
          <Button key={t} variant="outline-secondary" className={t === tab ? 'active' : ''} aria-current={t === tab ? 'page' : undefined}
            onClick={() => setParams({ status: t })}>
            {ENQUIRY_LABELS[t]} <span className="tnum ms-1">({data.counts[t] ?? 0})</span>
          </Button>
        ))}
      </nav>

      <Form.Group controlId="enq-search" className="mb-3" style={{ maxWidth: 420 }}>
        <Form.Label className="visually-hidden">Search enquiries</Form.Label>
        <Form.Control type="search" placeholder="Search name, phone, email or company" value={q} onChange={(e) => setQ(e.target.value)} />
      </Form.Group>

      {state === 'loading' && <div className="text-center py-5"><Spinner role="status" /></div>}
      {state === 'error' && <LoadError what="enquiries" error={error} onRetry={load} />}
      {state === 'ready' && (
        <Card className="hd-card">
          {data.items.length === 0 ? (
            <Card.Body className="text-muted">
              {q ? 'No enquiry matches that search.' : tab === 'new' ? 'No new enquiries. Add one when someone calls or messages.' : `Nothing in ${ENQUIRY_LABELS[tab].toLowerCase()}.`}
            </Card.Body>
          ) : (
            <div>
              {data.items.map((e) => {
                const fu = daysFromToday(e.next_follow_up);
                return (
                  <Link key={e.id} to={`/enquiries/${e.id}`} className="hd-row">
                    <span className="hd-row-main">
                      <span className="hd-row-title d-block text-truncate">{e.name}{e.company ? ` · ${e.company}` : ''}</span>
                      <span className="hd-row-sub d-block text-truncate">
                        {TYPE[e.type] || e.type}{e.interest ? ` · ${e.interest}` : ''} · received {fmtUtc(e.created_at, { time: false })}
                      </span>
                    </span>
                    {e.next_follow_up && (
                      <StatusChip tone={fu < 0 ? 'bad' : fu === 0 ? 'warn' : 'neutral'} icon="solar:calendar-bold">
                        Follow up {fmtDate(e.next_follow_up, { withYear: false })}
                      </StatusChip>
                    )}
                    {e.job_id && <StatusChip tone="ok">Converted</StatusChip>}
                    <IconifyIcon icon="solar:alt-arrow-right-linear" aria-hidden="true" className="text-muted" />
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <NewEnquiryModal show={showNew} onHide={() => setShowNew(false)} onCreated={(id) => navigate(`/enquiries/${id}`)} />
    </div>
  );
};

export default EnquiriesPage;
